<?php

namespace App\Models;

use Database\Factories\ProjectClientSelectionSubmissionImageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['project_client_selection_submission_id', 'project_source_image_id'])]
class ProjectClientSelectionSubmissionImage extends Model
{
    /** @use HasFactory<ProjectClientSelectionSubmissionImageFactory> */
    use HasFactory;

    public function submission(): BelongsTo
    {
        return $this->belongsTo(
            ProjectClientSelectionSubmission::class,
            'project_client_selection_submission_id',
        );
    }

    public function sourceImage(): BelongsTo
    {
        return $this->belongsTo(ProjectSourceImage::class, 'project_source_image_id');
    }
}
