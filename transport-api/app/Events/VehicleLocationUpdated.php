<?php

namespace App\Events;

use App\Models\Trip;
use App\Models\VehicleLocation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehicleLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Trip $trip,
        public readonly VehicleLocation $location,
    ) {}

    /**
     * The WebSocket channel this event broadcasts on.
     *
     * Channel name:  private-trip.{tripId}
     *
     * Private channel means only authenticated users
     * who pass the authorization check in channels.php
     * can listen to it.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("trip.{$this->trip->id}"),
        ];
    }

    /**
     * The event name the frontend listens for.
     * React: Echo.private(`trip.${tripId}`).listen('.location.updated', ...)
     */
    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    /**
     * The data payload sent to all listeners.
     * Keep this lean — it fires every 3 seconds.
     */
    public function broadcastWith(): array
    {
        return [
            'trip_id'     => $this->trip->id,
            'vehicle_id'  => $this->trip->vehicle_id,
            'route_id'    => $this->trip->route_id,
            'location'    => [
                'latitude'    => (float) $this->location->latitude,
                'longitude'   => (float) $this->location->longitude,
                'speed'       => $this->location->speed
                    ? (float) $this->location->speed
                    : null,
                'heading'     => $this->location->heading
                    ? (float) $this->location->heading
                    : null,
                'accuracy'    => $this->location->accuracy
                    ? (float) $this->location->accuracy
                    : null,
                'recorded_at' => $this->location->recorded_at->toISOString(),
            ],
        ];
    }
}