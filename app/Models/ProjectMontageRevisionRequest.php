<?php

namespace App\Models;

use Database\Factories\ProjectMontageRevisionRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['project_id', 'project_montage_asset_id', 'comment'])]
class ProjectMontageRevisionRequest extends Model
{
    /** @use HasFactory<ProjectMontageRevisionRequestFactory> */
    use HasFactory;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function montageAsset(): BelongsTo
    {
        return $this->belongsTo(ProjectMontageAsset::class, 'project_montage_asset_id');
    }
}
