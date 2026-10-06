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
            if (!Schema::hasColumn('players', 'class_grade')) {
                $table->string('class_grade', 20)->default('10')->after('jersey_number');
            }
        });

        // Set default class_grade for existing players
        DB::table('players')->whereNull('class_grade')->update(['class_grade' => '10']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            if (Schema::hasColumn('players', 'class_grade')) {
                $table->dropColumn('class_grade');
            }
        });
    }
};
