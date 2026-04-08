<?php

namespace App\Models;

use Database\Factories\ProjectStageDefinitionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'sort_order', 'is_active'])]
class ProjectStageDefinition extends Model
{
    public const SLUG_NEW_PROJECT = 'new-project';

    public const SLUG_PHOTOGRAPHER_SHOT = 'photographer-shot';

    public const SLUG_CLIENT_PHOTO_SELECTION = 'client-photo-selection';

    public const SLUG_MONTAGE = 'montage';

    public const SLUG_MODERATION = 'moderation';

    public const SLUG_PRINTING = 'printing';

    /**
     * @var array<int, array{name: string, slug: string, sort_order: int}>
     */
    public const DEFAULT_DEFINITIONS = [
        [
            'name' => 'Новый проект',
            'slug' => self::SLUG_NEW_PROJECT,
            'sort_order' => 1,
        ],
        [
            'name' => 'Фотограф снял',
            'slug' => self::SLUG_PHOTOGRAPHER_SHOT,
            'sort_order' => 2,
        ],
        [
            'name' => 'Выбор фотки от клиента',
            'slug' => self::SLUG_CLIENT_PHOTO_SELECTION,
            'sort_order' => 3,
        ],
        [
            'name' => 'Монтаж',
            'slug' => self::SLUG_MONTAGE,
            'sort_order' => 4,
        ],
        [
            'name' => 'Модерация',
            'slug' => self::SLUG_MODERATION,
            'sort_order' => 5,
        ],
        [
            'name' => 'Печать',
            'slug' => self::SLUG_PRINTING,
            'sort_order' => 6,
        ],
    ];

    /** @use HasFactory<ProjectStageDefinitionFactory> */
    use HasFactory;

    public function projectStages(): HasMany
    {
        return $this->hasMany(ProjectStage::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
