<?php
// ============================================================
// database/factories/VehicleFactory.php
// ============================================================

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'         => fake()->randomElement(['Bus', 'Van', 'Minibus']) . ' ' . strtoupper(fake()->bothify('??')),
            'plate_number' => strtoupper(fake()->bothify('TR-###-??')),
            'type'         => fake()->randomElement(['bus', 'van', 'car', 'minibus']),
            'capacity'     => fake()->numberBetween(8, 50),
            'model'        => fake()->randomElement(['Mercedes Sprinter', 'Ford Transit', 'Toyota Coaster']),
            'year'         => fake()->numberBetween(2018, 2024),
            'color'        => fake()->safeColorName(),
            'status'       => 'active',
            'notes'        => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn() => ['status' => 'inactive']);
    }

    public function maintenance(): static
    {
        return $this->state(fn() => ['status' => 'maintenance']);
    }
}