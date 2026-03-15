<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPUnit\Framework\MockObject\NoMoreReturnValuesConfiguredException;
use PHPUnit\Framework\MockObject\Stub\ReturnReference;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'avatar',
        'is_active'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // ──────────────────────────────────────────
    // Role Helper
    // ──────────────────────────────────────────

    public function isAdmin() {
        return $this->role === 'admin';
    }

    public function isDriver() {
        return $this->role === 'driver'; 
    }

    public function isEmployee() {
        return $this->role === 'employee';
    }


    // ──────────────────────────────────────────
    // Relationships
    // ──────────────────────────────────────────

    public function driver() {
        return $this->hasOne(Driver::class);
    }

    public function employee() {
        return $this->hasOne(Employee::class);
    }
}
