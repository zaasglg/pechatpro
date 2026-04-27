<?php

namespace App\Models;

use Database\Factories\ProjectClientSelectionSubmissionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'student_name', 'student_quote', 'submitted_at'])]
class ProjectClientSelectionSubmission extends Model
{
    /** @use HasFactory<ProjectClientSelectionSubmissionFactory> */
    use HasFactory;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function submissionImages(): HasMany
    {
        return $this->hasMany(ProjectClientSelectionSubmissionImage::class)
            ->latest('id');
    }

    public function selectedImages(): BelongsToMany
    {
        return $this->belongsToMany(
            ProjectSourceImage::class,
            'project_client_selection_submission_images',
            'project_client_selection_submission_id',
            'project_source_image_id',
        )->withTimestamps();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
        ];
    }
}
