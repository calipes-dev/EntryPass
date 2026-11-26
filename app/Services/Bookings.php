<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Event;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Bookings
{
    public static function cancel(Event $event, int $registrationId, ?int $staffId): void
    {
        DB::transaction(function () use ($event, $registrationId, $staffId) {
            Event::lockForUpdate()->findOrFail($event->id);
            $registration = $event->registrations()->lockForUpdate()->findOrFail($registrationId);

            if ($registration->status === 'checked_in') {
                throw ValidationException::withMessages(['registration' => 'A checked-in registration cannot be cancelled.']);
            }
            if ($registration->status === 'cancelled') {
                return;
            }

            $registration->status = 'cancelled';
            $registration->save();
            AuditLog::record($staffId, 'registration.cancelled', 'registration', $registration->id);
        });
    }
}
