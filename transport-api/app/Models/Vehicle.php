<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicle extends Model
{
    use HasFactory , SoftDeletes;

    protected $fillable = [
        'name',
        'plate_number',
        'type',
        'capacity',
        'model',
        'year',
        'color',
        'status',
        'notes'
    ];

    protected $casts = [
        'capacity' => 'integer',
        'year' => 'integer'
    ];


    // ──────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }


    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function driver()
    {
        return $this->hasOne(Driver::class);
    }

    public function trips()
    {
        return $this->hasMany(Trip::class);
    }

    public function activeTrip()
    {
        return $this->hasOne(Trip::class)->where('status', 'active');
    }

    public function locations()
    {
        return $this->hasMany(VehicleLocation::class);
    }

    public function latestLocation()
    {
        return $this->hasOne(VehicleLocation::class)->latestOfMany('recorded_at');
    }
}
