<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Route;
use App\Models\User;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employeeUsers = User::where('role', 'employee')->get();
        $routes        = Route::all();

        $departments = ['Engineering', 'Marketing', 'Finance', 'HR', 'Operations', 'Sales'];

        foreach ($employeeUsers as $index => $user) {
            // Distribute employees across routes (2 per route)
            $route = $routes->get((int) floor($index / 2) % $routes->count());

            Employee::create([
                'user_id'         => $user->id,
                'route_id'        => $route?->id,
                'employee_code'   => 'EMP-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                'department'      => $departments[$index] ?? 'General',
                'position'        => 'Staff',
                'pickup_stop'     => $route?->stops->first()?->name,
                'pickup_latitude' => $route?->stops->first()?->latitude,
                'pickup_longitude'=> $route?->stops->first()?->longitude,
            ]);
        }
    }
}