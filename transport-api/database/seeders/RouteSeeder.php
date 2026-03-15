<?php

namespace Database\Seeders;

use App\Models\Route;
use App\Models\RouteStop;
use Illuminate\Database\Seeder;

class RouteSeeder extends Seeder
{
    public function run(): void
    {
        // ── Route 1: North Route ──────────────────────────────────────────
        $north = Route::create([
            'name'                       => 'North Route',
            'code'                       => 'RT-N01',
            'description'                => 'Covers the northern residential areas to HQ',
            'start_location'             => 'North Park Terminus',
            'end_location'               => 'Company HQ',
            'start_latitude'             => 40.7589,
            'start_longitude'            => -73.9851,
            'end_latitude'               => 40.7128,
            'end_longitude'              => -74.0060,
            'estimated_duration_minutes' => 45,
            'total_distance_km'          => 18.5,
            'is_active'                  => true,
        ]);

        $northStops = [
            ['name' => 'North Park Terminus',  'latitude' => 40.7589, 'longitude' => -73.9851, 'order_number' => 1, 'estimated_minutes_from_start' => 0,  'landmark' => 'Near North Park Mall'],
            ['name' => 'Maple Street Stop',    'latitude' => 40.7560, 'longitude' => -73.9820, 'order_number' => 2, 'estimated_minutes_from_start' => 5,  'landmark' => 'Opposite Maple Cafe'],
            ['name' => 'Central Library',      'latitude' => 40.7520, 'longitude' => -73.9780, 'order_number' => 3, 'estimated_minutes_from_start' => 12, 'landmark' => 'Main entrance side'],
            ['name' => 'Downtown Junction',    'latitude' => 40.7450, 'longitude' => -73.9750, 'order_number' => 4, 'estimated_minutes_from_start' => 22, 'landmark' => 'Bus shelter on corner'],
            ['name' => 'Riverside Boulevard',  'latitude' => 40.7350, 'longitude' => -73.9800, 'order_number' => 5, 'estimated_minutes_from_start' => 32, 'landmark' => 'Near river bridge'],
            ['name' => 'Company HQ',           'latitude' => 40.7128, 'longitude' => -74.0060, 'order_number' => 6, 'estimated_minutes_from_start' => 45, 'landmark' => 'Main gate entrance'],
        ];

        foreach ($northStops as $stop) {
            RouteStop::create(array_merge($stop, ['route_id' => $north->id]));
        }

        // ── Route 2: East Route ───────────────────────────────────────────
        $east = Route::create([
            'name'                       => 'East Route',
            'code'                       => 'RT-E01',
            'description'                => 'Covers eastern suburbs to HQ',
            'start_location'             => 'East Gate Station',
            'end_location'               => 'Company HQ',
            'start_latitude'             => 40.7282,
            'start_longitude'            => -73.9442,
            'end_latitude'               => 40.7128,
            'end_longitude'              => -74.0060,
            'estimated_duration_minutes' => 35,
            'total_distance_km'          => 14.2,
            'is_active'                  => true,
        ]);

        $eastStops = [
            ['name' => 'East Gate Station',    'latitude' => 40.7282, 'longitude' => -73.9442, 'order_number' => 1, 'estimated_minutes_from_start' => 0,  'landmark' => 'East Gate Metro'],
            ['name' => 'Eastwood Mall',        'latitude' => 40.7260, 'longitude' => -73.9500, 'order_number' => 2, 'estimated_minutes_from_start' => 7,  'landmark' => 'South entrance'],
            ['name' => 'Park Avenue',          'latitude' => 40.7220, 'longitude' => -73.9600, 'order_number' => 3, 'estimated_minutes_from_start' => 15, 'landmark' => 'Park Ave & 5th'],
            ['name' => 'City Center',          'latitude' => 40.7180, 'longitude' => -73.9800, 'order_number' => 4, 'estimated_minutes_from_start' => 25, 'landmark' => 'City Hall area'],
            ['name' => 'Company HQ',           'latitude' => 40.7128, 'longitude' => -74.0060, 'order_number' => 5, 'estimated_minutes_from_start' => 35, 'landmark' => 'Main gate entrance'],
        ];

        foreach ($eastStops as $stop) {
            RouteStop::create(array_merge($stop, ['route_id' => $east->id]));
        }

        // ── Route 3: South Route ──────────────────────────────────────────
        $south = Route::create([
            'name'                       => 'South Route',
            'code'                       => 'RT-S01',
            'description'                => 'Covers southern district to HQ',
            'start_location'             => 'South Terminal',
            'end_location'               => 'Company HQ',
            'start_latitude'             => 40.6892,
            'start_longitude'            => -73.9812,
            'end_latitude'               => 40.7128,
            'end_longitude'              => -74.0060,
            'estimated_duration_minutes' => 30,
            'total_distance_km'          => 11.8,
            'is_active'                  => true,
        ]);

        $southStops = [
            ['name' => 'South Terminal',       'latitude' => 40.6892, 'longitude' => -73.9812, 'order_number' => 1, 'estimated_minutes_from_start' => 0,  'landmark' => 'Near South Harbor'],
            ['name' => 'Harbor View',          'latitude' => 40.6950, 'longitude' => -73.9870, 'order_number' => 2, 'estimated_minutes_from_start' => 8,  'landmark' => 'By the waterfront'],
            ['name' => 'Market Square',        'latitude' => 40.7020, 'longitude' => -73.9900, 'order_number' => 3, 'estimated_minutes_from_start' => 18, 'landmark' => 'Central market'],
            ['name' => 'Company HQ',           'latitude' => 40.7128, 'longitude' => -74.0060, 'order_number' => 4, 'estimated_minutes_from_start' => 30, 'landmark' => 'Main gate entrance'],
        ];

        foreach ($southStops as $stop) {
            RouteStop::create(array_merge($stop, ['route_id' => $south->id]));
        }
    }
}