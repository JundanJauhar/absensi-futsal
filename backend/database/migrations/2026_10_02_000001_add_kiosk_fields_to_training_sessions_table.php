<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('training_sessions', function (Blueprint $table) {
            $table->string('title')->nullable()->after('training_schedule_id');
            $table->string('status')->default('scheduled')->change();
            $table->timestamp('attendance_open_at')->nullable()->after('status');
            $table->timestamp('attendance_close_at')->nullable()->after('attendance_open_at');
        });
    }

    public function down(): void
    {
        Schema::table('training_sessions', function (Blueprint $table) {
            $table->dropColumn(['title', 'attendance_open_at', 'attendance_close_at']);
        });
    }
};
