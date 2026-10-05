<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'full_name',
        'jersey_number',
        'profile_photo',
        'primary_position',
        'secondary_position',
        'joined_at',
        'status',
        'notes',
        'face_descriptors',
        'face_photo',
        'face_registered_at',
    ];

    protected $hidden = ['face_descriptors', 'face_photo'];

    protected function casts(): array
    {
        return [
            'joined_at' => 'date',
            'face_descriptors' => 'array',
            'face_registered_at' => 'datetime',
        ];
    }

    public function hasFaceRegistered(): bool
    {
        return !empty($this->face_descriptors);
    }

    public function attendances(): HasMany { return $this->hasMany(Attendance::class); }
    public function evaluations(): HasMany { return $this->hasMany(PlayerEvaluation::class); }
}
