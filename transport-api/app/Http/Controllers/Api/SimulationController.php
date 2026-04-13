<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\SimulationService;
use Illuminate\Http\Request;

class SimulationController extends Controller
{
    public function __construct(
        private readonly SimulationService $simulation
    )
    {}

    /**
     * POST /api/simulation/start/{trip}
     *
     * Starts simulated GPS movement for a trip.
     * The trip must already be active (started).
     */

    public function start(Request $request, Trip $trip)
    {
        //Trip must be active 
        if(!$trip->isActive()) {
            return response()->json([
                'message' => "Trip must be active to start simulation. Current status: '{$trip->status}'.",
                'hint'    => 'Call POST /api/trips/{id}/start first.',
            ], 422);
        }

        // Prevent double-starting
        if ($this->simulation->isRunning($trip->id)) {
            return response()->json([
                'message' => "Simulation is already running for trip #{$trip->id}.",
                'state'   => $this->simulation->getState($trip->id),
            ], 422);
        }

        // Load route stops (required for waypoint generation)
        $trip->load('route.stops');

        if ($trip->route->stops->count() < 2) {
            return response()->json([
                'message' => 'Route must have at least 2 stops to simulate movement.',
            ], 422);
        }


        try {
            $this->simulation->start($trip);
        }catch (\RuntimeException $e) {
             return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        $state = $this->simulation->getState($trip->id);

        return response()->json([
           'message'          => "Simulation started for trip #{$trip->id}.",
            'trip_id'          => $trip->id,
            'route'            => $trip->route->name,
            'total_waypoints'  => $state['total_waypoints'],
            'interval_seconds' => 3,
            'estimated_duration_seconds' => $state['total_waypoints'] * 3,
        ], 201);
    }

    /**
     * POST /api/simulation/stop/{trip}
     *
     * Stops the simulation. The trip remains active —
     * you can restart simulation or have the driver take over with real GPS.
     */

    public function stop(Request $request, Trip $trip)
    {
        if (!$this->simulation->isRunning($trip->id)) {
            return response()->json([
                'message' => "No simulation is running for trip #{$trip->id}.",
            ], 422);
        }
 
        $this->simulation->stop($trip->id);
 
        return response()->json([
            'message' => "Simulation stopped for trip #{$trip->id}. Trip is still active.",
            'trip_id' => $trip->id,
            'status'  => $trip->status,
        ]);
    }

     /**
     * GET /api/simulation/status/{trip}
     *
     * Returns current simulation progress.
     */


     public function status(Request $request, Trip $trip)
     {
        $state = $this->simulation->getState($trip->id);

        if(!$state) {
            return response()->json([
                'is_running'      => false,
                'trip_id'         => $trip->id,
                'message'         => 'No simulation state found for this trip.',
            ]);
        }

        $current = $state['current_index'];
        $total   = $state['total_waypoints'];
        $percent = $total > 0 ? round(($current / $total) * 100, 1) : 0;
 
        return response()->json([
            'is_running'       => $state['is_running'],
            'trip_id'          => $trip->id,
            'current_waypoint' => $current,
            'total_waypoints'  => $total,
            'progress_percent' => $percent,
            'speed_kmh'        => $state['speed_kmh'],
            'started_at'       => $state['started_at'],
            'current_position' => $state['waypoints'][$current] ?? null,
        ]);
    }
}
