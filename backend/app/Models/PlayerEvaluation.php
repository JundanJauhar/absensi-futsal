<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlayerEvaluation extends Model
{
    protected $fillable = ['player_id', 'evaluator_id', 'evaluated_at', 'notes'];

    protected function casts(): array { return ['evaluated_at' => 'date']; }

    public function player(): BelongsTo { return $this->belongsTo(Player::class); }
    public function evaluator(): BelongsTo { return $this->belongsTo(User::class, 'evaluator_id'); }
    public function skillScores(): HasMany { return $this->hasMany(PlayerSkillScore::class); }
}
