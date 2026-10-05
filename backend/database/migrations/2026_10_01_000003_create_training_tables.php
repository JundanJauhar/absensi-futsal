<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('default_time');
            $table->string('default_location');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('training_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_schedule_id')->nullable()->constrained()->nullOnDelete();
            $table->date('training_date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->string('location');
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->timestamps();
        });

        Schema::create('training_reschedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_session_id')->constrained()->cascadeOnDelete();
            $table->date('original_date');
            $table->time('original_start_time');
            $table->date('new_date');
            $table->time('new_start_time');
            $table->string('new_location')->nullable();
            $table->text('reason');
            $table->foreignId('changed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('changed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_reschedules');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('training_schedules');
    }
};
