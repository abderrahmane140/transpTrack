<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\SimulationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SimulationController extends Controller
{
    public function __construct(
        private readonly SimulationService $simulation,
    ) {}

    /**
     * POST /api/simulation/start/{trip}
     *
     * Accepts optional pre-computed road waypoints from React frontend.
     * Frontend fetches road route from OSRM (works from browser) then
     * sends waypoints here so vehicle follows real roads.
     */
    public function start(Request $request, Trip $trip): JsonResponse
    {
        if (!$trip->isActive()) {
            return response()->json([
                'message' => "Trip must be active to start simulation. Current status: '{$trip->status}'.",
                'hint'    => 'Call POST /api/trips/{id}/start first.',
            ], 422);
        }

        if ($this->simulation->isRunning($trip->id)) {
            return response()->json([
                'message' => "Simulation is already running for trip #{$trip->id}.",
                'state'   => $this->simulation->getState($trip->id),
            ], 422);
        }

        $trip->load('route.stops');

        if ($trip->route->stops->count() < 2) {
            return response()->json(['message' => 'Route must have at least 2 stops.'], 422);
        }

        $validated = $request->validate([
            'waypoints'       => 'nullable|array|min:2',
            'waypoints.*.lat' => 'required_with:waypoints|numeric|between:-90,90',
            'waypoints.*.lng' => 'required_with:waypoints|numeric|between:-180,180',
        ]);

        $waypoints = $validated['waypoints'] ?? [];

        try {
            $this->simulation->start($trip, $waypoints);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $state = $this->simulation->getState($trip->id);

        return response()->json([
            'message'                    => "Simulation started for trip #{$trip->id}.",
            'trip_id'                    => $trip->id,
            'route'                      => $trip->route->name,
            'total_waypoints'            => $state['total_waypoints'],
            'interval_seconds'           => 3,
            'road_following'             => count($waypoints) > 0,
            'estimated_duration_seconds' => $state['total_waypoints'] * 3,
        ], 201);
    }

    public function stop(Request $request, Trip $trip): JsonResponse
    {
        if (!$this->simulation->isRunning($trip->id)) {
            return response()->json(['message' => "No simulation is running for trip #{$trip->id}."], 422);
        }
        $this->simulation->stop($trip->id);
        return response()->json(['message' => "Simulation stopped for trip #{$trip->id}.", 'trip_id' => $trip->id]);
    }

    public function status(Request $request, Trip $trip): JsonResponse
    {
        $state = $this->simulation->getState($trip->id);
        if (!$state) {
            return response()->json(['is_running' => false, 'trip_id' => $trip->id]);
        }
        $current = $state['current_index'];
        $total   = $state['total_waypoints'];
        return response()->json([
            'is_running'       => $state['is_running'],
            'trip_id'          => $trip->id,
            'current_waypoint' => $current,
            'total_waypoints'  => $total,
            'progress_percent' => $total > 0 ? round(($current / $total) * 100, 1) : 0,
            'speed_kmh'        => $state['speed_kmh'],
            'started_at'       => $state['started_at'],
            'current_position' => $state['waypoints'][$current] ?? null,
        ]);
    }
}