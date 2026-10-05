<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->timestamp('check_in_at')->nullable();
            $table->enum('status', ['present', 'late', 'absent', 'excused'])->default('present');
            $table->enum('verification_method', ['manual', 'face_recognition'])->default('manual');
            $table->decimal('confidence', 5, 4)->nullable();
            $table->timestamps();
            $table->unique(['training_session_id', 'player_id']);
            $table->index(['training_session_id', 'check_in_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
