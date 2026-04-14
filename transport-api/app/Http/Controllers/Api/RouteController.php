<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Route;
use Illuminate\Http\Request;

class RouteController extends Controller
{
    /**
     * GET /api/routes
     */

    public function index(Request $request)
    {
        $query = Route::withCount(['stops', 'employees'])
        ->with('stops')
        ->when($request->boolean('active_only'), fn($q) => $q->active())
        ->when($request->filled('search'), function ($q) use ($request) {
            $search = $request->search;
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
                ->orWhere('start_location', 'like', "%{$search}%")
                ->orWhere('end_location', 'like', "%{$search}%");
        });

        $routes = $query->orderBy('name')->paginate($request->get('per_page', 15));

        return response()->json($routes);
    }


    /**
     * POST /api/routes
     */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                       => 'required|string|max:100',
            'code'                       => 'nullable|string|max:20|unique:routes,code',
            'description'                => 'nullable|string|max:500',
            'start_location'             => 'required|string|max:150',
            'end_location'               => 'required|string|max:150',
            'start_latitude'             => 'nullable|numeric|between:-90,90',
            'start_longitude'            => 'nullable|numeric|between:-180,180',
            'end_latitude'               => 'nullable|numeric|between:-90,90',
            'end_longitude'              => 'nullable|numeric|between:-180,180',
            'estimated_duration_minutes' => 'nullable|integer|min:1',
            'total_distance_km'          => 'nullable|numeric|min:0',
            'is_active'                  => 'nullable|boolean',
        ]);

        $route = Route::create($validated);

        return response()->json([
            'message' => 'Route created successfully.',
            'route'   => $route,
        ], 201);
    }



    /**
     * GET /api/routes/{id}
     */

    public function show(Route $route)
    {
        $route->load(['stops', 'employees.user', 'activeTrip.vehicle', 'activeTrip.driver.user']);


        $route->loadCount(['stops', 'employees', 'trips']);

        return response()->json(['route' => $route]);
    }


    /**
     * PUT /api/routes/{id}
    */

    public function update(Request $request, Route $route)
    {
        $validated = $request->validate([
            'name'                       => 'sometimes|string|max:100',
            'code'                       => 'nullable|string|max:20|unique:routes,code,' . $route->id,
            'description'                => 'nullable|string|max:500',
            'start_location'             => 'sometimes|string|max:150',
            'end_location'               => 'sometimes|string|max:150',
            'start_latitude'             => 'nullable|numeric|between:-90,90',
            'start_longitude'            => 'nullable|numeric|between:-180,180',
            'end_latitude'               => 'nullable|numeric|between:-90,90',
            'end_longitude'              => 'nullable|numeric|between:-180,180',
            'estimated_duration_minutes' => 'nullable|integer|min:1',
            'total_distance_km'          => 'nullable|numeric|min:0',
            'is_active'                  => 'sometimes|boolean',
        ]);

        $route->update($validated);

        return response()->json([
            'message' => 'Route updated successfully.',
            'route'   => $route->fresh(['stops']),
        ]);
    }


        
    /**
     * DELETE /api/routes/{id}
     */


    public function destroy(Route $route)
    {
        if($route->activeTrip){
            return response()->json([
                'message' => 'Cannot delete a route with an active trip.',
            ], 422);
        }

        $route->delete();

        return response()->json(['message' => 'Route deleted successfully.']);
    }
}
