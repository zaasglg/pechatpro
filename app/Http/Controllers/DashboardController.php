<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use App\Support\ProjectPricingCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * User-facing stage labels for analytics and summaries.
     *
     * @var array<string, string>
     */
    private const STAGE_DISPLAY_NAMES = [
        ProjectStageDefinition::SLUG_NEW_PROJECT => 'Подготовка проекта',
        ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT => 'Съёмка и загрузка исходников',
        ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION => 'Выбор фото клиентом',
        ProjectStageDefinition::SLUG_MONTAGE => 'Дизайн и монтаж',
        ProjectStageDefinition::SLUG_MODERATION => 'Проверка и согласование',
        ProjectStageDefinition::SLUG_PRINTING => 'Печать и выдача',
    ];

    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return Inertia::render('dashboard', [
            'dashboard' => $this->dashboardData($user),
        ]);
    }

    /**
     * @return array{role: string, photographer?: array<string, mixed>}
     */
    private function dashboardData(User $user): array
    {
        if ($user->hasRole('Админ')) {
            return [
                'role' => 'admin',
                'admin' => $this->adminDashboardData(),
            ];
        }

        if ($user->hasRole('Модератор')) {
            return [
                'role' => 'moderator',
                'moderator' => $this->moderatorDashboardData(),
            ];
        }

        if ($user->hasRole('Монтажер') || $user->hasRole('Дизайнер')) {
            return [
                'role' => 'montage',
                'montage' => $this->montageDashboardData($user),
            ];
        }

        if ($user->hasRole('Печать')) {
            return [
                'role' => 'print',
                'print' => $this->printDashboardData($user),
            ];
        }

        if ($user->hasRole('Фотограф')) {
            return [
                'role' => 'photographer',
                'photographer' => $this->photographerDashboardData($user),
            ];
        }

        return [
            'role' => 'default',
        ];
    }

    /**
     * @return array{
     *     stats: array{
     *         totalProjects: int,
     *         activePhotographers: int,
     *         pendingPhotographers: int,
     *         totalCities: int,
     *         priceRulesCount: int
     *     },
     *     recentProjects: array<int, array{
     *         id: int,
     *         name: string,
     *         className: string,
     *         photographerName: string|null,
     *         currentStageName: string|null,
     *         updatedAt: string|null
     *     }>
     * }
     */
    private function adminDashboardData(): array
    {
        $recentProjects = Project::query()
            ->with([
                'photographer:id,name',
                'projectStages.stageDefinition',
            ])
            ->latest('id')
            ->take(5)
            ->get();

        $recentProjects->each->ensureWorkflowState();

        return [
            'stats' => [
                'totalProjects' => Project::query()->count(),
                'activePhotographers' => User::query()->role('Фотограф')->whereNotNull('approved_at')->count(),
                'pendingPhotographers' => User::query()->role('Фотограф')->whereNull('approved_at')->count(),
                'totalCities' => City::query()->count(),
                'priceRulesCount' => app(ProjectPricingCalculator::class)->ruleCount(),
            ],
            'recentProjects' => $recentProjects
                ->map(function (Project $project): array {
                    $currentStage = $project->currentProjectStage();

                    return [
                        'id' => $project->id,
                        'name' => $project->name,
                        'className' => $project->class_name,
                        'photographerName' => $project->photographer?->name,
                        'currentStageName' => $currentStage?->stageDefinition !== null
                            ? $this->dashboardStageName($currentStage->stageDefinition->slug, $currentStage->stageDefinition->name)
                            : null,
                        'updatedAt' => $project->updated_at?->toIso8601String(),
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{
     *     stats: array{
     *         photographersWithProjects: int,
     *         waitingForSelectionSetup: int,
     *         waitingForClientChoice: int,
     *         waitingForModerationDecision: int,
     *         readyForPrint: int
     *     },
     *     recentProjects: array<int, array{
     *         id: int,
     *         name: string,
     *         className: string,
     *         photographerName: string|null,
     *         currentStageName: string|null,
     *         needsModeratorAction: bool
     *     }>
     * }
     */
    private function moderatorDashboardData(): array
    {
        $projects = Project::query()
            ->with([
                'photographer:id,name',
                'projectStages.stageDefinition',
            ])
            ->withCount([
                'clientSelectionSubmissions',
                'montageAssets',
                'montageRevisionRequests',
            ])
            ->latest('id')
            ->get();

        $projects->each->ensureWorkflowState();

        $projectsWithCurrentStage = $projects->map(function (Project $project): array {
            $currentStage = $project->currentProjectStage();
            $currentStageSlug = $currentStage?->stageDefinition?->slug;

            $readyForPrint = $currentStageSlug === ProjectStageDefinition::SLUG_MODERATION
                && $project->montage_assets_count > 0
                && $project->montage_revision_requests_count === 0
                && (
                    $project->montage_review_published_at === null
                    || $project->montage_review_submitted_at !== null
                );

            $needsModeratorAction = ($currentStageSlug === ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION
                && $project->client_selection_submissions_count > 0)
                || $readyForPrint;

            return [
                'project' => $project,
                'currentStage' => $currentStage,
                'currentStageSlug' => $currentStageSlug,
                'readyForPrint' => $readyForPrint,
                'needsModeratorAction' => $needsModeratorAction,
            ];
        });

        return [
            'stats' => [
                'photographersWithProjects' => $projects->pluck('photographer_id')->filter()->unique()->count(),
                'waitingForSelectionSetup' => $projectsWithCurrentStage
                    ->where('currentStageSlug', ProjectStageDefinition::SLUG_PHOTOGRAPHER_SHOT)
                    ->count(),
                'waitingForClientChoice' => $projectsWithCurrentStage
                    ->filter(fn (array $item): bool => $item['currentStageSlug'] === ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION
                        && $item['project']->client_selection_submissions_count === 0)
                    ->count(),
                'waitingForModerationDecision' => $projectsWithCurrentStage
                    ->filter(fn (array $item): bool => $item['needsModeratorAction'])
                    ->count(),
                'readyForPrint' => $projectsWithCurrentStage
                    ->filter(fn (array $item): bool => $item['readyForPrint'])
                    ->count(),
            ],
            'recentProjects' => $projectsWithCurrentStage
                ->take(5)
                ->map(function (array $item): array {
                    /** @var Project $project */
                    $project = $item['project'];
                    /** @var ProjectStage|null $currentStage */
                    $currentStage = $item['currentStage'];

                    return [
                        'id' => $project->id,
                        'name' => $project->name,
                        'className' => $project->class_name,
                        'photographerName' => $project->photographer?->name,
                        'currentStageName' => $currentStage?->stageDefinition !== null
                            ? $this->dashboardStageName($currentStage->stageDefinition->slug, $currentStage->stageDefinition->name)
                            : null,
                        'needsModeratorAction' => $item['needsModeratorAction'],
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{
     *     stats: array{
     *         assignedProjects: int,
     *         activeMontage: int,
     *         withRevisionNotes: int,
     *         waitingModeratorReview: int,
     *         uploadedWorks: int
     *     },
     *     assignedProjectsList: array<int, array{
     *         id: int,
     *         name: string,
     *         className: string,
     *         photographerName: string|null,
     *         currentStageName: string|null,
     *         montageAssetsCount: int,
     *         requestedForRevision: bool
     *     }>
     * }
     */
    private function montageDashboardData(User $user): array
    {
        $projects = Project::query()
            ->with([
                'photographer:id,name',
                'projectStages.stageDefinition',
            ])
            ->withCount([
                'montageAssets',
                'montageRevisionRequests',
            ])
            ->whereHas('projectStages', function ($query) use ($user): void {
                $query
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($user->id));
            })
            ->latest('id')
            ->get();

        $projects->each->ensureWorkflowState();

        $projectsWithCurrentStage = $projects->map(function (Project $project): array {
            $currentStage = $project->currentProjectStage();

            return [
                'project' => $project,
                'currentStage' => $currentStage,
                'currentStageSlug' => $currentStage?->stageDefinition?->slug,
                'requestedForRevision' => $project->montage_revision_requests_count > 0,
            ];
        });

        return [
            'stats' => [
                'assignedProjects' => $projects->count(),
                'activeMontage' => $projectsWithCurrentStage
                    ->where('currentStageSlug', ProjectStageDefinition::SLUG_MONTAGE)
                    ->count(),
                'withRevisionNotes' => $projectsWithCurrentStage
                    ->filter(fn (array $item): bool => $item['requestedForRevision'])
                    ->count(),
                'waitingModeratorReview' => $projectsWithCurrentStage
                    ->where('currentStageSlug', ProjectStageDefinition::SLUG_MODERATION)
                    ->count(),
                'uploadedWorks' => (int) $projects->sum('montage_assets_count'),
            ],
            'assignedProjectsList' => $projectsWithCurrentStage
                ->take(5)
                ->map(function (array $item): array {
                    /** @var Project $project */
                    $project = $item['project'];
                    /** @var ProjectStage|null $currentStage */
                    $currentStage = $item['currentStage'];

                    return [
                        'id' => $project->id,
                        'name' => $project->name,
                        'className' => $project->class_name,
                        'photographerName' => $project->photographer?->name,
                        'currentStageName' => $currentStage?->stageDefinition !== null
                            ? $this->dashboardStageName($currentStage->stageDefinition->slug, $currentStage->stageDefinition->name)
                            : null,
                        'montageAssetsCount' => $project->montage_assets_count,
                        'requestedForRevision' => $item['requestedForRevision'],
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{
     *     stats: array{
     *         assignedProjects: int,
     *         waitingForPrint: int,
     *         completedPrints: int,
     *         readyWorks: int
     *     },
     *     assignedProjectsList: array<int, array{
     *         id: int,
     *         name: string,
     *         className: string,
     *         photographerName: string|null,
     *         printingReadyAt: string|null,
     *         readyWorksCount: int
     *     }>
     * }
     */
    private function printDashboardData(User $user): array
    {
        $projects = Project::query()
            ->with([
                'photographer:id,name',
                'projectStages.stageDefinition',
            ])
            ->withCount('montageAssets')
            ->whereHas('projectStages', function ($query) use ($user): void {
                $query
                    ->whereHas('stageDefinition', fn ($stageQuery) => $stageQuery->where('slug', ProjectStageDefinition::SLUG_PRINTING))
                    ->whereHas('responsibleUsers', fn ($userQuery) => $userQuery->whereKey($user->id));
            })
            ->latest('id')
            ->get();

        $projects->each->ensureWorkflowState();

        return [
            'stats' => [
                'assignedProjects' => $projects->count(),
                'waitingForPrint' => $projects
                    ->filter(fn (Project $project): bool => $project->currentProjectStage()?->stageDefinition?->slug === ProjectStageDefinition::SLUG_PRINTING
                        && $project->printing_ready_at === null)
                    ->count(),
                'completedPrints' => $projects
                    ->filter(fn (Project $project): bool => $project->printing_ready_at !== null)
                    ->count(),
                'readyWorks' => (int) $projects->sum('montage_assets_count'),
            ],
            'assignedProjectsList' => $projects
                ->take(5)
                ->map(fn (Project $project): array => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'className' => $project->class_name,
                    'photographerName' => $project->photographer?->name,
                    'printingReadyAt' => $project->printing_ready_at?->toIso8601String(),
                    'readyWorksCount' => $project->montage_assets_count,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array{
     *     stats: array{
     *         totalProjects: int,
     *         totalSourceImages: int,
     *         totalSourceImagesSize: int,
     *         needsSourceUploads: int,
     *         waitingForClient: int,
     *         inProduction: int
     *     },
     *     stageBreakdown: array<int, array{name: string, slug: string, count: int}>,
     *     recentProjects: array<int, array{
     *         id: int,
     *         name: string,
     *         className: string,
     *         sourceImagesCount: int,
     *         currentStageName: string|null,
     *         currentStageSlug: string|null,
     *         updatedAt: string|null
     *     }>
     * }
     */
    private function photographerDashboardData(User $user): array
    {
        $projects = $user->projects()
            ->withCount('sourceImages')
            ->withSum('sourceImages', 'size_bytes')
            ->with('projectStages.stageDefinition')
            ->latest('id')
            ->get();

        $projects->each->ensureWorkflowState();

        $projectsWithCurrentStage = $projects->map(function (Project $project): array {
            $currentStage = $project->currentProjectStage();

            return [
                'project' => $project,
                'currentStage' => $currentStage,
                'currentStageSlug' => $currentStage?->stageDefinition?->slug,
            ];
        });

        return [
            'stats' => [
                'totalProjects' => $projects->count(),
                'totalSourceImages' => (int) $projects->sum('source_images_count'),
                'totalSourceImagesSize' => (int) $projects->sum('source_images_sum_size_bytes'),
                'needsSourceUploads' => $projectsWithCurrentStage
                    ->where('currentStageSlug', ProjectStageDefinition::SLUG_NEW_PROJECT)
                    ->count(),
                'waitingForClient' => $projectsWithCurrentStage
                    ->where('currentStageSlug', ProjectStageDefinition::SLUG_CLIENT_PHOTO_SELECTION)
                    ->count(),
                'inProduction' => $projectsWithCurrentStage
                    ->filter(fn (array $item): bool => in_array($item['currentStageSlug'], [
                        ProjectStageDefinition::SLUG_MONTAGE,
                        ProjectStageDefinition::SLUG_MODERATION,
                        ProjectStageDefinition::SLUG_PRINTING,
                    ], true))
                    ->count(),
            ],
            'stageBreakdown' => ProjectStageDefinition::query()
                ->active()
                ->ordered()
                ->get()
                ->map(fn (ProjectStageDefinition $definition): array => [
                    'name' => $this->dashboardStageName($definition->slug, $definition->name),
                    'slug' => $definition->slug,
                    'count' => $projectsWithCurrentStage
                        ->where('currentStageSlug', $definition->slug)
                        ->count(),
                ])
                ->all(),
            'recentProjects' => $projectsWithCurrentStage
                ->take(5)
                ->map(function (array $item): array {
                    /** @var Project $project */
                    $project = $item['project'];
                    /** @var ProjectStage|null $currentStage */
                    $currentStage = $item['currentStage'];

                    return [
                        'id' => $project->id,
                        'name' => $project->name,
                        'className' => $project->class_name,
                        'sourceImagesCount' => $project->source_images_count,
                        'currentStageName' => $currentStage?->stageDefinition !== null
                            ? $this->dashboardStageName($currentStage->stageDefinition->slug, $currentStage->stageDefinition->name)
                            : null,
                        'currentStageSlug' => $currentStage?->stageDefinition?->slug,
                        'updatedAt' => $project->updated_at?->toIso8601String(),
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    private function dashboardStageName(string $slug, string $fallback): string
    {
        return self::STAGE_DISPLAY_NAMES[$slug] ?? $fallback;
    }
}
