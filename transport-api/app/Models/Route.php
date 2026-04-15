<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Route extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'start_location',
        'end_location',
        'start_latitude',
        'start_longitude',
        'end_latitude',
        'end_longitude',
        'estimated_duration_minutes',
        'total_distance_km',
        'is_active',
    ];
 
    protected $casts = [
        'start_latitude'              => 'decimal:7',
        'start_longitude'             => 'decimal:7',
        'end_latitude'                => 'decimal:7',
        'end_longitude'               => 'decimal:7',
        'estimated_duration_minutes'  => 'integer',
        'total_distance_km'           => 'decimal:2',
        'is_active'                   => 'boolean',
    ];


    // ──────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────
 
    public function stops()
    {
        return $this->hasMany(RouteStop::class)->orderBy('order_number');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function trips()
    {
        return $this->hasMany(Trip::class);
    }

    public function activeTrip()
    {
        return $this->hasOne(Trip::class)->where('status', 'active');
    }
}
