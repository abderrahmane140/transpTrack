<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'route_id',
        'employee_code',
        'department',
        'position',
        'pickup_stop',
        'pickup_latitude',
        'pickup_longitude',
        'notes',
    ];

    protected $casts = [
        'pickup_latitude'  => 'decimal:7',
        'pickup_longitude' => 'decimal:7',
    ];



    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function user() 
    {
        return $this->belongsTo(User::class);
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function trips()
    {
        return $this->belongsToMany(Trip::class, 'trip_employees')
            ->withPivot('boarded_at', 'alighted_at')
            ->withTimestamps();
    }

    // ──────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────

    public function getNameAttribute(): string
    {
        return $this->user?->name ?? '';
    }
 
    public function getEmailAttribute(): string
    {
        return $this->user?->email ?? '';
    }
}
