<?php

namespace Database\Seeders;

use App\Models\Vehicle;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class VehicleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
    $vehicles = [
            [
                'name'         => 'Bus Alpha',
                'plate_number' => 'TR-001-AA',
                'type'         => 'bus',
                'capacity'     => 40,
                'model'        => 'Mercedes Sprinter',
                'year'         => 2022,
                'color'        => 'White',
                'status'       => 'active',
            ],
            [
                'name'         => 'Van Beta',
                'plate_number' => 'TR-002-BB',
                'type'         => 'van',
                'capacity'     => 14,
                'model'        => 'Ford Transit',
                'year'         => 2021,
                'color'        => 'Blue',
                'status'       => 'active',
            ],
            [
                'name'         => 'Minibus Gamma',
                'plate_number' => 'TR-003-CC',
                'type'         => 'minibus',
                'capacity'     => 22,
                'model'        => 'Toyota Coaster',
                'year'         => 2023,
                'color'        => 'Silver',
                'status'       => 'active',
            ],
        ];

        foreach ($vehicles as $vehicle) {
            Vehicle::create($vehicle);
        }
    }
}
