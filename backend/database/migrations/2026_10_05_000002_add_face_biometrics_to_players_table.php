<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store face biometrics centrally so every device (laptop, phone, kiosk)
     * uses the same enrollment instead of per-browser IndexedDB.
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // Array of 128-dim face-api.js descriptors
            $table->json('face_descriptors')->nullable()->after('profile_photo');
            // Frontal enrollment photo (compressed JPEG data URL) used as avatar.
            // Stored in DB because Railway's filesystem is ephemeral.
            $table->longText('face_photo')->nullable()->after('face_descriptors');
            $table->timestamp('face_registered_at')->nullable()->after('face_photo');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['face_descriptors', 'face_photo', 'face_registered_at']);
        });
    }
};
