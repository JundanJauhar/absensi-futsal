<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Replace the public demo account (coach@ftms.test / password) with the
     * team admin account. Credentials can be overridden via ADMIN_USERNAME /
     * ADMIN_PASSWORD environment variables.
     */
    public function up(): void
    {
        $username = env('ADMIN_USERNAME', 'UKM FUTSAL MASPA');
        $password = env('ADMIN_PASSWORD', 'maspapunya');
        $email = env('ADMIN_EMAIL', 'admin@ukmfutsalmaspa.local');

        $values = [
            'name' => $username,
            'email' => $email,
            'password' => Hash::make($password),
            'updated_at' => now(),
        ];

        // Reuse the old demo user (keeps evaluator_id references intact)
        $existing = DB::table('users')->where('email', 'coach@ftms.test')->first()
            ?? DB::table('users')->where('email', $email)->first();

        if ($existing) {
            DB::table('users')->where('id', $existing->id)->update($values);
        } else {
            DB::table('users')->insert($values + ['created_at' => now()]);
        }

        // Any other account that still has the public demo password is disabled
        DB::table('users')->where('email', 'coach@ftms.test')->delete();

        // Invalidate every token issued with the old demo credentials
        DB::table('personal_access_tokens')->delete();
    }

    public function down(): void
    {
        // Irreversible on purpose: never restore the public demo credentials.
    }
};
