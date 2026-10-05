<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = ['training_session_id', 'player_id', 'check_in_at', 'status', 'verification_method', 'confidence'];

    protected function casts(): array
    {
        return ['check_in_at' => 'datetime', 'confidence' => 'decimal:4'];
    }

    public function player(): BelongsTo { return $this->belongsTo(Player::class); }
    public function trainingSession(): BelongsTo { return $this->belongsTo(TrainingSession::class); }
}
