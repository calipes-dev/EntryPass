<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;

class AuditLog
{
    public static function record(?int $staffId, string $action, string $type, int $id): void
    {
        DB::table('audit_logs')->insert([
            'staff_user_id' => $staffId,
            'action' => $action,
            'target_type' => $type,
            'target_id' => $id,
            'created_at' => now(),
        ]);
    }
}
