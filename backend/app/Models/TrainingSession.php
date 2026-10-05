<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingSession extends Model
{
    protected $fillable = [
        'title',
        'training_schedule_id',
        'training_date',
        'start_time',
        'end_time',
        'location',
        'status',
        'attendance_open_at',
        'attendance_close_at',
    ];

    protected function casts(): array
    {
        return [
            'training_date' => 'date',
            'attendance_open_at' => 'datetime',
            'attendance_close_at' => 'datetime',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(TrainingSchedule::class, 'training_schedule_id');
    }

    public function reschedules(): HasMany
    {
        return $this->hasMany(TrainingReschedule::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Get computed start datetime
     */
    public function getStartDateTimeAttribute(): \Carbon\Carbon
    {
        $dateStr = $this->training_date ? $this->training_date->toDateString() : now()->toDateString();
        return \Carbon\Carbon::parse("{$dateStr} {$this->start_time}");
    }

    /**
     * Get computed end datetime
     */
    public function getEndDateTimeAttribute(): \Carbon\Carbon
    {
        $dateStr = $this->training_date ? $this->training_date->toDateString() : now()->toDateString();
        return \Carbon\Carbon::parse("{$dateStr} {$this->end_time}");
    }

    /**
     * Effective attendance window open timestamp
     */
    public function getEffectiveOpenAtAttribute(): \Carbon\Carbon
    {
        if ($this->attendance_open_at) {
            return $this->attendance_open_at;
        }
        // Default: 30 minutes before training starts
        return $this->start_date_time->copy()->subMinutes(30);
    }

    /**
     * Effective attendance window close timestamp
     */
    public function getEffectiveCloseAtAttribute(): \Carbon\Carbon
    {
        if ($this->attendance_close_at) {
            return $this->attendance_close_at;
        }
        // Default: 30 minutes after training ends
        return $this->end_date_time->copy()->addMinutes(30);
    }

    /**
     * Compute current attendance state
     */
    public function getAttendanceStateAttribute(): string
    {
        if (in_array($this->status, ['completed', 'cancelled'])) {
            return 'ATTENDANCE_CLOSED';
        }

        if ($this->status === 'active') {
            return 'ACTIVE_ATTENDANCE';
        }

        $now = now();
        $openAt = $this->effective_open_at;
        $closeAt = $this->effective_close_at;

        if ($now->lt($openAt)) {
            return 'UPCOMING_SESSION';
        }

        if ($now->between($openAt, $closeAt)) {
            return 'ACTIVE_ATTENDANCE';
        }

        return 'ATTENDANCE_CLOSED';
    }

    /**
     * Check if attendance is currently allowed
     */
    public function isAttendanceOpen(): bool
    {
        return $this->attendance_state === 'ACTIVE_ATTENDANCE';
    }
}
