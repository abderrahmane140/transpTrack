<?php
// ============================================================
// database/factories/EmployeeFactory.php
// ============================================================

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'          => User::factory()->create(['role' => 'employee'])->id,
            'route_id'         => null,
            'employee_code'    => strtoupper(fake()->bothify('EMP-####')),
            'department'       => fake()->randomElement(['Engineering', 'Marketing', 'Finance', 'HR', 'Operations']),
            'position'         => fake()->jobTitle(),
            'pickup_stop'      => null,
            'pickup_latitude'  => null,
            'pickup_longitude' => null,
            'notes'            => null,
        ];
    }
}