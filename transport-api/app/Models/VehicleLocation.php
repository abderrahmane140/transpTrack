<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VehicleLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'trip_id',
        'vehicle_id',
        'latitude',
        'longitude',
        'speed',
        'heading',
        'accuracy',
        'altitude',
        'recorded_at',
    ];
 
    protected $casts = [
        'latitude'    => 'decimal:7',
        'longitude'   => 'decimal:7',
        'speed'       => 'decimal:2',
        'heading'     => 'decimal:2',
        'accuracy'    => 'decimal:2',
        'altitude'    => 'decimal:2',
        'recorded_at' => 'datetime',
    ];

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
