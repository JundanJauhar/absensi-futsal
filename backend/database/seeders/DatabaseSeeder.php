<?php

namespace Database\Seeders;

use App\Models\Player;
use App\Models\User;
use App\Models\TrainingSchedule;
use App\Models\TrainingSession;
use App\Models\Attendance;
use App\Models\PlayerEvaluation;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminEmail = env('ADMIN_EMAIL', 'admin@ukmfutsalmaspa.local');
        User::firstOrCreate(['email' => $adminEmail], [
            'name' => env('ADMIN_USERNAME', 'UKM FUTSAL MASPA'),
            'email' => $adminEmail,
            'password' => env('ADMIN_PASSWORD', 'maspapunya'),
        ]);
    }
}
