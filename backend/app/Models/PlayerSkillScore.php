<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerSkillScore extends Model
{
    protected $fillable = ['player_evaluation_id', 'skill', 'score', 'comment'];
    public function evaluation(): BelongsTo { return $this->belongsTo(PlayerEvaluation::class, 'player_evaluation_id'); }
}
