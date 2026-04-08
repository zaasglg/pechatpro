<?php

namespace App\Models;

use Database\Factories\ProjectMontageAssetFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'path', 'original_name', 'size_bytes', 'mime_type'])]
class ProjectMontageAsset extends Model
{
    /** @use HasFactory<ProjectMontageAssetFactory> */
    use HasFactory;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function revisionRequests(): HasMany
    {
        return $this->hasMany(ProjectMontageRevisionRequest::class, 'project_montage_asset_id');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }
}
