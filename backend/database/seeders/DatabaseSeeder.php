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
        $coach = User::firstOrCreate(['email' => 'coach@ftms.test'], [
            'name' => 'Coach FTMS',
            'email' => 'coach@ftms.test',
            'password' => 'password',
        ]);

        $players = [
            ['full_name' => 'Andi Pratama', 'jersey_number' => 7, 'primary_position' => 'flank'],
            ['full_name' => 'Budi Santoso', 'jersey_number' => 10, 'primary_position' => 'pivot'],
            ['full_name' => 'Candra Wijaya', 'jersey_number' => 1, 'primary_position' => 'goalkeeper'],
            ['full_name' => 'Dimas Saputra', 'jersey_number' => 4, 'primary_position' => 'anchor'],
            ['full_name' => 'Eko Nugroho', 'jersey_number' => 11, 'primary_position' => 'flank'],
            ['full_name' => 'Fajar Hidayat', 'jersey_number' => 8, 'primary_position' => 'anchor'],
            ['full_name' => 'Gilang Ramadhan', 'jersey_number' => 9, 'primary_position' => 'pivot'],
            ['full_name' => 'Hendra Setiawan', 'jersey_number' => 2, 'primary_position' => 'flank'],
            ['full_name' => 'Irfan Maulana', 'jersey_number' => 5, 'primary_position' => 'anchor'],
            ['full_name' => 'Joko Susilo', 'jersey_number' => 12, 'primary_position' => 'goalkeeper'],
            ['full_name' => 'Krisna Aditya', 'jersey_number' => 14, 'primary_position' => 'flank'],
            ['full_name' => 'Lukman Hakim', 'jersey_number' => 6, 'primary_position' => 'pivot'],
            ['full_name' => 'Miko Firmansyah', 'jersey_number' => 15, 'primary_position' => 'anchor'],
            ['full_name' => 'Nanda Kurniawan', 'jersey_number' => 17, 'primary_position' => 'flank'],
            ['full_name' => 'Oki Setiaji', 'jersey_number' => 18, 'primary_position' => 'pivot'],
            ['full_name' => 'Putra Wibowo', 'jersey_number' => 20, 'primary_position' => 'anchor'],
            ['full_name' => 'Raka Prakoso', 'jersey_number' => 21, 'primary_position' => 'flank'],
            ['full_name' => 'Surya Dharma', 'jersey_number' => 22, 'primary_position' => 'pivot'],
        ];

        foreach ($players as $player) {
            Player::updateOrCreate(['jersey_number' => $player['jersey_number']], $player + [
                'joined_at' => now()->subMonths(rand(2, 18))->toDateString(),
                'status' => 'active',
            ]);
        }

        $schedule = TrainingSchedule::create([
            'day_of_week' => 5,
            'default_time' => '16:00',
            'default_location' => 'Pondok Pesantren Sunan Pandanaran',
            'is_active' => true,
        ]);

        $friday = now()->next(\Carbon\Carbon::FRIDAY);
        foreach ([-14, -7, 0, 7, 14] as $offset) {
            $session = TrainingSession::updateOrCreate([
                'training_schedule_id' => $schedule->id,
                'training_date' => $friday->copy()->addDays($offset)->toDateString(),
            ], [
                'start_time' => '16:00',
                'end_time' => '18:00',
                'location' => $schedule->default_location,
                'status' => $offset < 0 ? 'completed' : 'scheduled',
            ]);
            if ($offset < 0) {
                foreach (Player::query()->limit(3)->get() as $player) {
                    Attendance::firstOrCreate(
                        ['training_session_id' => $session->id, 'player_id' => $player->id],
                        ['check_in_at' => $session->training_date->copy()->setTime(15, 55), 'status' => 'present', 'verification_method' => 'manual']
                    );
                }
            }
        }

        $player = Player::first();
        if ($player) {
            $evaluation = PlayerEvaluation::firstOrCreate(
                ['player_id' => $player->id, 'evaluated_at' => now()->toDateString()],
                ['evaluator_id' => $coach->id, 'notes' => 'Contoh evaluasi awal.']
            );
            $evaluation->skillScores()->updateOrCreate(['skill' => 'technical'], ['score' => 7]);
            $evaluation->skillScores()->updateOrCreate(['skill' => 'physical'], ['score' => 8]);
            $evaluation->skillScores()->updateOrCreate(['skill' => 'tactical'], ['score' => 7]);
        }
    }
}
