<?php

namespace App\Services;

use App\Models\Trip;
use App\Models\VehicleLocation;
use App\Events\VehicleLocationUpdated;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SimulationService
{
    /**
     * How many steps to interpolate between two consecutive stops.
     * Each step = one location update.
     * 20 steps × 3 second interval = 60 seconds between stops.
     */
    private const STEPS_BETWEEN_STOPS = 20;

    /**
     * Simulated speed in km/h (used for ETA calculation).
     */
    private const SIMULATED_SPEED_KMH = 35.0;

    /**
     * Cache key prefix for simulation state.
     */
    private const CACHE_PREFIX = 'simulation:trip:';

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Start simulation for a trip.
     * Stores initial state in cache and dispatches the first movement job.
     */
    public function start(Trip $trip): void
    {
        if (!$trip->isActive()) {
            throw new \RuntimeException("Trip #{$trip->id} must be active before simulation can start.");
        }

        $stops = $trip->route->stops()->orderBy('order_number')->get();

        if ($stops->count() < 2) {
            throw new \RuntimeException("Route must have at least 2 stops to simulate movement.");
        }

        // Build the full movement plan upfront:
        // a flat list of all interpolated lat/lng points for the entire route
        $waypoints = $this->buildWaypoints($stops);

        // Store simulation state in cache
        $state = [
            'trip_id'          => $trip->id,
            'vehicle_id'       => $trip->vehicle_id,
            'route_id'         => $trip->route_id,
            'waypoints'        => $waypoints,
            'current_index'    => 0,
            'total_waypoints'  => count($waypoints),
            'is_running'       => true,
            'started_at'       => now()->toISOString(),
            'speed_kmh'        => self::SIMULATED_SPEED_KMH,
        ];

        $this->saveState($trip->id, $state);

        Log::info("Simulation started for trip #{$trip->id} with {$state['total_waypoints']} waypoints.");

        // Dispatch the first step immediately
        dispatch(new \App\Jobs\SimulateVehicleMovement($trip->id));
    }

    /**
     * Stop simulation for a trip.
     * Marks state as stopped — the running job will check this and exit.
     */
    public function stop(int $tripId): void
    {
        $state = $this->getState($tripId);

        if (!$state) {
            return;
        }

        $state['is_running'] = false;
        $this->saveState($tripId, $state);

        Log::info("Simulation stopped for trip #{$tripId}.");
    }

    /**
     * Get current simulation state for a trip.
     */
    public function getState(int $tripId): ?array
    {
        return Cache::get(self::CACHE_PREFIX . $tripId);
    }

    /**
     * Check if simulation is currently running for a trip.
     */
    public function isRunning(int $tripId): bool
    {
        $state = $this->getState($tripId);
        return $state && $state['is_running'] === true;
    }

    /**
     * Advance simulation by one step.
     * Called by SimulateVehicleMovement job every 3 seconds.
     *
     * Returns true if there are more steps, false if simulation is complete.
     */
    public function step(int $tripId): bool
    {
        $state = $this->getState($tripId);

        if (!$state || !$state['is_running']) {
            return false;
        }

        $index     = $state['current_index'];
        $waypoints = $state['waypoints'];
        $total     = $state['total_waypoints'];

        // Check if we've reached the end
        if ($index >= $total) {
            $this->complete($tripId);
            return false;
        }

        $waypoint = $waypoints[$index];

        // Calculate heading from previous point
        $heading = 0.0;
        if ($index > 0) {
            $prev    = $waypoints[$index - 1];
            $heading = $this->calculateHeading(
                $prev['lat'], $prev['lng'],
                $waypoint['lat'], $waypoint['lng'],
            );
        }

        $trip = Trip::find($tripId);

        if (!$trip || !$trip->isActive()) {
            $this->stop($tripId);
            return false;
        }

        // Create location record (identical to real GPS update)
        $location = VehicleLocation::create([
            'trip_id'     => $tripId,
            'vehicle_id'  => $state['vehicle_id'],
            'latitude'    => $waypoint['lat'],
            'longitude'   => $waypoint['lng'],
            'speed'       => $state['speed_kmh'],
            'heading'     => $heading,
            'accuracy'    => 5.0,
            'altitude'    => null,
            'recorded_at' => now(),
        ]);

        // Cache the latest location (same as real GPS flow)
        Cache::put("trip:{$tripId}:latest_location", [
            'latitude'    => $waypoint['lat'],
            'longitude'   => $waypoint['lng'],
            'speed'       => $state['speed_kmh'],
            'heading'     => $heading,
            'accuracy'    => 5.0,
            'recorded_at' => now()->toISOString(),
            'trip_id'     => $tripId,
            'vehicle_id'  => $state['vehicle_id'],
        ], 60);

        // Broadcast the location update (same event as real GPS)
        broadcast(new VehicleLocationUpdated($trip, $location));

        // Advance the index
        $state['current_index'] = $index + 1;
        $this->saveState($tripId, $state);

        Log::debug("Simulation step {$index}/{$total} for trip #{$tripId}: lat={$waypoint['lat']}, lng={$waypoint['lng']}");

        return $index + 1 < $total;
    }

    /**
     * Mark simulation as complete and auto-complete the trip.
     */
    public function complete(int $tripId): void
    {
        $state = $this->getState($tripId);
        if ($state) {
            $state['is_running'] = false;
            $this->saveState($tripId, $state);
        }

        $trip = Trip::find($tripId);
        if ($trip && $trip->isActive()) {
            $trip->update([
                'status'   => 'completed',
                'ended_at' => now(),
            ]);
            $trip->driver->update(['is_available' => true]);

            broadcast(new \App\Events\TripStatusChanged($trip->load('driver.user'), 'active'));
            dispatch(new \App\Jobs\CompressTripLocations($trip))->delay(now()->addMinute());

            Log::info("Simulation completed for trip #{$tripId}. Trip auto-marked as completed.");
        }

        // Clean up cache
        Cache::forget(self::CACHE_PREFIX . $tripId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Build the full list of interpolated waypoints for the entire route.
     *
     * For each pair of consecutive stops, generate STEPS_BETWEEN_STOPS
     * intermediate points using linear interpolation.
     *
     * Example with 3 stops and 4 steps between each:
     *   Stop1 → [p1, p2, p3, p4] → Stop2 → [p5, p6, p7, p8] → Stop3
     */
    private function buildWaypoints($stops): array
    {
        $waypoints = [];
        $stopList  = $stops->values();

        for ($i = 0; $i < $stopList->count() - 1; $i++) {
            $from = $stopList[$i];
            $to   = $stopList[$i + 1];

            $steps = self::STEPS_BETWEEN_STOPS;

            for ($step = 0; $step <= $steps; $step++) {
                $fraction = $step / $steps;

                $waypoints[] = [
                    'lat'       => (float) $from->latitude  + ((float) $to->latitude  - (float) $from->latitude)  * $fraction,
                    'lng'       => (float) $from->longitude + ((float) $to->longitude - (float) $from->longitude) * $fraction,
                    'stop_from' => $from->name,
                    'stop_to'   => $to->name,
                    'fraction'  => $fraction,
                ];
            }
        }

        // Add the final destination as the last waypoint
        $lastStop    = $stopList->last();
        $waypoints[] = [
            'lat'       => (float) $lastStop->latitude,
            'lng'       => (float) $lastStop->longitude,
            'stop_from' => $lastStop->name,
            'stop_to'   => $lastStop->name,
            'fraction'  => 1.0,
        ];

        return $waypoints;
    }

    /**
     * Calculate compass heading from point A to point B (0-360 degrees).
     * 0 = North, 90 = East, 180 = South, 270 = West
     */
    private function calculateHeading(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLng = deg2rad($lng2 - $lng1);
        $lat1 = deg2rad($lat1);
        $lat2 = deg2rad($lat2);

        $x = sin($dLng) * cos($lat2);
        $y = cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($dLng);

        $heading = rad2deg(atan2($x, $y));

        return fmod($heading + 360, 360);
    }

    /**
     * Save simulation state to cache with a long TTL (24 hours).
     */
    private function saveState(int $tripId, array $state): void
    {
        Cache::put(self::CACHE_PREFIX . $tripId, $state, now()->addHours(24));
    }
}