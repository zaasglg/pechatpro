<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
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
     *         totalSourceImages: int,
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
                    'name' => $definition->name,
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
                        'currentStageName' => $currentStage?->stageDefinition?->name,
                        'currentStageSlug' => $currentStage?->stageDefinition?->slug,
                        'updatedAt' => $project->updated_at?->toIso8601String(),
                    ];
                })
                ->values()
                ->all(),
        ];
    }
}
