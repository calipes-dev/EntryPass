<?php

use Database\Seeders\FullWorkshopSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        if (app()->environment('local', 'testing')) (new FullWorkshopSeeder)->run();
    }

    public function down(): void {}
};
