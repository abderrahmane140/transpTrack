<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class DriverSeeder extends Seeder
{
    public function run(): void
    {
        $driverUsers  = User::where('role', 'driver')->get();
        $vehicles     = Vehicle::all();

        $driverData = [
            [
                'license_number' => 'DL-2024-001',
                'license_expiry' => '2027-06-30',
                'license_type'   => 'D',
                'is_available'   => true,
            ],
            [
                'license_number' => 'DL-2024-002',
                'license_expiry' => '2026-12-31',
                'license_type'   => 'B',
                'is_available'   => true,
            ],
            [
                'license_number' => 'DL-2024-003',
                'license_expiry' => '2028-03-15',
                'license_type'   => 'C',
                'is_available'   => true,
            ],
        ];

        foreach ($driverUsers as $index => $user) {
            $data = $driverData[$index] ?? $driverData[0];

            Driver::create([
                'user_id'        => $user->id,
                'vehicle_id'     => $vehicles->get($index)?->id,
                'license_number' => $data['license_number'],
                'license_expiry' => $data['license_expiry'],
                'license_type'   => $data['license_type'],
                'is_available'   => $data['is_available'],
            ]);
        }
    }
}