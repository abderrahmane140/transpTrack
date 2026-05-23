<?php

namespace App\Services;

use App\Models\Trip;
use App\Models\VehicleLocation;
use App\Events\VehicleLocationUpdated;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SimulationService
{
    private const SIMULATED_SPEED_KMH = 35.0;
    private const CACHE_PREFIX        = 'simulation:trip:';

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Start simulation.
     *
     * @param Trip  $trip
     * @param array $waypoints  Pre-computed road waypoints from the frontend.
     *                          Each item: ['lat' => float, 'lng' => float]
     *                          If empty, falls back to straight-line between stops.
     */
    public function start(Trip $trip, array $waypoints = []): void
    {
        if (!$trip->isActive()) {
            throw new \RuntimeException("Trip #{$trip->id} must be active before simulation can start.");
        }

        $stops = $trip->route->stops()->orderBy('order_number')->get();

        if ($stops->count() < 2) {
            throw new \RuntimeException("Route must have at least 2 stops to simulate movement.");
        }

        // Use pre-computed road waypoints if provided by frontend
        // Otherwise fall back to straight-line interpolation
        if (empty($waypoints)) {
            Log::info("No road waypoints provided for trip #{$trip->id}, using straight-line fallback.");
            $waypoints = $this->buildStraightWaypoints($stops);
        } else {
            Log::info("Using " . count($waypoints) . " pre-computed road waypoints for trip #{$trip->id}.");
        }

        $state = [
            'trip_id'         => $trip->id,
            'vehicle_id'      => $trip->vehicle_id,
            'route_id'        => $trip->route_id,
            'waypoints'       => $waypoints,
            'current_index'   => 0,
            'total_waypoints' => count($waypoints),
            'is_running'      => true,
            'started_at'      => now()->toISOString(),
            'speed_kmh'       => self::SIMULATED_SPEED_KMH,
        ];

        $this->saveState($trip->id, $state);
        dispatch(new \App\Jobs\SimulateVehicleMovement($trip->id));
    }

    public function stop(int $tripId): void
    {
        $state = $this->getState($tripId);
        if (!$state) return;
        $state['is_running'] = false;
        $this->saveState($tripId, $state);
        Log::info("Simulation stopped for trip #{$tripId}.");
    }

    public function getState(int $tripId): ?array
    {
        return Cache::get(self::CACHE_PREFIX . $tripId);
    }

    public function isRunning(int $tripId): bool
    {
        $state = $this->getState($tripId);
        return $state && $state['is_running'] === true;
    }

    public function step(int $tripId): bool
    {
        $state = $this->getState($tripId);
        if (!$state || !$state['is_running']) return false;

        $index     = $state['current_index'];
        $waypoints = $state['waypoints'];
        $total     = $state['total_waypoints'];

        if ($index >= $total) {
            $this->complete($tripId);
            return false;
        }

        $waypoint = $waypoints[$index];

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

        $location = VehicleLocation::create([
            'trip_id'     => $tripId,
            'vehicle_id'  => $state['vehicle_id'],
            'latitude'    => $waypoint['lat'],
            'longitude'   => $waypoint['lng'],
            'speed'       => $state['speed_kmh'],
            'heading'     => $heading,
            'accuracy'    => 3.0,
            'recorded_at' => now(),
        ]);

        Cache::put("trip:{$tripId}:latest_location", [
            'latitude'    => $waypoint['lat'],
            'longitude'   => $waypoint['lng'],
            'speed'       => $state['speed_kmh'],
            'heading'     => $heading,
            'accuracy'    => 3.0,
            'recorded_at' => now()->toISOString(),
            'trip_id'     => $tripId,
            'vehicle_id'  => $state['vehicle_id'],
        ], 60);

        broadcast(new VehicleLocationUpdated($trip, $location));

        $state['current_index'] = $index + 1;
        $this->saveState($tripId, $state);

        return $index + 1 < $total;
    }

    public function complete(int $tripId): void
    {
        $state = $this->getState($tripId);
        if ($state) {
            $state['is_running'] = false;
            $this->saveState($tripId, $state);
        }

        $trip = Trip::find($tripId);
        if ($trip && $trip->isActive()) {
            $trip->update(['status' => 'completed', 'ended_at' => now()]);
            $trip->driver->update(['is_available' => true]);
            broadcast(new \App\Events\TripStatusChanged($trip->load('driver.user'), 'active'));
            dispatch(new \App\Jobs\CompressTripLocations($trip))->delay(now()->addMinute());
            Log::info("Simulation auto-completed trip #{$tripId}.");
        }

        Cache::forget(self::CACHE_PREFIX . $tripId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function buildStraightWaypoints($stops): array
    {
        $waypoints = [];
        $stopList  = $stops->values();
        $steps     = 20;

        for ($i = 0; $i < $stopList->count() - 1; $i++) {
            $from = $stopList[$i];
            $to   = $stopList[$i + 1];
            for ($step = 0; $step <= $steps; $step++) {
                $f           = $step / $steps;
                $waypoints[] = [
                    'lat' => (float)$from->latitude  + ((float)$to->latitude  - (float)$from->latitude)  * $f,
                    'lng' => (float)$from->longitude + ((float)$to->longitude - (float)$from->longitude) * $f,
                ];
            }
        }

        $last        = $stopList->last();
        $waypoints[] = ['lat' => (float)$last->latitude, 'lng' => (float)$last->longitude];
        return $waypoints;
    }

    private function calculateHeading(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLng    = deg2rad($lng2 - $lng1);
        $lat1    = deg2rad($lat1);
        $lat2    = deg2rad($lat2);
        $x       = sin($dLng) * cos($lat2);
        $y       = cos($lat1) * sin($lat2) - sin($lat1) * cos($lat2) * cos($dLng);
        $heading = rad2deg(atan2($x, $y));
        return fmod($heading + 360, 360);
    }

    private function saveState(int $tripId, array $state): void
    {
        Cache::put(self::CACHE_PREFIX . $tripId, $state, now()->addHours(24));
    }
}