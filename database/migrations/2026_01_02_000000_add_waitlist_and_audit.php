<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'email']);
            $table->index(['event_id', 'status', 'id']);
        });
        DB::statement("CREATE UNIQUE INDEX registrations_active_email ON registrations (event_id, email) WHERE status <> 'cancelled'");
        DB::table('staff_users')->where('role', 'staff')->update(['role' => 'organizer']);

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_user_id')->nullable()->constrained();
            $table->string('action');
            $table->string('target_type');
            $table->unsignedBigInteger('target_id');
            $table->timestampTz('created_at');
        });
    }

    public function down(): void
    {
        // Preserve live booking history and fail before schema changes if it cannot fit Level 1.
        Schema::table('registrations', function (Blueprint $table) {
            $table->unique(['event_id', 'email']);
            $table->dropIndex(['event_id', 'status', 'id']);
        });
        DB::statement('DROP INDEX registrations_active_email');
        Schema::dropIfExists('audit_logs');
    }
};
