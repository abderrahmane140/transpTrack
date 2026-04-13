<?php
// ============================================================
// database/factories/RouteFactory.php
// ============================================================

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class RouteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'                       => fake()->words(2, true) . ' Route',
            'code'                       => strtoupper(fake()->bothify('RT-??##')),
            'description'                => fake()->sentence(),
            'start_location'             => fake()->city() . ' Terminal',
            'end_location'               => 'Company HQ',
            'start_latitude'             => fake()->latitude(40.6, 40.8),
            'start_longitude'            => fake()->longitude(-74.1, -73.9),
            'end_latitude'               => 40.7128,
            'end_longitude'              => -74.0060,
            'estimated_duration_minutes' => fake()->numberBetween(20, 60),
            'total_distance_km'          => fake()->randomFloat(2, 5, 30),
            'is_active'                  => true,
        ];
    }
}