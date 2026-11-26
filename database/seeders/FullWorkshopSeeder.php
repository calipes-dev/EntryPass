<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Registration;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FullWorkshopSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $event = Event::where('title', 'Cebu Design Workshop')->where('venue', 'Cebu IT Park, Workshop Room')
                ->where('capacity', 30)->lockForUpdate()->first();
            if (!$event) return;
            $taken = $event->occupiedSpots()->pluck('seat')->all();
            foreach (range('A','F') as $table) {
                foreach (range(1,5) as $number) {
                    $seat = $table.$number;
                    if (in_array($seat, $taken, true)) continue;
                    $event->registrations()->create([
                        'full_name' => "Workshop demo $seat", 'email' => strtolower("workshop-$seat@example.test"),
                        'mobile' => '09000000000', 'seat' => $seat, 'registered_at' => now(),
                        'status' => 'confirmed', 'ticket_code' => Registration::newTicketCode(),
                    ]);
                }
            }
        });
    }
}
