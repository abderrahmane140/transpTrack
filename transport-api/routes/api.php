<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\RouteController;
use App\Http\Controllers\Api\RouteStopController;
use App\Http\Controllers\Api\SimulationController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\VehicleLocationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Employee Transport Tracking System
|--------------------------------------------------------------------------
*/

// ── Public ────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login',    [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
});

// ── Authenticated ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout',     [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
        Route::get('me',          [AuthController::class, 'me']);
        Route::put('profile',     [AuthController::class, 'updateProfile']);
    });

    // ── Admin only ────────────────────────────────────────────────────────
    Route::middleware('role:admin')->group(function () {

        // Vehicles
        Route::apiResource('vehicles', VehicleController::class);

        // Drivers
        Route::apiResource('drivers', DriverController::class);
        Route::post('drivers/{driver}/assign-vehicle',    [DriverController::class, 'assignVehicle']);
        Route::delete('drivers/{driver}/unassign-vehicle',[DriverController::class, 'unassignVehicle']);

        // Employees
        Route::apiResource('employees', EmployeeController::class);
        Route::post('employees/{employee}/assign-route',  [EmployeeController::class, 'assignRoute']);

        // Routes & Stops
        Route::apiResource('routes', RouteController::class);
        Route::apiResource('routes.stops', RouteStopController::class)->shallow();

        // Trips — admin full control
        Route::get('trips',                          [TripController::class, 'index']);
        Route::post('trips',                         [TripController::class, 'store']);
        Route::delete('trips/{trip}',                [TripController::class, 'destroy']);
        Route::get('trips/{trip}/employees',         [TripController::class, 'employees']);

        // Location history (admin only)
        Route::get('trips/{trip}/location/history',  [VehicleLocationController::class, 'history']);

        // Simulation controls (admin only)
        Route::post('simulation/start/{trip}',       [SimulationController::class, 'start']);
        Route::post('simulation/stop/{trip}',        [SimulationController::class, 'stop']);
        Route::get('simulation/status/{trip}',       [SimulationController::class, 'status']);
    });

    // ── Admin + Driver ────────────────────────────────────────────────────
    Route::middleware('role:admin,driver')->group(function () {

        // IMPORTANT: 'trips/active' must come BEFORE 'trips/{trip}'
        // otherwise Laravel matches "active" as a trip ID
        Route::get('trips/active',           [TripController::class, 'active']);
        Route::get('trips/{trip}',           [TripController::class, 'show']);
        Route::post('trips/{trip}/start',    [TripController::class, 'start']);
        Route::post('trips/{trip}/stop',     [TripController::class, 'stop']);

        // Driver posts GPS location to backend
        Route::post('trips/{trip}/location', [VehicleLocationController::class, 'store']);

        // Driver-specific "my" routes
        Route::get('my/vehicle',             [DriverController::class, 'myVehicle']);
        Route::get('my/trip',                [DriverController::class, 'myActiveTrip']);

        // ← FIX: Driver fetches their own SCHEDULED trip without admin access
        Route::get('my/scheduled-trip',      [DriverController::class, 'myScheduledTrip']);
    });

    // ── Admin + Driver + Employee ─────────────────────────────────────────
    Route::middleware('role:admin,driver,employee')->group(function () {
        Route::get('trips/{trip}/location/latest', [VehicleLocationController::class, 'latest']);
        Route::get('trips/{trip}/eta',             [VehicleLocationController::class, 'eta']);
        Route::get('routes/{route}/stops',         [RouteStopController::class, 'index']);
    });

    // ── Employee only ─────────────────────────────────────────────────────
    Route::middleware('role:employee')->group(function () {
        Route::get('my/route', [EmployeeController::class, 'myRoute']);
        Route::get('my/trip',  [EmployeeController::class, 'myActiveTrip']);
    });
});