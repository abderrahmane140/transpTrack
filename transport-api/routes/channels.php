<?php

use App\Models\Trip;
use Illuminate\Support\Facades\Broadcast;
/**
 * Private channel: trip.{tripId}
 *
 * Who can listen:
 *  - Admin:    always (monitors all trips)
 *  - Driver:   only their own assigned trip
 *  - Employee: only if the trip is on their assigned route
 */

Broadcast::channel('trip.{tripId}', function ($user,int $tripId) {
    $trip = Trip::find($tripId);

    if (!$trip) {
        return false;
    }

    // Admin can listen to any trip
    if ($user->isAdmin()) {
        return true;
    }

    //Driver can only listen to their own trip
 
    if ($user->isDriver) {
        $driver = $user->driver;
        return $driver && $driver->id === $trip->driver_id;
    }


    // Employee can listen if the trip is on their assigned route
    if ($user->isEmployee()) {
        $employee = $user->employee;
        return $employee && $employee->route_id == $trip->route_id;
    }

    return false;
});