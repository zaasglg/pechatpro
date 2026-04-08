<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PhotographerProjectController extends Controller
{
    /**
     * User-friendly stage labels for the photographer timeline.
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

    /**
     * Display the photographer's project list.
     */
    public function index(Request $request): Response
    {
        $projects = $request->user()
            ->projects()
            ->latest()
            ->get()
            ->map(fn (Project $project): array => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
                'pageCount' => $project->page_count,
                'studentCount' => $project->student_count,
                'printQuantity' => $project->print_quantity,
                'createdAt' => $project->created_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Show the create project page for photographers.
     */
    public function create(): Response
    {
        return Inertia::render('projects/create', [
            'classOptions' => Project::CLASS_OPTIONS,
            'albumTypes' => Project::ALBUM_TYPES,
            'albumSizes' => Project::ALBUM_SIZES,
            'coverTypesByAlbumType' => Project::COVER_TYPES_BY_ALBUM_TYPE,
            'pageCountOptionsByAlbumType' => Project::PAGE_COUNT_OPTIONS_BY_ALBUM_TYPE,
            'pageCountUnitsByAlbumType' => Project::PAGE_COUNT_UNITS_BY_ALBUM_TYPE,
        ]);
    }

    /**
     * Display the selected photographer project.
     */
    public function show(Request $request, Project $project): Response
    {
        $project = $request->user()
            ->projects()
            ->whereKey($project->getKey())
            ->firstOrFail();

        $project->ensureWorkflowState();
        $project->load([
            'projectStages.stageDefinition',
            'projectStages.responsibleUsers:id,name',
        ]);

        return Inertia::render('projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'albumType' => $project->album_type,
                'albumSize' => $project->album_size,
                'coverType' => $project->cover_type,
                'pageCount' => $project->page_count,
                'studentCount' => $project->student_count,
                'printQuantity' => $project->print_quantity,
                'createdAt' => $project->created_at?->toIso8601String(),
                'updatedAt' => $project->updated_at?->toIso8601String(),
            ],
            'stages' => $project->projectStages
                ->sortBy(fn (ProjectStage $stage): int => $stage->stageDefinition->sort_order)
                ->values()
                ->map(fn (ProjectStage $stage): array => [
                    'id' => $stage->id,
                    'name' => $stage->stageDefinition->name,
                    'displayName' => self::STAGE_DISPLAY_NAMES[$stage->stageDefinition->slug]
                        ?? $stage->stageDefinition->name,
                    'slug' => $stage->stageDefinition->slug,
                    'status' => $stage->status,
                    'assignedUsers' => $stage->responsibleUsers
                        ->map(fn (User $user): array => [
                            'id' => $user->id,
                            'name' => $user->name,
                        ])
                        ->values()
                        ->all(),
                ])
                ->all(),
        ]);
    }

    /**
     * Store a newly created photographer project.
     */
    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $project = $request->user()->projects()->create($request->validated());

        return to_route('projects.index')
            ->with('status', "Проект {$project->name} создан.");
    }

    /**
     * Remove the selected photographer project.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $project = $request->user()
            ->projects()
            ->whereKey($project->getKey())
            ->firstOrFail();

        $projectName = $project->name;
        $sourceImagePaths = $project->sourceImages()
            ->pluck('path')
            ->filter()
            ->all();
        $montageAssetPaths = $project->montageAssets()
            ->pluck('path')
            ->filter()
            ->all();

        $project->delete();

        $pathsToDelete = array_values(array_unique([
            ...$sourceImagePaths,
            ...$montageAssetPaths,
        ]));

        if ($pathsToDelete !== []) {
            Storage::disk('public')->delete($pathsToDelete);
        }

        return to_route('projects.index')
            ->with('status', "Проект {$projectName} удален.");
    }
}
