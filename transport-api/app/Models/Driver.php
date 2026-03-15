<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use HasFactory, SoftDeletes;


    protected $fillable = [
        'user_id',
        'vehicle_id',
        'license_expiry',
        'license_type',
        'is_available',
        'notes'
    ];

    protected $casts = [
        'license_expiry' => 'date', // convert "2025-12-31" to carbon data date object
        'is_available'   => 'boolean'  // with casts returns true (boolean) without cas return "1" (stirng)
    ];

     
    // ──────────────────────────────────────────
    // Scopes
    // ──────────────────────────────────────────
 
    public function scopeAvailable($query)
    {
        return $query->where("is_available", true);
    }

    public function scopeLicenseExpiringSoon($query, int $days = 30)
    {
        return $query->where('license_expiry' , '<=', now()->addDays($days));
    }

    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function trips()
    {
        return $this->hasMany(Trip::class);
    }

    public function activeTrip() 
    {
        return $this->hasOne(Trip::class)->where('status', 'active');
    }

    // ──────────────────────────────────────────
    // Accessors
    // ──────────────────────────────────────────

    public function getNameAttribute()
    {
        return $this->user?->name ?? '';
    }

    public function isLicenseExpired()
    {
        return $this->license_expiry->isPast();
    }
 
}
