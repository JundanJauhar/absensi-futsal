<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->unsignedTinyInteger('jersey_number');
            $table->string('profile_photo')->nullable();
            $table->enum('primary_position', ['goalkeeper', 'anchor', 'flank', 'pivot']);
            $table->enum('secondary_position', ['goalkeeper', 'anchor', 'flank', 'pivot'])->nullable();
            $table->date('joined_at');
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('jersey_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
