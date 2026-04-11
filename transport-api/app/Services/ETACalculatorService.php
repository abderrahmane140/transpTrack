<?php

namespace App\Services;

use App\Models\Trip;

class ETACalculatorService
{
    //default assumed speed when vehicle has no speed data (km/h)

    private const DEFAULT_SPEED_KMH = 40.0;


    //Radius within which we consider a stop 'already passed' (meters)
    private const PASSED_STOP_RADIUS_METERS = 150.0;


     /**
     * Traffic buffer multiplier applied to raw time estimate
     * 1.2 = add 20% extra time for traffic, stops, etc.
     */
    private const TRAFFIC_BUFFER = 1.2;


     /**
     * Calculate ETA to all remaining stops on a trip.
     *
     * Returns:
     * [
     *   'vehicle_position' => ['lat' => ..., 'lng' => ...],
     *   'current_speed_kmh' => 42.5,
     *   'stops' => [
     *     [
     *       'stop_id'            => 3,
     *       'stop_name'          => 'Central Library',
     *       'order_number'       => 3,
     *       'latitude'           => ...,
     *       'longitude'          => ...,
     *       'distance_km'        => 1.24,
     *       'eta_minutes'        => 4,
     *       'eta_time'           => '08:42',
     *       'status'             => 'upcoming',  // 'passed' | 'upcoming' | 'next'
     *     ],
     *     ...
     *   ],
     *   'next_stop'        => [...],
     *   'destination_eta'  => ['minutes' => 22, 'time' => '09:00'],
     * ]
     */

     public function calculate(
        Trip $trip,
        float $currentLat,
        float $currentLng,
        ?float $currentSpeed = null,
     ): array {
        $stops          = $trip->route->stops->sortBy('order_number')->values();
        $speedKmh      = $this->resolveSpeed($currentSpeed, $trip);
        $results       = [];
        $foundNextStop = false;

        foreach($stops as $stop) {
            $distanceKm  = $this->haversineDistance(
                $currentLat, $currentLng,
                (float ) $stop->latitude, (float) $stop->longitude,
            );

            $distanceMeters = $distanceKm * 1000;

            // Determine if this stop has already been passed
            $isPassed = $distanceMeters <= self::PASSED_STOP_RADIUS_METERS;


            // Travel time with traffic buffer
            $rawMinutes = $speedKmh > 0
                ? ($distanceKm / $speedKmh) * 60
                : $stop->estimated_minutes_from_start;

            $etaMinutes = (int) ceil($rawMinutes * self::TRAFFIC_BUFFER);
            $etaTime = now()->addMinutes($etaMinutes)->format('H:i');


            // First non-passed stop is the "next stop"
            $status  = 'upcoming';
            if($isPassed) {
                $status = 'passed';
            }elseif (!$foundNextStop) {
                $status    = 'next';
                $foundNextStop =true;
            }



            $results[] = [
                'stop_id'      => $stop->id,
                'stop_name'    => $stop->name,
                'order_number' => $stop->order_number,
                'latitude'     => (float) $stop->latitude,
                'longitude'    => (float) $stop->longitude,
                'distance_km'  => round($distanceKm, 2),
                'eta_minutes'  => $isPassed ? 0 : $etaMinutes,
                'eta_time'     => $isPassed ? 'Passed' : $etaTime,
                'status'       => $status,
            ];
        }

        $nextStop = collect($results)->firstWhere('status', 'next');
        $lastStop = collect($results)->last();


        return [
            'vehicle_position'  => [
                'latitude'  => $currentLat,
                'longitude' => $currentLng,
            ],
            'current_speed_kmh' => round($speedKmh, 1),
            'stops'             => $results,
            'next_stop'         => $nextStop,
            'destination_eta'   => $lastStop ? [
                'minutes' => $lastStop['eta_minutes'],
                'time'    => $lastStop['eta_time'],
            ] : null,
            'calculated_at'     => now()->toISOString()
            ];
     }

    /**
     * Haversine formula — straight-line distance between two GPS coordinates.
     * Returns distance in kilometers.
     *
     * Formula:
     *   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
     *   distance = 2R × arcsin(√a)     where R = 6371 km (Earth radius)
     */

    public function haversineDistance(
        float $lat1, float $lng1,
        float $lat2, float $lng2
    ) : float  {
        $earthRadius = 6371.0;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a =  sin($dLat / 2) ** 2
        + cos(deg2rad($lat1))
        * cos(deg2rad($lat2))
        * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * asin(sqrt($a));

    }

    private function resolveSpeed(?float $gpsSpeed, Trip $trip): float

    {
        // GPS speed is in km/h — use it if it's a reasonable value
        if ($gpsSpeed !== null && $gpsSpeed > 2.0) {
            return $gpsSpeed;
        }

        // Use route's estimated average speed if available
        if ($trip->route->estimated_duration_minutes && $trip->route->total_distance_km) {
            $routeAvgSpeed = ($trip->route->total_distance_km / $trip->route->estimated_duration_minutes) * 60;
            if ($routeAvgSpeed > 0) {
                return $routeAvgSpeed;
            }
        }
 
        return self::DEFAULT_SPEED_KMH;
    }
}