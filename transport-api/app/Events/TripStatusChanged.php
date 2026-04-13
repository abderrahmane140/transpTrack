<?php

namespace App\Events;

use App\Models\Trip;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TripStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Trip $trip,
        public readonly string $previousStatus,
    ) {}

    /**
     * Broadcasts on three channels simultaneously:
     *
     *  1. trip.{id}         → driver and employees watching this trip
     *  2. admin.{adminId}   → all admins (via a loop in Phase 5/6)
     *
     * For simplicity here we broadcast on the trip channel only.
     * Admin notifications can be added when building the admin dashboard.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("trip.{$this->trip->id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'trip.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'trip_id'         => $this->trip->id,
            'route_id'        => $this->trip->route_id,
            'vehicle_id'      => $this->trip->vehicle_id,
            'previous_status' => $this->previousStatus,
            'new_status'      => $this->trip->status,
            'started_at'      => $this->trip->started_at?->toISOString(),
            'ended_at'        => $this->trip->ended_at?->toISOString(),
            'driver'          => [
                'id'   => $this->trip->driver->user->id,
                'name' => $this->trip->driver->user->name,
            ],
        ];
    }
}