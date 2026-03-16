<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{

    /**
     * POST /api/auth/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if(!Auth::attempt($request->only('email','password'))){
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();

        if(!$user->is_active) {
            Auth::logout();
            return response()->json([
                'message' => 'Your account has been deactivated. Please contact your administrator.',
            ],403);
        }

        // Revoke previous tokens (single session per user)
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        // Load role-specific profile
        $profile = match ($user->role) {
            'driver'   => $user->load('driver.vehicle'),
            'employee' => $user->load('employee.route.stops'),
            default    => $user,
        };

        return response()->json([
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ]);
    }

    /**
     * POST /api/auth/logout
     */

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * GET /api/auth/me
     */

    public function me(Request $request)
    {
        $user = $request->user();

        $user->load(match ($user->role){
            'driver'   => ['driver.vehicle'],
            'employee' => ['employee.route.stops'],
            default    => [],
        });

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }


    // ──────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────

    private function formatUser($user)
    {
        $data = [
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'phone'     => $user->phone,
            'avatar'    => $user->avatar,
            'is_active' => $user->is_active,
        ];

        if($user->role === 'driver' && $user->driver) {
            $data['driver'] = $user->driver;
        }

        if($user->role === 'employee' && $user->employee) {
            $data['employee'] = $user->employee;
        }

        return $data;
    }
}
