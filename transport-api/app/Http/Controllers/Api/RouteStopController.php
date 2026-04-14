<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Route;
use App\Models\RouteStop;
use Illuminate\Http\Request;

class RouteStopController extends Controller
{
    /**
     * GET /api/routes/{route}/stops
     */

    public function index(Route $route)
    {
        $stops = $route->stops()->orderBy('order_number')->get();

        return response()->json([
            'route' => $route->only('id', 'name', 'code'),
            'stops' => $stops,
        ]);
    }

    /**
     * POST /api/routes/{route}/stops
     */
    public function store(Request $request, Route $route)
    {
        $validated = $request->validate([
            'name'                         => 'required|string|max:100',
            'latitude'                     => 'required|numeric|between:-90,90',
            'longitude'                    => 'required|numeric|between:-180,180',
            'order_number'                 => 'required|integer|min:1',
            'estimated_minutes_from_start' => 'nullable|integer|min:0',
            'landmark'                     => 'nullable|string|max:150',
            'notes'                        => 'nullable|string|max:500',
        ]);

        //check order number uniqueness for this route
        $exists = $route->stops()->where('order_number', $validated['order_number'])->exists();

        if ($exists) {
            return response()->json([
                'message' => "Order number {$validated['order_number']} is already taken on this route.",
            ], 422);
        }

        $stop = $route->stops()->create($validated);

        return response()->json([
            'message' => 'Stop added successfully.',
            'stop'    => $stop,
        ], 201);
    }


    /**
     * GET /api/stops/{stop}  (shallow route)
     */
    public function show(RouteStop $stop)
    {
        return response()->json(['stop' => $stop->load('route')]);
    }

    /**
     * PUT /api/stops/{stop}  (shallow route)
     */
    public function update(Request $request, RouteStop $stop)
    {
        $validated = $request->validate([
            'name'                         => 'sometimes|string|max:100',
            'latitude'                     => 'sometimes|numeric|between:-90,90',
            'longitude'                    => 'sometimes|numeric|between:-180,180',
            'order_number'                 => 'sometimes|integer|min:1',
            'estimated_minutes_from_start' => 'nullable|integer|min:0',
            'landmark'                     => 'nullable|string|max:150',
            'notes'                        => 'nullable|string|max:500',
        ]);

        //Validate new order number doesn't conflict

        if (isset($validated['order_number']) && $validated['order_number'] !== $stop->order_number) {

            $exists = RouteStop::where('route_id', $stop->route_id)
                    ->where('order_number', $validated['order_number'])
                    ->exists();

            if($exists){
                return response()->json([
                        'message' => "Order number {$validated['order_number']} is already taken on this route.",
                ], 422);
            }
        }

        $stop->update($validated);

        return response()->json([
            'message' => 'Stop updated successfully.',
            'stop'    => $stop->fresh(),
        ]);
    }

    /**
     * DELETE /api/stops/{stop}  (shallow route)
     */
    public function destroy(RouteStop $stop)
    {
        $stop->delete();

        return response()->json(['message' => 'Stop deleted successfully.']);
    }

}

