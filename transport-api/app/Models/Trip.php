<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Trip extends Model
{
    use HasFactory, SoftDeletes;


    protected $fillable = [
        'route_id',
        'vehicle_id',
        'driver_id',
        'status',
        'scheduled_start',
        'started_at',
        'ended_at',
        'is_simulated',
        'notes',
    ];
 
    protected $casts = [
        'scheduled_start' => 'datetime',
        'started_at'      => 'datetime',
        'ended_at'        => 'datetime',
        'is_simulated'    => 'boolean',
    ];


    // ──────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

        public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'trip_employees')
            ->withPivot('boarded_at', 'alighted_at')
            ->withTimestamps();
    }

    public function locations()
    {
        return $this->hasMany(VehicleLocation::class)->orderBy('recorded_at');
    }

    public function latestLocation()
    {
        return $this->hasOne(VehicleLocation::class)->latestOfMany('recorded_at');
    }

    // ──────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────

    public function isActive()
    {
        return $this->status === 'active';
    }

    public function getDurationMinutes()
    {
       if (!$this->started_at || !$this->ended_at) {
            return null;
        }
 
        return (int) $this->started_at->diffInMinutes($this->ended_at);
    }
}
