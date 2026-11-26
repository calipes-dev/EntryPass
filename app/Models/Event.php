<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    protected $fillable = ['title', 'description', 'venue', 'starts_at', 'ends_at', 'capacity', 'status'];
    protected $casts = ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'capacity' => 'integer'];

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }

    public function occupiedSpots(): HasMany
    {
        return $this->registrations()->whereIn('status', ['confirmed', 'checked_in']);
    }

    public static function staffCounts(): array
    {
        return [
            'occupiedSpots as registrations_count',
            'registrations as confirmed_count' => fn ($query) => $query->where('status', 'confirmed'),
            'registrations as checked_in_count' => fn ($query) => $query->where('status', 'checked_in'),
            'registrations as waitlisted_count' => fn ($query) => $query->where('status', 'waitlisted'),
            'registrations as cancelled_count' => fn ($query) => $query->where('status', 'cancelled'),
        ];
    }

    protected $appends = ['has_started'];

    public function getHasStartedAttribute(): bool
    {
        return $this->starts_at->lte(now());
    }
}
