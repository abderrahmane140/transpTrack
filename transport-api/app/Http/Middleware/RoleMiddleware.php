<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     */
    
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (!$request->user()->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated. Please contact your administrator.',
            ], 403);
        }

        if (!in_array($request->user()->role, $roles, true)) {
            return response()->json([
                'message' => 'You do not have permission to access this resource.',
                'required_roles' => $roles,
                'your_role'      => $request->user()->role,
            ], 403);
        }

        return $next($request);
    }
}