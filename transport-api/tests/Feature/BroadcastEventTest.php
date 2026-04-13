<?php

namespace Tests\Feature;

use App\Events\TripStatusChanged;
use App\Events\VehicleLocationUpdated;
use App\Models\Driver;
use App\Models\Route;
use App\Models\Trip;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BroadcastEventTest extends TestCase
{
    use RefreshDatabase;

    private Trip $trip;
    private User $driverUser;
    private string $driverToken;

    protected function setUp(): void
    {
        parent::setUp();

        $route   = Route::factory()->create();
        $vehicle = Vehicle::factory()->create(['status' => 'active']);

        $this->driverUser = User::factory()->create(['role' => 'driver', 'is_active' => true]);
        $driver = Driver::factory()->create([
            'user_id'      => $this->driverUser->id,
            'vehicle_id'   => $vehicle->id,
            'is_available' => true,
        ]);

        $this->trip = Trip::factory()->create([
            'route_id'   => $route->id,
            'vehicle_id' => $vehicle->id,
            'driver_id'  => $driver->id,
            'status'     => 'active',
            'started_at' => now(),
        ]);

        $this->driverToken = $this->driverUser->createToken('test')->plainTextToken;
    }

    // ── Location broadcast tests ──────────────────────────────────────────

    #[Test]
    public function posting_location_fires_vehicle_location_updated_event(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $this->withToken($this->driverToken)
            ->postJson("/api/trips/{$this->trip->id}/location", [
                'latitude'  => 40.7589,
                'longitude' => -73.9851,
                'speed'     => 38.5,
                'heading'   => 180.0,
                'accuracy'  => 5.0,
            ])
            ->assertStatus(201);

        Event::assertDispatched(VehicleLocationUpdated::class, function ($event) {
            return $event->trip->id === $this->trip->id
                && (float) $event->location->latitude  === 40.7589
                && (float) $event->location->longitude === -73.9851;
        });
    }

    #[Test]
    public function location_event_payload_has_correct_structure(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $this->withToken($this->driverToken)
            ->postJson("/api/trips/{$this->trip->id}/location", [
                'latitude'  => 40.7589,
                'longitude' => -73.9851,
                'speed'     => 42.0,
                'heading'   => 90.0,
            ]);

        Event::assertDispatched(VehicleLocationUpdated::class, function ($event) {
            $payload = $event->broadcastWith();

            return isset($payload['trip_id'])
                && isset($payload['vehicle_id'])
                && isset($payload['route_id'])
                && isset($payload['location']['latitude'])
                && isset($payload['location']['longitude'])
                && isset($payload['location']['speed'])
                && isset($payload['location']['recorded_at']);
        });
    }

    #[Test]
    public function location_event_broadcasts_on_correct_channel(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $this->withToken($this->driverToken)
            ->postJson("/api/trips/{$this->trip->id}/location", [
                'latitude'  => 40.7589,
                'longitude' => -73.9851,
            ]);

        Event::assertDispatched(VehicleLocationUpdated::class, function ($event) {
            $channels    = $event->broadcastOn();
            $channelName = $channels[0]->name ?? '';
            return str_contains($channelName, "trip.{$this->trip->id}");
        });
    }

    #[Test]
    public function posting_location_to_inactive_trip_does_not_fire_event(): void
    {
        Event::fake([VehicleLocationUpdated::class]);

        $this->trip->update(['status' => 'completed']);

        $this->withToken($this->driverToken)
            ->postJson("/api/trips/{$this->trip->id}/location", [
                'latitude'  => 40.7589,
                'longitude' => -73.9851,
            ])
            ->assertStatus(422);

        Event::assertNotDispatched(VehicleLocationUpdated::class);
    }

    // ── Trip status broadcast tests ───────────────────────────────────────

    #[Test]
    public function starting_trip_fires_trip_status_changed_event(): void
    {
        Event::fake([TripStatusChanged::class]);

        $this->trip->update(['status' => 'scheduled', 'started_at' => null]);
        $this->trip->driver->update(['is_available' => true]);

        $adminUser  = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $adminToken = $adminUser->createToken('test')->plainTextToken;

        $this->withToken($adminToken)
            ->postJson("/api/trips/{$this->trip->id}/start")
            ->assertStatus(200);

        Event::assertDispatched(TripStatusChanged::class, function ($event) {
            return $event->trip->id       === $this->trip->id
                && $event->previousStatus === 'scheduled'
                && $event->trip->status   === 'active';
        });
    }

    #[Test]
    public function stopping_trip_fires_trip_status_changed_event(): void
    {
        Event::fake([TripStatusChanged::class]);

        $adminUser  = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $adminToken = $adminUser->createToken('test')->plainTextToken;

        $this->withToken($adminToken)
            ->postJson("/api/trips/{$this->trip->id}/stop")
            ->assertStatus(200);

        Event::assertDispatched(TripStatusChanged::class, function ($event) {
            return $event->trip->id       === $this->trip->id
                && $event->previousStatus === 'active'
                && $event->trip->status   === 'completed';
        });
    }
}