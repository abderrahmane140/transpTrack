<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DriverController extends Controller
{
    /**
    * GET /api/drivers
    */
    
    public function index(Request $request)
    {
        $query = Driver::with(['user', 'vehicle', 'activeTrip.route'])
            ->when($request->filled('available'), fn($q) => $q->where('is_available', $request->boolean('available')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->whereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"))
                  ->orWhere('license_number', 'like', "%{$search}%");
            });
        $drivers = $query->orderByDesc('created_at')->paginate($request->get('per_page',15));

        return response()->json($drivers);
    }

    /**
     * POST /api/drivers
     * Creates a User (role=driver) + Driver profile in one request
     */

    public function store(Request $request)
    {
        $validated = $request->validate([
            // User fields
            'name'            => 'required|string|max:100',
            'email'           => 'required|email|unique:users,email',
            'password'        => 'required|string|min:8|confirmed',
            'phone'           => 'nullable|string|max:20',
            // Driver fields
            'license_number'  => 'required|string|max:50|unique:drivers,license_number',
            'license_expiry'  => 'required|date|after:today',
            'license_type'    => 'required|in:A,B,C,D,EB',
            'vehicle_id'      => 'nullable|exists:vehicles,id',
            'notes'           => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try{
            $user = User::create([
                'name'      => $validated['name'],
                'email'     => $validated['email'],
                'password'  => Hash::make($validated['password']),
                'role'      => 'driver',
                'phone'     => $validated['phone'] ?? null,
                'is_active' => true,
            ]);

            $driver = Driver::create([
                'user_id'        => $user->id,
                'vehicle_id'     => $validated['vehicle_id'] ?? null,
                'license_number' => $validated['license_number'],
                'license_expiry' => $validated['license_expiry'],
                'license_type'   => $validated['license_type'],
                'notes'          => $validated['notes'] ?? null,
            ]);

            DB::commit();
        }catch(\Throwable $e){
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => 'Driver created successfully.',
            'driver'  => $driver->load('user', 'vehicle'),
        ], 201);
    }


    /**
     * GET /api/drivers/{id}
     */

    public function show(Driver $driver)
    {
       $driver->load(['user', 'vehicle', 'activeTrip.route.stops', 'trips' => fn($q) => $q->latest()->limit(5)]);

       return response()->json(['driver' => $driver]);
    }


    /**
     * PUT /api/drivers/{id}
     */

    public function update(Request $request, Driver $driver)
    {
        $validated = $request->validate([
            // User fields
            'name'           => 'sometimes|string|max:100',
            'phone'          => 'nullable|string|max:20',
            'is_active'      => 'sometimes|boolean',
            // Driver fields
            'license_number' => 'sometimes|string|max:50|unique:drivers,license_number,' . $driver->id,
            'license_expiry' => 'sometimes|date',
            'license_type'   => 'sometimes|in:A,B,C,D,EB',
            'is_available'   => 'sometimes|boolean',
            'vehicle_id'     => 'nullable|exists:vehicles,id',
            'notes'          => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try{
            //update user fields
            $userFields = array_intersect_key($validated, array_flip(['name', 'phone', 'is_active']));

            if(!empty($userFields)){
                $driver->user->update($userFields);
            }

            //update driver fields
            $driverFields = array_diff_key($validated, array_flip(['name', 'phone', 'is_active']));


        if (!empty($driverFields)) {
            $driver->update($driverFields);
        }
 
        DB::commit();
        }catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => 'Driver updated successfully.',
            'driver'  => $driver->fresh(['user', 'vehicle']),
        ]);
    }

    /**
     * DELETE /api/drivers/{id}
     */

    public function destroy(Driver $driver)
    {
        if($driver->activeTrip) {
            return response()->json([
                'message' => 'Cannot delete a driver with an active trip.',
            ],422);
        }

        DB::transaction(function () use ($driver) {
            $driver->delete();
            $driver->user->delete();
        });

        return response()->json(['message' => 'Driver deleted successfully.']);
    }

    /**
     * POST /api/drivers/{id}/assign-vehicle
     */

    public function assignVehicle(Request $request, Driver $driver) 
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
        ]);

        $vehicle = Vehicle::findOrFail($validated['vehicle_id']);

        // Check if vehicle is already assigned to another driver
        $existingDriver = Driver::where('vehicle_id', $vehicle->id)
        ->where('id', '!=', $driver->id)
        ->first();

        if ($existingDriver) {
            return response()->json([
                'message' => "Vehicle is already assigned to driver: {$existingDriver->user->name}",
            ], 422);
        }

        $driver->update(['vehicle_id' => $vehicle->id]);

        return response()->json([
            'message' => "Vehicle '{$vehicle->name}' assigned to driver '{$driver->user->name}'.",
            'driver'  => $driver->fresh(['user', 'vehicle']),
        ]);


        
    }

    /**
     * DELETE /api/drivers/{id}/unassign-vehicle
     */
    public function unassignVehicle(Driver $driver)
    {
        if ($driver->activeTrip) {
            return response()->json([
                'message' => 'Cannot unassign vehicle while driver has an active trip.',
            ], 422);
        }

        $driver->update(['vehicle_id' => null]);

        return response()->json([
            'message' => 'Vehicle unassigned successfully.',
            'driver'  => $driver->fresh(['user']),
        ]);
    }


    /**
     * GET /api/my/vehicle  (driver sees their own vehicle)
     */

    public function myVehicle(Request $request)
    {
        $driver = $request->user()->driver;

        if(!$driver || !$driver->vehicle) {
            return response()->json(['message' => 'No vehicle assigned.'], 404);
        }

        return response()->json(['vehicle' => $driver->vehicle]);
    }

     /**
     * GET /api/my/trip  (driver sees their active trip)
     */


     public function myActiveTrip(Request $request) 
     {
        $driver = $request->user()->driver;

        if(!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        $trip = $driver->activeTrip()->with(['route.stops', 'vehicle', 'latestLocation'])->first();


        if(!$trip) {
            return response()->json(['message' => 'No active trip.', 'trip' => null]);
        }

        return response()->json(['trip' => $trip]);
     }


    /* GET /api/my/scheduled-trip
    * Driver gets their own next scheduled trip (not yet started)
    */
    public function myScheduledTrip(Request $request)
    {
        $driver = $request->user()->driver;

        if (!$driver) {
            return response()->json(['message' => 'Driver profile not found.'], 404);
        }

        $trip = \App\Models\Trip::where('driver_id', $driver->id)
            ->where('status', 'scheduled')
            ->with(['route.stops', 'vehicle'])
            ->orderBy('scheduled_start')
            ->first();

        if (!$trip) {
            return response()->json(['message' => 'No scheduled trip.', 'trip' => null]);
        }

        return response()->json(['trip' => $trip]);
    }
}
