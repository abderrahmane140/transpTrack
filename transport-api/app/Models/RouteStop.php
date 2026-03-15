<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RouteStop extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_id',
        'name',
        'latitude',
        'longitude',
        'order_number',
        'estimated_minutes_from_start',
        'landmark',
        'notes',
    ];
 
    protected $casts = [
        'latitude'                     => 'decimal:7',
        'longitude'                    => 'decimal:7',
        'order_number'                 => 'integer',
        'estimated_minutes_from_start' => 'integer',
    ];

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function route() 
    {
        return $this->belongsTo(Route::class);
    }

     
    // ──────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────

      /**
     * Calculate straight-line distance from this stop to given coordinates (km).
     */


       public function distanceTo(float $lat, float $lng): float
    {
        $earthRadius = 6371; // km
 
        $latFrom = deg2rad((float) $this->latitude);
        $lonFrom = deg2rad((float) $this->longitude);
        $latTo   = deg2rad($lat);
        $lonTo   = deg2rad($lng);
 
        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;
 
        $a = sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lonDelta / 2) ** 2;
 
        return $earthRadius * 2 * asin(sqrt($a));
    }

}
