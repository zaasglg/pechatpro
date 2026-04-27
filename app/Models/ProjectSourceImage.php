<?php

namespace App\Models;

use Database\Factories\ProjectSourceImageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'path', 'original_name', 'client_name', 'client_quote', 'size_bytes', 'mime_type'])]
class ProjectSourceImage extends Model
{
    /** @use HasFactory<ProjectSourceImageFactory> */
    use HasFactory;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function clientSelectionChoices(): HasMany
    {
        return $this->hasMany(ProjectClientSelectionChoice::class);
    }

    public function clientSelectionSubmissionImages(): HasMany
    {
        return $this->hasMany(ProjectClientSelectionSubmissionImage::class);
    }

    public function clientSelectionSubmissions(): BelongsToMany
    {
        return $this->belongsToMany(
            ProjectClientSelectionSubmission::class,
            'project_client_selection_submission_images',
            'project_source_image_id',
            'project_client_selection_submission_id',
        )->withTimestamps();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }
}
