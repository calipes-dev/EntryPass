<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('staff_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username')->unique();
            $table->string('password');
            $table->string('role')->default('staff');
            $table->timestampsTz();
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->string('venue');
            $table->timestampTz('starts_at');
            $table->timestampTz('ends_at');
            $table->unsignedInteger('capacity');
            $table->string('status')->default('published');
            $table->timestampsTz();
        });

        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained();
            $table->string('full_name');
            $table->string('email');
            $table->string('mobile', 11);
            $table->string('ticket_code', 35)->unique();
            $table->string('status')->default('confirmed');
            $table->timestampTz('registered_at');
            $table->timestampTz('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('staff_users');
            $table->unique(['event_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registrations');
        Schema::dropIfExists('events');
        Schema::dropIfExists('staff_users');
    }
};
