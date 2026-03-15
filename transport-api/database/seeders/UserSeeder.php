<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        // Admin 
        User::create([
            'name'     => 'Super Admin',
            'email'    => 'admin@transport.com',
            'password' => Hash::make('admin123'),
            'role'     => 'admin',
            'phone'    => '+212 673 21 72 03',
            'is_active' => true,
        ]);

        // Drivers 

        $drivers = [
            ['name' => 'lokmane Driver',  'email' => 'lokmane.driver@transport.com',  'phone' => '+212 6 89 94 32 25'],
            ['name' => 'salama Driver', 'email' => 'salama.driver@transport.com', 'phone' => '+212 6 66 94 23 42'],
            ['name' => 'ahmed Driver',  'email' => 'ahmed.driver@transport.com',  'phone' => '+212 7 77 50 59 00'],
        ];



        foreach ($drivers as $driver) {
            User::create([
                'name'      => $driver['name'],
                'email'     => $driver['email'],
                'password'  => Hash::make('password'),
                'role'      => 'driver',
                'phone'     => $driver['phone'],
                'is_active' => true,
            ]);
        }


                // ── Employees ────────────────────────────
        $employees = [
                ['name' => 'Ahmed',  'email' => 'ahmed@company.com',  'phone' => '+212676378393'],
                ['name' => 'Hassan', 'email' => 'hassan@company.com', 'phone' => '+212612345678'],
                ['name' => 'Aymen',  'email' => 'aymen@company.com',  'phone' => '+212645987321'],
                ['name' => 'Imane',  'email' => 'imane@company.com',  'phone' => '+212667112233'],
                ['name' => 'Youssef','email' => 'youssef@company.com','phone' => '+212698445566'],
                ['name' => 'Fatima', 'email' => 'fatima@company.com', 'phone' => '+212655778899'],
        ];

        foreach ($employees as $employee) {
            User::create([
                'name'      => $employee['name'],
                'email'     => $employee['email'],
                'password'  => Hash::make('password'),
                'role'      => 'employee',
                'phone'     => $employee['phone'],
                'is_active' => true,
            ]);
        }



    }
}
