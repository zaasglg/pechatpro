<?php

namespace App\Models;

use Database\Factories\ProjectDesignFileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'project_id',
    'path',
    'original_name',
    'size_bytes',
    'mime_type',
])]
class ProjectDesignFile extends Model
{
    /** @use HasFactory<ProjectDesignFileFactory> */
    use HasFactory;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
