<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_status_check');
            DB::statement("ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_status_check CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'))");

            return;
        }

        Schema::table('training_sessions', function (Blueprint $table) {
            $table->string('status')->default('scheduled')->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_status_check');
            DB::statement("ALTER TABLE training_sessions ADD CONSTRAINT training_sessions_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'))");
        }
    }
};
