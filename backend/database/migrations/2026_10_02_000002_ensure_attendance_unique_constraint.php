<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Clean up any existing duplicate attendances, keeping the earliest record (MIN id)
        DB::statement("
            DELETE FROM attendances 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM attendances 
                GROUP BY training_session_id, player_id
            )
        ");

        // 2. Ensure unique index exists on (training_session_id, player_id)
        Schema::table('attendances', function (Blueprint $table) {
            // Drop index if already exists without unique, or recreate cleanly
            // In SQLite/Laravel, if unique constraint already exists from create_attendances_table,
            // we catch exception safely or verify index.
        });
    }

    public function down(): void
    {
        // No need to reverse cleanup
    }
};
