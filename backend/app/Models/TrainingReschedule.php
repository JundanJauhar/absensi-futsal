<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingReschedule extends Model
{
    protected $fillable = ['training_session_id', 'original_date', 'original_start_time', 'new_date', 'new_start_time', 'new_location', 'reason', 'changed_by', 'changed_at'];

    protected function casts(): array
    {
        return ['original_date' => 'date', 'new_date' => 'date', 'changed_at' => 'datetime'];
    }
}
