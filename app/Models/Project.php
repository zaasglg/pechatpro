<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

#[Fillable([
    'photographer_id',
    'montage_user_id',
    'designer_user_id',
    'name',
    'class_name',
    'album_type',
    'album_size',
    'cover_type',
    'page_count',
    'portrait_count',
    'student_count',
    'print_quantity',
    'unit_price',
    'total_price',
    'client_selection_token',
    'client_selection_published_at',
    'client_selection_deadline_at',
    'client_selection_submitted_at',
    'montage_review_token',
    'montage_review_published_at',
    'montage_review_submitted_at',
    'montage_review_comment',
    'printing_ready_at',
])]
class Project extends Model
{
    public const CLASS_OPTIONS = [
        'Садик',
        '1 класс',
        '4 класс',
        '9 класс',
        '11 класс',
        'Универ/Колледж',
    ];

    public const ALBUM_TYPES = [
        'Пластик',
        'Журнал',
        'Кожаный',
    ];

    public const ALBUM_SIZES = [
        '20x20',
        '25x25',
        '20x30',
        '30x30',
    ];

    public const COVER_TYPES = [
        'Мягкий',
        'Твердый',
        'Кожаный',
    ];

    /**
     * @var array<string, array<int, string>>
     */
    public const COVER_TYPES_BY_ALBUM_TYPE = [
        'Пластик' => ['Мягкий', 'Твердый'],
        'Журнал' => ['Твердый'],
        'Кожаный' => ['Кожаный'],
    ];

    /**
     * @var array<string, array<int, int>>
     */
    public const PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE = [
        'Журнал' => [20, 30, 50, 100],
        'Пластик' => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        'Кожаный' => [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    ];

    /**
     * @var array<string, string>
     */
    public const PAGE_COUNT_UNITS_BY_ALBUM_TYPE = [
        'Журнал' => 'страниц',
        'Пластик' => 'разворотов',
        'Кожаный' => 'разворотов',
    ];

    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'client_selection_published_at' => 'datetime',
            'client_selection_deadline_at' => 'datetime',
            'client_selection_submitted_at' => 'datetime',
            'montage_review_published_at' => 'datetime',
            'montage_review_submitted_at' => 'datetime',
            'printing_ready_at' => 'datetime',
            'page_count' => 'integer',
            'portrait_count' => 'integer',
            'student_count' => 'integer',
            'print_quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (Project $project): void {
            $project->initializeWorkflow();
        });
    }

    public function photographer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'photographer_id');
    }

    public function montageUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'montage_user_id');
    }

    public function designerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'designer_user_id');
    }

    public function projectStages(): HasMany
    {
        return $this->hasMany(ProjectStage::class);
    }

    public function sourceImages(): HasMany
    {
        return $this->hasMany(ProjectSourceImage::class);
    }

    public function designFiles(): HasMany
    {
        return $this->hasMany(ProjectDesignFile::class)
            ->latest('id');
    }

    public function clientSelectionSlots(): HasMany
    {
        return $this->hasMany(ProjectClientSelectionSlot::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function clientSelectionSubmissions(): HasMany
    {
        return $this->hasMany(ProjectClientSelectionSubmission::class)
            ->latest('submitted_at')
            ->latest('id');
    }

    public function montageAssets(): HasMany
    {
        return $this->hasMany(ProjectMontageAsset::class)
            ->latest('id');
    }

    public function montageRevisionRequests(): HasMany
    {
        return $this->hasMany(ProjectMontageRevisionRequest::class)
            ->latest('id');
    }

    public function createMissingStages(): void
    {
        $existingDefinitionIds = $this->projectStages()
            ->pluck('project_stage_definition_id')
            ->all();

        $stagesToCreate = ProjectStageDefinition::query()
            ->active()
            ->ordered()
            ->get()
            ->reject(fn (ProjectStageDefinition $definition): bool => in_array($definition->id, $existingDefinitionIds, true))
            ->map(fn (ProjectStageDefinition $definition): array => [
                'project_stage_definition_id' => $definition->id,
                'status' => ProjectStage::STATUS_PENDING,
            ])
            ->values()
            ->all();

        if ($stagesToCreate === []) {
            return;
        }

        $this->projectStages()->createMany($stagesToCreate);
    }

    public function initializeWorkflow(): void
    {
        $this->createMissingStages();
        $this->ensureWorkflowState();
    }

    public function clientSelectionDeadlinePassed(): bool
    {
        return $this->client_selection_deadline_at !== null
            && now()->greaterThan($this->client_selection_deadline_at);
    }

    public function ensureWorkflowState(): void
    {
        $orderedStages = $this->orderedProjectStages();

        if ($orderedStages->isEmpty()) {
            return;
        }

        $hasActiveStage = $orderedStages->contains(
            fn (ProjectStage $stage): bool => $stage->status === ProjectStage::STATUS_IN_PROGRESS,
        );

        if ($hasActiveStage) {
            return;
        }

        $firstPendingStage = $orderedStages->first(
            fn (ProjectStage $stage): bool => $stage->status === ProjectStage::STATUS_PENDING,
        );

        if ($firstPendingStage === null) {
            return;
        }

        $firstPendingStage->update([
            'status' => ProjectStage::STATUS_IN_PROGRESS,
            'completed_at' => null,
        ]);
    }

    public function advanceToStage(string $stageDefinitionSlug): void
    {
        $orderedStages = $this->orderedProjectStages();

        $targetStage = $orderedStages->first(
            fn (ProjectStage $stage): bool => $stage->stageDefinition->slug === $stageDefinitionSlug,
        );

        if ($targetStage === null) {
            return;
        }

        $targetOrder = $targetStage->stageDefinition->sort_order;

        foreach ($orderedStages as $stage) {
            $stageOrder = $stage->stageDefinition->sort_order;

            if ($stageOrder < $targetOrder) {
                $desiredStatus = ProjectStage::STATUS_COMPLETED;
                $completedAt = $stage->completed_at ?? now();
            } elseif ($stageOrder === $targetOrder) {
                $desiredStatus = ProjectStage::STATUS_IN_PROGRESS;
                $completedAt = null;
            } else {
                $desiredStatus = ProjectStage::STATUS_PENDING;
                $completedAt = null;
            }

            $currentCompletedAt = $stage->completed_at?->toIso8601String();
            $desiredCompletedAt = $completedAt?->toIso8601String();

            if (
                $stage->status === $desiredStatus
                && $currentCompletedAt === $desiredCompletedAt
            ) {
                continue;
            }

            $stage->update([
                'status' => $desiredStatus,
                'completed_at' => $completedAt,
            ]);
        }
    }

    public function currentProjectStage(): ?ProjectStage
    {
        $orderedStages = $this->orderedProjectStages();

        return $orderedStages->first(
            fn (ProjectStage $stage): bool => $stage->status === ProjectStage::STATUS_IN_PROGRESS,
        ) ?? $orderedStages->first(
            fn (ProjectStage $stage): bool => $stage->status === ProjectStage::STATUS_PENDING,
        ) ?? $orderedStages->last();
    }

    /**
     * @return array<int, string>
     */
    public static function coverTypesForAlbumType(?string $albumType): array
    {
        if (! is_string($albumType)) {
            return [];
        }

        return self::COVER_TYPES_BY_ALBUM_TYPE[$albumType] ?? [];
    }

    /**
     * @return array<int, int>
     */
    public static function pageCountOptionsForAlbumType(?string $albumType): array
    {
        if (! is_string($albumType)) {
            return [];
        }

        return self::PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE[$albumType] ?? [];
    }

    public static function pageCountUnitForAlbumType(?string $albumType): string
    {
        if (! is_string($albumType)) {
            return 'страниц';
        }

        return self::PAGE_COUNT_UNITS_BY_ALBUM_TYPE[$albumType] ?? 'страниц';
    }

    /**
     * @return Collection<int, ProjectStage>
     */
    private function orderedProjectStages(): Collection
    {
        $this->createMissingStages();

        return $this->projectStages()
            ->with('stageDefinition')
            ->get()
            ->sortBy(fn (ProjectStage $stage): int => $stage->stageDefinition->sort_order)
            ->values();
    }
}
