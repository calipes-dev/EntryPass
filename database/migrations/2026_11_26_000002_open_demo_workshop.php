<?php

use App\Models\Event;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        $event = Event::where('title', 'Cebu Design Workshop')->where('venue', 'Cebu IT Park, Workshop Room')
            ->where('capacity', 2)->lockForUpdate()->first();
        if (!$event) {
            return;
        }
        foreach ([1, 2] as $n) {
            $event->registrations()->where('email', "demo{$n}@example.test")
                ->where('full_name', "Demo Attendee {$n}")->where('mobile', '0917123456'.$n)
                ->where('status', 'confirmed')->update(['status' => 'cancelled']);
        }
        foreach ($event->occupiedSpots()->orderBy('id')->get() as $i => $registration) {
            $registration->update(['seat' => 'A'.($i + 1)]);
        }
        $event->update(['capacity' => 30]);
    }

    public function down(): void
    {
        // Later bookings can depend on the expanded room.
    }
};
