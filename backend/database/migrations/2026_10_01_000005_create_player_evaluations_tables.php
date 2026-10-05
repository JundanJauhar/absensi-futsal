<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('player_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('evaluated_at');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['player_id', 'evaluated_at']);
        });

        Schema::create('player_skill_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_evaluation_id')->constrained()->cascadeOnDelete();
            $table->string('skill');
            $table->unsignedTinyInteger('score');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique(['player_evaluation_id', 'skill']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_skill_scores');
        Schema::dropIfExists('player_evaluations');
    }
};
