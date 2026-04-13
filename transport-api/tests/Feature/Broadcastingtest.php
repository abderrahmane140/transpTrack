<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Employee;
use App\Models\Route;
use App\Models\Trip;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BroadcastingTest extends TestCase
{
    use RefreshDatabase;

    private Trip $trip;
    private User $adminUser;
    private User $driverUser;
    private User $employeeUser;
    private User $otherDriverUser;
    private User $otherEmployeeUser;

    protected function setUp(): void
    {
        parent::setUp();

        $route      = Route::factory()->create(['is_active' => true]);
        $otherRoute = Route::factory()->create(['is_active' => true]);
        $vehicle    = Vehicle::factory()->create(['status' => 'active']);

        // Admin
        $this->adminUser = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        // Assigned driver
        $this->driverUser = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $driver = Driver::factory()->create([
            'user_id'    => $this->driverUser->id,
            'vehicle_id' => $vehicle->id,
        ]);

        // Other driver not assigned to trip
        $this->otherDriverUser = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        Driver::factory()->create(['user_id' => $this->otherDriverUser->id]);

        // Employee on same route as trip
        $this->employeeUser = User::factory()->create(['role' => 'employee', 'is_active' => true]);
        Employee::factory()->create([
            'user_id'  => $this->employeeUser->id,
            'route_id' => $route->id,
        ]);

        // Employee on a different route
        $this->otherEmployeeUser = User::factory()->create(['role' => 'employee', 'is_active' => true]);
        Employee::factory()->create([
            'user_id'  => $this->otherEmployeeUser->id,
            'route_id' => $otherRoute->id,
        ]);

        // The trip
        $this->trip = Trip::factory()->create([
            'route_id'   => $route->id,
            'vehicle_id' => $vehicle->id,
            'driver_id'  => $driver->id,
            'status'     => 'active',
        ]);
    }

    #[Test]
    public function admin_can_subscribe_to_any_trip_channel(): void
    {
        $this->actingAs($this->adminUser)
            ->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(200);
    }

    #[Test]
    public function assigned_driver_can_subscribe_to_their_trip_channel(): void
    {
        $this->actingAs($this->driverUser)
            ->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(200);
    }

    #[Test]
    public function other_driver_cannot_subscribe_to_trip_they_are_not_assigned_to(): void
    {
        $this->actingAs($this->otherDriverUser)
            ->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(403);
    }

    #[Test]
    public function employee_on_same_route_can_subscribe_to_trip_channel(): void
    {
        $this->actingAs($this->employeeUser)
            ->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(200);
    }

    #[Test]
    public function employee_on_different_route_cannot_subscribe_to_trip_channel(): void
    {
        $this->actingAs($this->otherEmployeeUser)
            ->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(403);
    }

    #[Test]
    public function unauthenticated_user_cannot_subscribe_to_any_channel(): void
    {
        $this->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(401);
    }

    #[Test]
    public function inactive_user_cannot_subscribe_to_any_channel(): void
    {
        $inactiveEmployee = User::factory()->create([
            'role'      => 'employee',
            'is_active' => false,
        ]);

        Employee::factory()->create([
            'user_id'  => $inactiveEmployee->id,
            'route_id' => $this->trip->route_id,
        ]);

        $this->actingAs($inactiveEmployee)
            ->postJson('/broadcasting/auth', [
                'channel_name' => "private-trip.{$this->trip->id}",
                'socket_id'    => '123.456',
            ])
            ->assertStatus(403);
    }
}