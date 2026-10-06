<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            if (!Schema::hasColumn('players', 'primary_kick')) {
                $table->string('primary_kick', 20)->default('right')->after('primary_position');
            }
        });

        // Set default value for any existing players
        DB::table('players')->whereNull('primary_kick')->update(['primary_kick' => 'right']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            if (Schema::hasColumn('players', 'primary_kick')) {
                $table->dropColumn('primary_kick');
            }
        });
    }
};
