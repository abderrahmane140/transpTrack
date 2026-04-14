<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    /**
     * GET /api/vehicles
     */

    public function index(Request $request)
    {
        $query = Vehicle::withTrashed($request->boolean('with_deleted'))
            ->with(['driver.user', 'activeTrip.route']);

        

        //filter
        if($request->filled('status')){
            $query->where('status', $request->status);
        }

        if($request->filled('type')){
            $query->where('type', $request->type);
        }

        if($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search){
                $q->where('name', 'like', "%{$search}%")
                ->orWhere('plate_number', 'like', "%{$search}%")
                ->orWhere('model', 'like', "%{$search}%");
            });
        }

        $vehicles = $query->orderBy('name')->paginate($request->get('per_page',15));

        return response()->json($vehicles);

    }

    /**
     * POST /api/vehicles
     */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:100',
            'plate_number' => 'required|string|max:20|unique:vehicles,plate_number',
            'type'         => 'required|in:bus,van,car,minibus',
            'capacity'     => 'required|integer|min:1|max:200',
            'model'        => 'nullable|string|max:100',
            'year'         => 'nullable|integer|min:2000|max:' . (date('Y') + 1),
            'color'        => 'nullable|string|max:50',
            'status'       => 'nullable|in:active,inactive,maintenance',
            'notes'        => 'nullable|string|max:500',
        ]);

        $vehicle = Vehicle::create($validated);

        return response()->json([
            'message' => 'Vehicle created successfully.',
            'vehicle' => $vehicle,
        ],201);
    }

    /**
     * GET /api/vehicles/{id}
     */

    public function show(Vehicle $vehicle)
    {
        $vehicle->load([
            'driver.user',
            'activeTrip.route.stops',
            'activeTrip.driver.user',
            'latestLocation',  
        ]);

        return response()->json(['vehicle' => $vehicle]);
    }

    /**
     * PUT /api/vehicles/{id}
     */

    public function update(Request $request, Vehicle $vehicle)
    {
        $validated = $request->validate([
            'name'         => 'sometimes|string|max:100',
            'plate_number' => 'sometimes|string|max:20|unique:vehicles,plate_number,' . $vehicle->id,
            'type'         => 'sometimes|in:bus,van,car,minibus',
            'capacity'     => 'sometimes|integer|min:1|max:200',
            'model'        => 'nullable|string|max:100',
            'year'         => 'nullable|integer|min:2000|max:' . (date('Y') + 1),
            'color'        => 'nullable|string|max:50',
            'status'       => 'sometimes|in:active,inactive,maintenance',
            'notes'        => 'nullable|string|max:500',
        ]);

        $vehicle->update($validated);

        return response()->json([
            'message' => 'Vehicle updated successfully.',
            'vehicle' => $vehicle->fresh(),
        ]);
    }

    /**
     * DELETE /api/vehicles/{id}
     */

    public function destroy(Vehicle $vehicle)
    {
        if($vehicle->activeTrip){
            return response()->json([
                'message' => 'Cannot delete a vehicle with an active trip.',
            ], 422);
        }

        $vehicle->delete();

        return response()->json([
            'message' => 'Vehicle deleted successfully',
        ]);
    }
}
