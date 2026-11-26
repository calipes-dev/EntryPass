<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE registrations ADD COLUMN seat varchar(2) CHECK (seat ~ '^[A-F][1-5]$')");
        DB::statement("CREATE UNIQUE INDEX registrations_active_seat ON registrations(event_id, seat) WHERE status IN ('confirmed','checked_in')");
        DB::statement("WITH numbered AS (
            SELECT r.id, row_number() OVER (PARTITION BY event_id ORDER BY r.id)::int - 1 AS n
            FROM registrations r JOIN events e ON e.id=r.event_id
            WHERE e.capacity=30 AND r.status IN ('confirmed','checked_in')
        ) UPDATE registrations SET seat=chr(65+n/5) || (1+n%5)::text FROM numbered WHERE registrations.id=numbered.id");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE registrations DROP COLUMN seat');
    }
};
