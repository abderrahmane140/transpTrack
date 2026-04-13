<?php

use App\Models\Trip;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels — Transport Tracking System
|--------------------------------------------------------------------------
|
| Channel naming convention used in this app:
|
|   private-trip.{tripId}     →  live vehicle location updates
|   private-admin.{userId}    →  admin-only notifications
|   private-driver.{userId}   →  driver-specific notifications
|   private-employee.{userId} →  employee-specific notifications
|
*/

// ─────────────────────────────────────────────────────────────────────────────
// TRIP CHANNEL  →  private-trip.{tripId}
//
// This is the main channel. VehicleLocationUpdated broadcasts here.
// The driver posts GPS → event fires → all listeners receive it.
//
// Authorization rules:
//   Admin    → can listen to ANY trip (for live monitoring dashboard)
//   Driver   → only their OWN assigned trip
//   Employee → only if the trip is running on THEIR assigned route
// ─────────────────────────────────────────────────────────────────────────────
Broadcast::channel('trip.{tripId}', function ($user, int $tripId) {
    $trip = Trip::find($tripId);

    if (!$trip) {
        return false;
    }

    // Inactive users cannot connect to any channel
    if (!$user->is_active) {
        return false;
    }

    // Admin: full access to all trips
    if ($user->isAdmin()) {
        return [
            'id'   => $user->id,
            'name' => $user->name,
            'role' => $user->role,
        ];
    }

    // Driver: only their assigned trip
    if ($user->isDriver()) {
        $driver = $user->driver;
        if ($driver && $driver->id === $trip->driver_id) {
            return [
                'id'   => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ];
        }
        return false;
    }

    // Employee: only if trip is on their assigned route
    if ($user->isEmployee()) {
        $employee = $user->employee;
        if ($employee && $employee->route_id === $trip->route_id) {
            return [
                'id'   => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ];
        }
        return false;
    }

    return false;
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CHANNEL  →  private-admin.{userId}
//
// For admin-only push notifications:
//   - Driver started/stopped a trip
//   - Vehicle went offline (no location update for 30s)
//   - License expiry warnings
// ─────────────────────────────────────────────────────────────────────────────
Broadcast::channel('admin.{userId}', function ($user, int $userId) {
    return $user->isAdmin() && $user->id === $userId;
});

// ─────────────────────────────────────────────────────────────────────────────
// DRIVER CHANNEL  →  private-driver.{userId}
//
// For driver-specific notifications:
//   - Trip assigned to them
//   - Route changes
// ─────────────────────────────────────────────────────────────────────────────
Broadcast::channel('driver.{userId}', function ($user, int $userId) {
    return $user->isDriver() && $user->id === $userId;
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE CHANNEL  →  private-employee.{userId}
//
// For employee-specific notifications:
//   - Trip is starting soon
//   - Route changed
//   - Trip cancelled
// ─────────────────────────────────────────────────────────────────────────────
Broadcast::channel('employee.{userId}', function ($user, int $userId) {
    return $user->isEmployee() && $user->id === $userId;
});