<?php

namespace Database\Seeders;

use App\Models\Event;

use App\Models\StaffUser;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('app.demo_staff_password');
        if (! app()->environment('local', 'testing') || ! $password) {
            throw new RuntimeException('Demo seeding requires a local or testing environment and DEMO_STAFF_PASSWORD.');
        }

        StaffUser::firstOrCreate(['username' => 'staff'], [
            'name' => 'Demo Organizer', 'password' => $password, 'role' => 'organizer',
        ]);

        StaffUser::firstOrCreate(['username' => 'door'], [
            'name' => 'Demo Door Staff', 'password' => $password, 'role' => 'door_staff',
        ]);

        Event::firstOrCreate(['title' => 'Cebu Dev Meetup 2026'], [
            'description' => 'Meet Cebu developers, share what you are building, and join a short community talk.',
            'venue' => 'Ayala Center Cebu, Function Room 2',
            'starts_at' => today()->addHours(14),
            'ends_at' => today()->setTime(23, 59, 59),
            'capacity' => 30,
            'status' => 'published',
        ]);

        Event::firstOrCreate(['title' => 'Cebu Design Workshop'], [
            'description' => 'A hands-on workshop on turning ideas into simple interface prototypes.',
            'venue' => 'Cebu IT Park, Workshop Room',
            'starts_at' => today()->addDay()->addHours(10),
            'ends_at' => today()->addDay()->addHours(12),
            'capacity' => 30,
            'status' => 'published',
        ]);

        $this->call(FullWorkshopSeeder::class);
    }
}
