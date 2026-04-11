<?php

namespace App\Http\Controllers\Api;

use App\Events\VehicleLocationUpdated;
use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\VehicleLocation;
use App\Services\ETACalculatorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VehicleLocationController extends Controller
{
    public function __construct(
        private readonly ETACalculatorService $etaCalculator
    )
    {}

    /**
     * POST /api/trips/{trip}/location
     * Driver sends GPS coordinates
     * This is the hot path — called every 3 seconds during an active trip
     */

    public function store(Request $request, Trip $trip)
    {

        // ── Guard: trip must be active ────────────────────────────────────
        if (!$trip->isActive()) {
            return response()->json([
                'message' => 'Location updates can only be sent for active trips.',
            ], 422);
        }

         // ── Guard: only the assigned driver can post location ─────────────
        $user = $request->user();
         if ($user->isDriver()) {
            $driver = $user->driver;
            if (!$driver || $driver->id !== $trip->driver_id) {
                return response()->json([
                    'message' => 'You are not the assigned driver for this trip.',
                ], 403);
            }
        }

        // ── Validate GPS payload ──────────────────────────────────────────
        $validated = $request->validate([
            'latitude'    => 'required|numeric|between:-90,90',
            'longitude'   => 'required|numeric|between:-180,180',
            'speed'       => 'nullable|numeric|min:0|max:200',
            'heading'     => 'nullable|numeric|min:0|max:360',
            'accuracy'    => 'nullable|numeric|min:0',
            'altitude'    => 'nullable|numeric',
            'recorded_at' => 'nullable|date',
        ]);

         // ── Save to database ──────────────────────────────────────────────
        $location = VehicleLocation::create([
            'trip_id'     => $trip->id,
            'vehicle_id'  => $trip->vehicle_id,
            'latitude'    => $validated['latitude'],
            'longitude'   => $validated['longitude'],
            'speed'       => $validated['speed'] ?? null,
            'heading'     => $validated['heading'] ?? null,
            'accuracy'    => $validated['accuracy'] ?? null,
            'altitude'    => $validated['altitude'] ?? null,
            'recorded_at' => $validated['recorded_at'] ?? now(),
        ]);

        // ── Cache latest location in Redis (fast reads, 60s TTL) ──────────
        $cacheKey = "trip:{$trip->id}:latest_location";
        Cache::put($cacheKey, [
            'latitude'    => (float) $location->latitude,
            'longitude'   => (float) $location->longitude,
            'speed'       => $location->speed ? (float) $location->speed : null,
            'heading'     => $location->heading ? (float) $location->heading : null,
            'accuracy'    => $location->accuracy ? (float) $location->accuracy : null,
            'recorded_at' => $location->recorded_at->toISOString(),
            'trip_id'     => $trip->id,
            'vehicle_id'  => $trip->vehicle_id,
        ], 60); // expires after 60 seconds of no updates
        // ── Broadcast to all listeners on this trip's channel ─────────────
        // This fires the WebSocket event that employees see on their map
        Broadcast(new VehicleLocationUpdated($trip, $location))->toOthers();
    
        return response()->json([
            'message'     => 'Location recorded.',
            'location_id' => $location->id,
            'recorded_at' => $location->recorded_at->toISOString(),
        ], 201);
    }


    /**
     * GET /api/trips/{trip}/location/latest
     * Everyone: get the most recent GPS position of the vehicle
     * Reads from Redis cache first, falls back to MySQL
     */
    public function latest(Trip $trip)
    {
        // ── Try Redis cache first (< 1ms) ─────────────────────────────────
        $cacheKey =  "trip:{$trip->id}:latest_location";
        $cached  = Cache::get($cacheKey);

        if ($cached) {
            return response()->json([
                'source'   => 'cache',
                'location' => $cached,
            ]);
        }

        // ── Fall back to MySQL ─────────────────────────────────────────────
        $location = VehicleLocation::where('trip_id', $trip->id)
            ->orderByDesc('recorded_at')
            ->first();

        if (!$location) {
            return response()->json([
                'message'  => 'No location data yet for this trip.',
                'location' => null,
            ]);
        }
        
         return response()->json([
            'source'   => 'database',
            'location' => [
                'latitude'    => (float) $location->latitude,
                'longitude'   => (float) $location->longitude,
                'speed'       => $location->speed ? (float) $location->speed : null,
                'heading'     => $location->heading ? (float) $location->heading : null,
                'accuracy'    => $location->accuracy ? (float) $location->accuracy : null,
                'recorded_at' => $location->recorded_at->toISOString(),
                'trip_id'     => $location->trip_id,
                'vehicle_id'  => $location->vehicle_id,
            ],
        ]);
    }

    /**
     * GET /api/trips/{trip}/location/history
     * Admin only: full path the vehicle has taken during a trip
     * Used to draw the driven path on the admin map
     */

    public function history(Request $request, Trip $trip)
    {
        $request->validate([
            'from'     => 'nullable|date',
            'to'       => 'nullable|date',
            'limit'    => 'nullable|integer|min:1|max:1000',
            'interval' => 'nullable|integer|min:1', // return 1 point per N seconds
        ]);

        $query = VehicleLocation::where('trip_id', $trip->id)
        ->orderBy('recorded_at');

        if ($request->filled('from')) {
            $query->where('recorded_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('recorded_at', '<=', $request->to);
        }

        $locations = $query->limit($request->get('limit', 500))->get([
            'id', 'latitude', 'longitude', 'speed', 'heading', 'recorded_at',
        ]);

         // ── Interval sampling: thin out dense data for map rendering ──────
        // e.g. interval=30 returns 1 point per 30 seconds instead of every 3s
        if ($request->filled('interval') && $locations->count() > 0) {
            $interval  = (int) $request->interval;
            $filtered  = collect();
            $lastTime  = null;
 
            foreach ($locations as $loc) {
                $time = $loc->recorded_at->timestamp;
                if ($lastTime === null || ($time - $lastTime) >= $interval) {
                    $filtered->push($loc);
                    $lastTime = $time;
                }
            }
 
            $locations = $filtered;
        }


        return response()->json([
            'trip_id'   => $trip->id,
            'count'     => $locations->count(),
            'locations' => $locations,
        ]);
    }


    /**
     * GET /api/trips/{trip}/eta
     * Employee + Admin: estimated arrival time to each remaining stop
     */

    public function eta(Request $request, Trip $trip)
    {
        if (!$trip->isActive()) {
            return response()->json([
                'message' => 'ETA is only available for active trips.',
                'eta'     => null,
            ], 422);
        }

        // Get current vehicle position
        $cacheKey = "trip:{$trip->id}:latest_location";
        $latestLocation = Cache::get($cacheKey);


        if (!$latestLocation) {
            $loc = VehicleLocation::where('trip_id', $trip->id)
                ->orderByDesc('recorded_at')
                ->first();
 
            if (!$loc) {
                return response()->json([
                    'message' => 'No location data available yet.',
                    'eta'     => null,
                ]);
            }
 
            $latestLocation = [
                'latitude'  => (float) $loc->latitude,
                'longitude' => (float) $loc->longitude,
                'speed'     => $loc->speed ? (float) $loc->speed : null,
            ];
        }

        //Get target stop (employee's pickup stop, or all stops)
        $trip->load('route.stops');

        $etaResult = $this->etaCalculator->calculate(
            trip: $trip,
            currentLat: $latestLocation['latitude'],
            currentLng: $latestLocation['longitude'],
            currentSpeed: $latestLocation['speed'],
        );


         // If employee, filter to just their pickup stop
        $employee = $request->user()->employee ?? null;
        if ($employee && $employee->pickup_stop) {
            $etaResult['my_stop_eta'] = collect($etaResult['stops'])
                ->firstWhere('stop_name', $employee->pickup_stop);
        }

        return response()->json($etaResult);
    }


}
