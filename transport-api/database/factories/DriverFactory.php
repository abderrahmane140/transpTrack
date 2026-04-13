<?php
// ============================================================
// database/factories/DriverFactory.php
// ============================================================

namespace Database\Factories;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

class DriverFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'        => User::factory()->create(['role' => 'driver'])->id,
            'vehicle_id'     => null,
            'license_number' => strtoupper(fake()->bothify('DL-####-???')),
            'license_expiry' => fake()->dateTimeBetween('+1 year', '+5 years')->format('Y-m-d'),
            'license_type'   => fake()->randomElement(['A', 'B', 'C', 'D', 'EB']),
            'is_available'   => true,
            'notes'          => null,
        ];
    }

    public function unavailable(): static
    {
        return $this->state(fn() => ['is_available' => false]);
    }

    public function withVehicle(): static
    {
        return $this->state(fn() => [
            'vehicle_id' => Vehicle::factory()->create()->id,
        ]);
    }
}