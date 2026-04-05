<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Route;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{

    /**
     * GET /api/employees
     */
    public function index(Request $request)
    {
        $query = Employee::with(['user', 'route'])
            ->when($request->filled('route_id'), fn($q) => $q->where('route_id', $request->route_id))
            ->when($request->filled('department'), fn($q) => $q->where('department', $request->department))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->where('employee_code', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%"));
            });
 
        $employees = $query->orderByDesc('created_at')->paginate($request->get('per_page', 15));

        return response()->json($employees);
    }


    /**
     * POST /api/employees
     * Creates a User (role=employee) + Employee profile in one request
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            // User fields
            'name'              => 'required|string|max:100',
            'email'             => 'required|email|unique:users,email',
            'password'          => 'required|string|min:8|confirmed',
            'phone'             => 'nullable|string|max:20',
            // Employee fields
            'employee_code'     => 'required|string|max:50|unique:employees,employee_code',
            'department'        => 'nullable|string|max:100',
            'position'          => 'nullable|string|max:100',
            'route_id'          => 'nullable|exists:routes,id',
            'pickup_stop'       => 'nullable|string|max:100',
            'pickup_latitude'   => 'nullable|numeric|between:-90,90',
            'pickup_longitude'  => 'nullable|numeric|between:-180,180',
            'notes'             => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try{
            $user = User::create([
                'name'      => $validated['name'],
                'email'     => $validated['email'],
                'password'  => Hash::make($validated['password']),
                'role'      => 'employee',
                'phone'     => $validated['phone'] ?? null,
                'is_active' => true,
            ]);
 
            $employee = Employee::create([
                'user_id'           => $user->id,
                'employee_code'     => $validated['employee_code'],
                'department'        => $validated['department'] ?? null,
                'position'          => $validated['position'] ?? null,
                'route_id'          => $validated['route_id'] ?? null,
                'pickup_stop'       => $validated['pickup_stop'] ?? null,
                'pickup_latitude'   => $validated['pickup_latitude'] ?? null,
                'pickup_longitude'  => $validated['pickup_longitude'] ?? null,
                'notes'             => $validated['notes'] ?? null,
            ]);
            Db::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message'  => 'Employee created successfully.',
            'employee' => $employee->load('user', 'route'),
        ], 201);
    }

    /**
     * GET /api/employees/{id}
     */
    public function show(Employee $employee)
    {
        $employee->load(['user', 'route.stops']);

        return response()->json(['employee' => $employee]);
    }

     /**
     * PUT /api/employees/{id}
     */
    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            // User fields
            'name'             => 'sometimes|string|max:100',
            'phone'            => 'nullable|string|max:20',
            'is_active'        => 'sometimes|boolean',
            // Employee fields
            'employee_code'    => 'sometimes|string|max:50|unique:employees,employee_code,' . $employee->id,
            'department'       => 'nullable|string|max:100',
            'position'         => 'nullable|string|max:100',
            'route_id'         => 'nullable|exists:routes,id',
            'pickup_stop'      => 'nullable|string|max:100',
            'pickup_latitude'  => 'nullable|numeric|between:-90,90',
            'pickup_longitude' => 'nullable|numeric|between:-180,180',
            'notes'            => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try{
            $userFields = array_intersect_key($validated, array_flip(['name', 'phone', 'is_active']));

            if (!empty($userFields)) {
                $employee->user->update($userFields);
            }
 
            $employeeFields = array_diff_key($validated, array_flip(['name', 'phone', 'is_active']));

            if (!empty($employeeFields)) {
                $employee->update($employeeFields);
            }
 
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message'  => 'Employee updated successfully.',
            'employee' => $employee->fresh(['user', 'route']),
        ]);
    }


    /**
     * DELETE /api/employees/{id}
     */
    public function destroy(Employee $employee)
    {
        DB::transaction(function () use($employee ) {
            $employee->delete();
            $employee->user->delete();
        });

        return response()->json(['message' => 'Employee deleted successfully.']);
    }

    /**
     * POST /api/employees/{id}/assign-route
    */
    public function assignRoute(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'route_id'         => 'required|exists:routes,id',
            'pickup_stop'      => 'nullable|string|max:100',
            'pickup_latitude'  => 'nullable|numeric|between:-90,90',
            'pickup_longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $route = Route::findOrFail($validated['route_id']);

        $employee->update([
            'route_id'         => $route->id,
            'pickup_stop'      => $validated['pickup_stop'] ?? $employee->pickup_stop,
            'pickup_latitude'  => $validated['pickup_latitude'] ?? $employee->pickup_latitude,
            'pickup_longitude' => $validated['pickup_longitude'] ?? $employee->pickup_longitude,
        ]);


        return response()->json([
            'message'  => "Employee assigned to route '{$route->name}'.",
            'employee' => $employee->fresh(['user', 'route.stops']),
        ]);
    }

    /**
     * GET /api/my/route  (employee sees their assigned route)
     */
    public function myRoute(Request $request)
    {

        $employee = $request->user()->employee;

        if(!$employee || !$employee->roiute)
        {
            return response()->json(['message' => 'No route assigned.'], 404);
        }

        $route = $employee->route()->with('stops')->first();

        return response()->json([
            'route'        => $route,
            'pickup_stop'  => $employee->pickup_stop,
        ]);

    }

    /**
     * GET /api/my/trip  (employee sees the active trip on their route)
     */
    public function myActiveTrip(Request $request)
    {
        $employee = $request->user()->employee;

        if (!$employee || !$employee->route_id) {
            return response()->json(['message' => 'No route assigned.'], 404);
        }

        $trip = $employee->route
            ->activeTrip()
            ->with(['vehicle', 'driver.user', 'route.stops', 'latestLocation'])
            ->first();

        if(!$trip) {
            return response()->json(['message' => 'No active trip on your route.', 'trip' => null]);
        }

        return response()->json(['trip' => $trip]);
    }
}
