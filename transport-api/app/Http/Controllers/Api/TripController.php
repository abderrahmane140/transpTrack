<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Trip;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use App\Events\TripStatusChanged;

class TripController extends Controller
{
    /**
     * GET /api/trips
     * Admin: all trips with filters
     */
    public function index(Request $request)
    {
        $query = Trip::with(['route', 'vehicle', 'driver.user', 'latestLocation'])
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->status))
            ->when($request->filled('route_id'), fn($q) => $q->where('route_id', $request->route_id))
            ->when($request->filled('driver_id'), fn($q) => $q->where('driver_id', $request->driver_id))
            ->when($request->filled('vehicle_id'), fn($q) => $q->where('vehicle_id', $request->vehicle_id))
            ->when($request->filled('date'), function ($q) use ($request) {
                $q->whereDate('created_at', $request->date);
            })
            ->when($request->boolean('simulated_only'), fn($q) => $q->where('is_simulated', true))
            ->orderByDesc('created_at');
 
        $trips = $query->paginate($request->get('per_page', 15));
 
        return response()->json($trips);
    }


    /**
     * GET /api/trips/active
     * Admin + Driver: all currently active trips
     */
    public function active(Request $request)
    {
        $trips = Trip::active()
        ->with(['route.stops', 'vehicle', 'driver.user', 'latestLocation'])
        ->get();

        return response()->json(['trips' => $trips]);
    }

    /**
     * POST /api/trips
     * Admin: create a new scheduled trip
     */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'route_id'        => 'required|exists:routes,id',
            'vehicle_id'      => 'required|exists:vehicles,id',
            'driver_id'       => 'required|exists:drivers,id',
            'scheduled_start' => 'nullable|date|after:now',
            'notes'           => 'nullable|string|max:500',
        ]);

        // Check vehicle is not already on an active trip
        $vehicleActive = Trip::active()
            ->where('vehicle_id', $validated['vehicle_id'])
            ->exists();


        if ($vehicleActive) {
            return response()->json([
                'message' => 'This vehicle already has an active trip.'
            ], 422);
        }

        // Check driver is not already on an active trip
        $driverActive = Trip::active()
            ->where('driver_id', $validated['driver_id'])
            ->exists();

        if ($driverActive) {
            return response()->json([
                'message' => 'This driver already has an active trip.',
            ], 422);
        }

        // Check vehicle is active/available
        $vehicle = Vehicle::findOrFail($validated['vehicle_id']);
        if($vehicle->status !== 'active') {
            return response()->json([
                'message' => "Vehicle status is '{$vehicle->status}'. Only active vehicles can be assigned to trips.",
            ], 422);
        }

        // Check driver is available and their license is not expired
        $driver = Driver::findOrFail($validated['driver_id']);
        if (!$driver->is_available) {
            return response()->json([
                'message' => 'This driver is currently not available.',
            ], 422);
        }

        $trip = Trip::create([
            'route_id'        => $validated['route_id'],
            'vehicle_id'      => $validated['vehicle_id'],
            'driver_id'       => $validated['driver_id'],
            'scheduled_start' => $validated['scheduled_start'] ?? null,
            'status'          => 'scheduled',
            'notes'           => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Trip created successfully.',
            'trip'    => $trip->load(['route.stops', 'vehicle', 'driver.user']),
        ], 201);
    }

    /**
     * GET /api/trips/{id}
     * Admin + Driver: full trip details
     */
    public function show(Trip $trip)
    {
        $trip->load([
            'route.stops',
            'vehicle',
            'driver.user',
            'latestLocation',
            'employees.user',
        ]);

        $trip->loadCount('employees');

        return response()->json(['trip' => $trip]);
    }


    /**
     * POST /api/trips/{id}/start
     * Driver: start the trip — only the assigned driver can do this
     */
    public function start(Request $request , Trip $trip)
    {
        $user = $request->user();

        // Only assigned driver (or admin)
        if ($user->isDriver()) {
            $driver = $user->driver;
            if (!$driver || $driver->id !== $trip->driver_id) {
                return response()->json([
                    'message' => 'You are not the assigned driver for this trip.',
                ], 403);
            }
        }

        // State check
        if ($trip->status !== 'scheduled') {
            return response()->json([
                'message' => "Trip cannot be started. Current status is '{$trip->status}'.",
            ], 422);
        }

        // Save previous status BEFORE update
        $previousStatus = $trip->status;

        $trip->update([
            'status'     => 'active',
            'started_at' => now(),
        ]);

        $trip->driver->update(['is_available' => false]);

        // Dispatch event
        event(new TripStatusChanged($trip, $previousStatus));

        $trip->load(['route.stops', 'vehicle', 'driver.user', 'latestLocation']);

        return response()->json([
            'message' => 'Trip started successfully.',
            'trip'    => $trip,
        ]);
    }


    /**
     * POST /api/trips/{id}/stop
     * Driver: end the trip
     */
    public function stop(Request $request, Trip $trip)
    {
        $user = $request->user();

        // Only assigned driver (or admin)
        if ($user->isDriver()) {
            $driver = $user->driver;

            if (!$driver || $driver->id !== $trip->driver_id) {
                return response()->json([
                    'message' => 'You are not the assigned driver for this trip.',
                ], 403);
            }
        }

        // State check
        if ($trip->status !== 'active') {
            return response()->json([
                'message' => "Trip cannot be stopped. Current status is '{$trip->status}'.",
            ], 422);
        }

        //Save previous status BEFORE update
        $previousStatus = $trip->status;

        $trip->update([
            'status'   => 'completed',
            'ended_at' => now(),
        ]);

        // Mark driver available again
        $trip->driver->update(['is_available' => true]);

        // Dispatch event
        event(new TripStatusChanged($trip, $previousStatus));

        dispatch(new \App\Jobs\CompressTripLocations($trip))
            ->delay(now()->addMinute());

        return response()->json([
            'message'          => 'Trip completed successfully.',
            'trip'             => $trip->fresh(['route', 'vehicle', 'driver.user']),
            'duration_minutes' => $trip->getDurationMinutes(),
        ]);
    }


    /**
     * DELETE /api/trips/{id}
     * Admin: cancel a scheduled trip (cannot cancel active trips)
     */
    public function destroy(Trip $trip)
    {
        if ($trip->status === 'active') {
            return response()->json([
                'message' => 'Cannot delete an active trip. Stop it first.',
            ], 422);
        }


        if ($trip->status === 'completed'){
            return response()->json([
                'message' => 'Cannot delete a completed trip (historical record).',
            ], 422);
        }

        $trip->update(['status' => 'cancelled']);
        $trip->delete();

        return response()->json(['message' => 'Trip cancelled and deleted successfully.']);
    }


    /**
     * GET /api/trips/{id}/employees
     * Admin: list employees assigned to this trip's route
     */
    public function employees(Trip $trip)
    {
        $employees = $trip->route->employees()->with('user')->get();

        return response()->json([
            'trip'      => $trip->only('id', 'status', 'started_at'),
            'employees' => $employees,
            'count'     => $employees->count(),
        ]);
    }

}
