<?php

namespace Database\Factories;

use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlayerFactory extends Factory
{
    protected $model = Player::class;

    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'jersey_number' => fake()->unique()->numberBetween(0, 99),
            'primary_position' => fake()->randomElement(['goalkeeper', 'anchor', 'flank', 'pivot']),
            'joined_at' => fake()->date(),
            'status' => 'active',
        ];
    }
}
