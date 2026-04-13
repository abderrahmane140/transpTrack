<?php

namespace Tests\Feature;

use App\Events\VehicleLocationUpdated;
use App\Jobs\SimulateVehicleMovement;
use App\Models\Driver;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Trip;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleLocation;
use App\Services\SimulationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SimulationTest extends TestCase
{
    use RefreshDatabase;

    private Trip    $trip;
    private Route   $route;
    private User    $adminUser;
    private string  $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        // Create route with stops
        $this->route = Route::factory()->create(['is_active' => true]);

        // Add 3 stops to the route
        RouteStop::create([
            'route_id'                     => $this->route->id,
            'name'                         => 'Stop A',
            'latitude'                     => 40.7589,
            'longitude'                    => -73.9851,
            'order_number'                 => 1,
            'estimated_minutes_from_start' => 0,
        ]);
        RouteStop::create([
            'route_id'                     => $this->route->id,
            'name'                         => 'Stop B',
            'latitude'                     => 40.7500,
            'longitude'                    => -73.9800,
            'order_number'                 => 2,
            'estimated_minutes_from_start' => 10,
        ]);
        RouteStop::create([
            'route_id'                     => $this->route->id,
            'name'                         => 'Stop C (HQ)',
            'latitude'                     => 40.7128,
            'longitude'                    => -74.0060,
            'order_number'                 => 3,
            'estimated_minutes_from_start' => 25,
        ]);

        $vehicle = Vehicle::factory()->create(['status' => 'active']);

        $driverUser = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $driver     = Driver::factory()->create([
            'user_id'      => $driverUser->id,
            'vehicle_id'   => $vehicle->id,
            'is_available' => false,
        ]);

        $this->trip = Trip::factory()->create([
            'route_id'   => $this->route->id,
            'vehicle_id' => $vehicle->id,
            'driver_id'  => $driver->id,
            'status'     => 'active',
            'started_at' => now(),
        ]);

        $this->adminUser  = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $this->adminToken = $this->adminUser->createToken('test')->plainTextToken;
    }

    // ─────────────────────────────────────────────────────────────────────
    // SimulationService unit tests
    // ─────────────────────────────────────────────────────────────────────

    #[Test]
    public function simulation_service_can_start_for_active_trip(): void
    {
        $simulation = app(SimulationService::class);

        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $state = $simulation->getState($this->trip->id);

        $this->assertNotNull($state);
        $this->assertTrue($state['is_running']);
        $this->assertEquals(0, $state['current_index']);
        $this->assertGreaterThan(0, $state['total_waypoints']);
        $this->assertEquals($this->trip->id, $state['trip_id']);
    }

    #[Test]
    public function simulation_generates_correct_number_of_waypoints(): void
    {
        $simulation = app(SimulationService::class);

        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $state         = $simulation->getState($this->trip->id);
        $stopCount     = $this->route->stops()->count(); // 3 stops
        $segmentCount  = $stopCount - 1;                 // 2 segments
        $stepsPerSegment = 20;

        // Each segment has 21 points (0 to 20 inclusive) + 1 final point
        // But consecutive segments share endpoint/startpoint, so:
        // total = (stepsPerSegment + 1) * segments + 1 final
        $expectedMin = $segmentCount * $stepsPerSegment;

        $this->assertGreaterThan($expectedMin, $state['total_waypoints']);
    }

    #[Test]
    public function simulation_step_creates_vehicle_location_record(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $locationsBefore = VehicleLocation::where('trip_id', $this->trip->id)->count();

        $simulation->step($this->trip->id);

        $locationsAfter = VehicleLocation::where('trip_id', $this->trip->id)->count();

        $this->assertEquals($locationsBefore + 1, $locationsAfter);
    }

    #[Test]
    public function simulation_step_fires_vehicle_location_updated_event(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $simulation->step($this->trip->id);

        Event::assertDispatched(VehicleLocationUpdated::class);
    }

    #[Test]
    public function simulation_step_updates_cache_with_latest_location(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $simulation->step($this->trip->id);

        $cached = Cache::get("trip:{$this->trip->id}:latest_location");

        $this->assertNotNull($cached);
        $this->assertArrayHasKey('latitude', $cached);
        $this->assertArrayHasKey('longitude', $cached);
        $this->assertArrayHasKey('speed', $cached);
    }

    #[Test]
    public function simulation_advances_index_on_each_step(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $this->assertEquals(0, $simulation->getState($this->trip->id)['current_index']);

        $simulation->step($this->trip->id);
        $this->assertEquals(1, $simulation->getState($this->trip->id)['current_index']);

        $simulation->step($this->trip->id);
        $this->assertEquals(2, $simulation->getState($this->trip->id)['current_index']);
    }

    #[Test]
    public function simulation_can_be_stopped(): void
    {
        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        $this->assertTrue($simulation->isRunning($this->trip->id));

        $simulation->stop($this->trip->id);

        $this->assertFalse($simulation->isRunning($this->trip->id));
    }

    #[Test]
    public function simulation_step_does_nothing_when_stopped(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);
        $simulation->stop($this->trip->id);

        $locationsBefore = VehicleLocation::where('trip_id', $this->trip->id)->count();

        $result = $simulation->step($this->trip->id);

        $locationsAfter = VehicleLocation::where('trip_id', $this->trip->id)->count();

        $this->assertFalse($result);
        $this->assertEquals($locationsBefore, $locationsAfter);
        Event::assertNotDispatched(VehicleLocationUpdated::class);
    }

    #[Test]
    public function simulation_cannot_start_for_inactive_trip(): void
    {
        $simulation = app(SimulationService::class);

        $this->trip->update(['status' => 'completed']);
        $this->trip->load('route.stops');

        $this->expectException(\RuntimeException::class);
        $simulation->start($this->trip);
    }

    // ─────────────────────────────────────────────────────────────────────
    // SimulationController HTTP tests
    // ─────────────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_start_simulation_via_api(): void
    {
        Queue::fake();

        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/start/{$this->trip->id}")
            ->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'trip_id',
                'route',
                'total_waypoints',
                'interval_seconds',
                'estimated_duration_seconds',
            ]);

        Queue::assertPushed(SimulateVehicleMovement::class);
    }

    #[Test]
    public function admin_can_stop_simulation_via_api(): void
    {
        Queue::fake();

        // Start first
        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/start/{$this->trip->id}")
            ->assertStatus(201);

        // Then stop
        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/stop/{$this->trip->id}")
            ->assertStatus(200)
            ->assertJson(['message' => "Simulation stopped for trip #{$this->trip->id}. Trip is still active."]);
    }

    #[Test]
    public function admin_can_check_simulation_status(): void
    {
        Queue::fake();

        // Start first
        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/start/{$this->trip->id}");

        // Check status
        $this->withToken($this->adminToken)
            ->getJson("/api/simulation/status/{$this->trip->id}")
            ->assertStatus(200)
            ->assertJsonStructure([
                'is_running',
                'trip_id',
                'current_waypoint',
                'total_waypoints',
                'progress_percent',
                'speed_kmh',
                'started_at',
            ]);
    }

    #[Test]
    public function cannot_start_simulation_for_non_active_trip(): void
    {
        $this->trip->update(['status' => 'scheduled', 'started_at' => null]);

        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/start/{$this->trip->id}")
            ->assertStatus(422)
            ->assertJsonFragment(['hint' => 'Call POST /api/trips/{id}/start first.']);
    }

    #[Test]
    public function cannot_start_simulation_twice(): void
    {
        Queue::fake();

        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/start/{$this->trip->id}")
            ->assertStatus(201);

        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/start/{$this->trip->id}")
            ->assertStatus(422)
            ->assertJsonFragment(['message' => "Simulation is already running for trip #{$this->trip->id}."]);
    }

    #[Test]
    public function cannot_stop_simulation_that_is_not_running(): void
    {
        $this->withToken($this->adminToken)
            ->postJson("/api/simulation/stop/{$this->trip->id}")
            ->assertStatus(422)
            ->assertJsonFragment(['message' => "No simulation is running for trip #{$this->trip->id}."]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // SimulateVehicleMovement Job tests
    // ─────────────────────────────────────────────────────────────────────

    #[Test]
    public function job_dispatches_next_step_when_more_waypoints_remain(): void
    {
        Queue::fake();
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);

        // Run the job directly
        $job = new SimulateVehicleMovement($this->trip->id);
        $job->handle($simulation);

        // Should have dispatched the next step
        Queue::assertPushed(SimulateVehicleMovement::class);
    }

    #[Test]
    public function job_does_not_dispatch_next_step_when_simulation_stopped(): void
    {
        Queue::fake();
        Event::fake([VehicleLocationUpdated::class]);

        $simulation = app(SimulationService::class);
        $this->trip->load('route.stops');
        $simulation->start($this->trip);
        $simulation->stop($this->trip->id);

        Queue::fake(); // reset

        $job = new SimulateVehicleMovement($this->trip->id);
        $job->handle($simulation);

        Queue::assertNotPushed(SimulateVehicleMovement::class);
    }
}