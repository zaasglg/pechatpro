<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveProjectPrintingRequest;
use App\Http\Requests\PublishProjectMontageReviewRequest;
use App\Models\Project;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ModerationReviewController extends Controller
{
    public function publishClientReview(
        PublishProjectMontageReviewRequest $request,
        Project $project,
    ): RedirectResponse {
        $project->ensureWorkflowState();

        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_MODERATION) {
            throw ValidationException::withMessages([
                'project' => 'Проект еще не находится на этапе модерации.',
            ]);
        }

        if (! $project->montageAssets()->exists()) {
            throw ValidationException::withMessages([
                'project' => 'Монтажер еще не загрузил готовые работы.',
            ]);
        }

        DB::transaction(function () use ($project): void {
            if (blank($project->montage_review_token)) {
                $project->forceFill([
                    'montage_review_token' => $this->generateMontageReviewToken(),
                ])->save();
            }

            $project->montageRevisionRequests()->delete();

            $project->forceFill([
                'montage_review_published_at' => now(),
                'montage_review_submitted_at' => null,
                'montage_review_comment' => null,
            ])->save();
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', 'Ссылка на готовые работы опубликована для клиента.');
    }

    public function sendBackToMontage(Project $project): RedirectResponse
    {
        $project->ensureWorkflowState();

        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_MODERATION) {
            throw ValidationException::withMessages([
                'project' => 'Проект еще не находится на этапе модерации.',
            ]);
        }

        if ($project->montage_review_submitted_at === null) {
            throw ValidationException::withMessages([
                'project' => 'Клиент еще не отправил замечания.',
            ]);
        }

        $hasFeedback = $project->montageRevisionRequests()->exists();

        if (! $hasFeedback) {
            throw ValidationException::withMessages([
                'project' => 'Клиент не отметил правки. Такой проект можно отправлять в печать.',
            ]);
        }

        $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);

        return to_route('moderator.projects.show', $project)
            ->with('status', 'Проект возвращен на монтаж. Замечания клиента переданы монтажёру.');
    }

    public function approve(
        ApproveProjectPrintingRequest $request,
        Project $project,
    ): RedirectResponse {
        $project->ensureWorkflowState();

        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_MODERATION) {
            throw ValidationException::withMessages([
                'project' => 'Проект еще не находится на этапе модерации.',
            ]);
        }

        if (! $project->montageAssets()->exists()) {
            throw ValidationException::withMessages([
                'project' => 'Монтажер еще не загрузил готовые работы.',
            ]);
        }

        $printUser = User::query()
            ->role('Печать')
            ->whereNotNull('approved_at')
            ->findOrFail($request->validated('print_user_id'));

        DB::transaction(function () use ($project, $printUser): void {
            $project->advanceToStage(ProjectStageDefinition::SLUG_PRINTING);

            $printingStage = $project->projectStages()
                ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
                ->firstOrFail();

            $printingStage->responsibleUsers()->sync([$printUser->id]);

            $project->forceFill([
                'printing_ready_at' => null,
            ])->save();
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', "Модерация подтверждена. Проект переведен на этап «Печать», назначен {$printUser->name}.");
    }

    private function generateMontageReviewToken(): string
    {
        do {
            $token = Str::random(40);
        } while (Project::query()->where('montage_review_token', $token)->exists());

        return $token;
    }
}
