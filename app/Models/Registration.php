<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Registration extends Model
{
    public $timestamps = false;
    protected $fillable = ['seat', 'full_name', 'email', 'mobile', 'ticket_code', 'status', 'registered_at'];
    protected $casts = ['registered_at' => 'datetime', 'checked_in_at' => 'datetime'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public static function newTicketCode(): string
    {
        return 'EP-'.strtoupper(bin2hex(random_bytes(16)));
    }
}
