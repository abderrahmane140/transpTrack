<?php

namespace Database\Seeders;

use App\Models\Route;
use App\Models\RouteStop;
use Illuminate\Database\Seeder;

class RouteSeeder extends Seeder
{
    public function run(): void
    {
        // ── Route 1: Gueliz → Medina ──────────────────────────────────────────
        $route1 = Route::create([
            'name'                       => 'Gueliz - Medina Route',
            'code'                       => 'RT-GM01',
            'description'                => 'From Gueliz modern district to the old Medina',
            'start_location'             => 'Gueliz - Place du 16 Novembre',
            'end_location'               => 'Medina - Jemaa el-Fna',
            'start_latitude'             => 31.6295,
            'start_longitude'            => -8.0082,
            'end_latitude'               => 31.6252,
            'end_longitude'              => -7.9892,
            'estimated_duration_minutes' => 20,
            'total_distance_km'          => 3.5,
            'is_active'                  => true,
        ]);

        $stops1 = [
            [
                'name'                         => 'Place du 16 Novembre - Gueliz',
                'latitude'                     => 31.6295,
                'longitude'                    => -8.0082,
                'order_number'                 => 1,
                'estimated_minutes_from_start' => 0,
                'landmark'                     => 'Near Cafe Les Negociants',
            ],
            [
                'name'                         => 'Avenue Mohammed V',
                'latitude'                     => 31.6285,
                'longitude'                    => -8.0020,
                'order_number'                 => 2,
                'estimated_minutes_from_start' => 5,
                'landmark'                     => 'Near Marjane supermarket',
            ],
            [
                'name'                         => 'Cyber Park Arsat El Harti',
                'latitude'                     => 31.6278,
                'longitude'                    => -7.9970,
                'order_number'                 => 3,
                'estimated_minutes_from_start' => 9,
                'landmark'                     => 'Opposite the park entrance',
            ],
            [
                'name'                         => 'Koutoubia Mosque',
                'latitude'                     => 31.6238,
                'longitude'                    => -7.9930,
                'order_number'                 => 4,
                'estimated_minutes_from_start' => 14,
                'landmark'                     => 'Next to the Koutoubia minaret',
            ],
            [
                'name'                         => 'Jemaa el-Fna - Medina',
                'latitude'                     => 31.6252,
                'longitude'                    => -7.9892,
                'order_number'                 => 5,
                'estimated_minutes_from_start' => 20,
                'landmark'                     => 'Main square entrance',
            ],
        ];

        foreach ($stops1 as $stop) {
            RouteStop::create(array_merge($stop, ['route_id' => $route1->id]));
        }

        // ── Route 2: Palmeraie → Centre Ville ────────────────────────────────
        $route2 = Route::create([
            'name'                       => 'Palmeraie - Centre Ville',
            'code'                       => 'RT-PC02',
            'description'                => 'From Palmeraie residential area to city centre',
            'start_location'             => 'Palmeraie Circuit',
            'end_location'               => 'Centre Ville - Place Abdelmoumen',
            'start_latitude'             => 31.6780,
            'start_longitude'            => -7.9560,
            'end_latitude'               => 31.6300,
            'end_longitude'              => -8.0100,
            'estimated_duration_minutes' => 30,
            'total_distance_km'          => 8.2,
            'is_active'                  => true,
        ]);

        $stops2 = [
            [
                'name'                         => 'Palmeraie Circuit',
                'latitude'                     => 31.6780,
                'longitude'                    => -7.9560,
                'order_number'                 => 1,
                'estimated_minutes_from_start' => 0,
                'landmark'                     => 'Palmeraie Golf Palace entrance',
            ],
            [
                'name'                         => 'Route de Fes',
                'latitude'                     => 31.6680,
                'longitude'                    => -7.9620,
                'order_number'                 => 2,
                'estimated_minutes_from_start' => 8,
                'landmark'                     => 'Near the petrol station',
            ],
            [
                'name'                         => 'Bab Doukkala',
                'latitude'                     => 31.6380,
                'longitude'                    => -7.9980,
                'order_number'                 => 3,
                'estimated_minutes_from_start' => 18,
                'landmark'                     => 'Historic city gate',
            ],
            [
                'name'                         => 'Place Abdelmoumen Ben Ali',
                'latitude'                     => 31.6300,
                'longitude'                    => -8.0100,
                'order_number'                 => 4,
                'estimated_minutes_from_start' => 30,
                'landmark'                     => 'Central roundabout Gueliz',
            ],
        ];

        foreach ($stops2 as $stop) {
            RouteStop::create(array_merge($stop, ['route_id' => $route2->id]));
        }

        // ── Route 3: Menara → Hivernage ──────────────────────────────────────
        $route3 = Route::create([
            'name'                       => 'Menara - Hivernage',
            'code'                       => 'RT-MH03',
            'description'                => 'From Menara gardens area to Hivernage district',
            'start_location'             => 'Menara Airport Road',
            'end_location'               => 'Hivernage - Avenue Echouada',
            'start_latitude'             => 31.6089,
            'start_longitude'            => -8.0363,
            'end_latitude'               => 31.6210,
            'end_longitude'              => -7.9995,
            'estimated_duration_minutes' => 25,
            'total_distance_km'          => 5.8,
            'is_active'                  => true,
        ]);

        $stops3 = [
            [
                'name'                         => 'Menara - Airport Road',
                'latitude'                     => 31.6089,
                'longitude'                    => -8.0363,
                'order_number'                 => 1,
                'estimated_minutes_from_start' => 0,
                'landmark'                     => 'Near Menara Mall entrance',
            ],
            [
                'name'                         => 'Menara Gardens',
                'latitude'                     => 31.6120,
                'longitude'                    => -8.0270,
                'order_number'                 => 2,
                'estimated_minutes_from_start' => 7,
                'landmark'                     => 'Historic garden pavilion',
            ],
            [
                'name'                         => 'Avenue de France',
                'latitude'                     => 31.6160,
                'longitude'                    => -8.0150,
                'order_number'                 => 3,
                'estimated_minutes_from_start' => 15,
                'landmark'                     => 'Near Theatre Royal',
            ],
            [
                'name'                         => 'Hivernage - Avenue Echouada',
                'latitude'                     => 31.6210,
                'longitude'                    => -7.9995,
                'order_number'                 => 4,
                'estimated_minutes_from_start' => 25,
                'landmark'                     => 'Hivernage hotel district',
            ],
        ];

        foreach ($stops3 as $stop) {
            RouteStop::create(array_merge($stop, ['route_id' => $route3->id]));
        }
    }
}