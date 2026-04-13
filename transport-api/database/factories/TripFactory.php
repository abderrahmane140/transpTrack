<?php
// ============================================================
// database/factories/TripFactory.php
// ============================================================

namespace Database\Factories;

use App\Models\Driver;
use App\Models\Route;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

class TripFactory extends Factory
{
    public function definition(): array
    {
        return [
            'route_id'        => Route::factory(),
            'vehicle_id'      => Vehicle::factory(),
            'driver_id'       => Driver::factory(),
            'status'          => 'scheduled',
            'scheduled_start' => now()->addHour(),
            'started_at'      => null,
            'ended_at'        => null,
            'is_simulated'    => false,
            'notes'           => null,
        ];
    }

    public function scheduled(): static
    {
        return $this->state(fn() => [
            'status'     => 'scheduled',
            'started_at' => null,
            'ended_at'   => null,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn() => [
            'status'     => 'active',
            'started_at' => now(),
            'ended_at'   => null,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn() => [
            'status'     => 'completed',
            'started_at' => now()->subHour(),
            'ended_at'   => now(),
        ]);
    }

    public function simulated(): static
    {
        return $this->state(fn() => ['is_simulated' => true]);
    }
}