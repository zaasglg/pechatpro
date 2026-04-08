<?php

namespace App\Models;

use Database\Factories\ProjectClientSelectionSlotFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'name', 'max_likes', 'sort_order'])]
class ProjectClientSelectionSlot extends Model
{
    /** @use HasFactory<ProjectClientSelectionSlotFactory> */
    use HasFactory;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function choices(): HasMany
    {
        return $this->hasMany(ProjectClientSelectionChoice::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'max_likes' => 'integer',
            'sort_order' => 'integer',
        ];
    }
}
