<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveProjectPrintingRequest;
use App\Http\Requests\AssignProjectDesignerRequest;
use App\Http\Requests\PublishProjectMontageReviewRequest;
use App\Models\Project;
use App\Models\ProjectStage;
use App\Models\ProjectStageDefinition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ModerationReviewController extends Controller
{
    public function assignDesigner(
        AssignProjectDesignerRequest $request,
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

        if ($project->montage_review_published_at !== null) {
            throw ValidationException::withMessages([
                'project' => 'Клиентская проверка уже опубликована. Передавать проект дизайнеру нельзя.',
            ]);
        }

        $designer = User::query()
            ->whereKey($request->validated('designer_user_id'))
            ->whereHas('roles', fn ($query) => $query
                ->where('name', 'Дизайнер')
                ->where('guard_name', 'web'))
            ->whereNotNull('approved_at')
            ->first();

        if ($designer === null) {
            throw ValidationException::withMessages([
                'designer_user_id' => 'Выберите действующего дизайнера.',
            ]);
        }

        DB::transaction(function () use ($project, $designer): void {
            $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);

            $project->forceFill([
                'designer_user_id' => $designer->id,
            ])->save();

            $montageStage = $project->projectStages()
                ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                ->firstOrFail();

            $montageStage->responsibleUsers()->sync([$designer->id]);
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', "Проект передан дизайнеру {$designer->name}.");
    }

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
                'project' => 'Исполнитель еще не загрузил готовые работы.',
            ]);
        }

        if ($project->designer_user_id === null) {
            throw ValidationException::withMessages([
                'project' => 'Сначала передайте проект дизайнеру и дождитесь завершения дизайна.',
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

        if ($project->designer_user_id === null) {
            throw ValidationException::withMessages([
                'project' => 'Для возврата по правкам должен быть назначен дизайнер.',
            ]);
        }

        $hasFeedback = $project->montageRevisionRequests()->exists();

        if (! $hasFeedback) {
            throw ValidationException::withMessages([
                'project' => 'Клиент не отметил правки. Такой проект можно отправлять в печать.',
            ]);
        }

        DB::transaction(function () use ($project): void {
            $project->advanceToStage(ProjectStageDefinition::SLUG_MONTAGE);

            $montageStage = $project->projectStages()
                ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_MONTAGE))
                ->firstOrFail();

            $montageStage->responsibleUsers()->sync([$project->designer_user_id]);
        });

        return to_route('moderator.projects.show', $project)
            ->with('status', 'Проект возвращен дизайнеру. Замечания клиента переданы на доработку.');
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

        if ($project->designer_user_id === null) {
            throw ValidationException::withMessages([
                'project' => 'Сначала передайте проект дизайнеру и дождитесь готовых виньеток.',
            ]);
        }

        if ($project->montage_review_published_at === null) {
            throw ValidationException::withMessages([
                'project' => 'Сначала отправьте клиенту ссылку на проверку готовых работ.',
            ]);
        }

        if ($project->montage_review_submitted_at === null) {
            throw ValidationException::withMessages([
                'project' => 'Клиент еще не подтвердил готовые работы.',
            ]);
        }

        if ($project->montageRevisionRequests()->exists()) {
            throw ValidationException::withMessages([
                'project' => 'Клиент оставил правки. Верните проект дизайнеру на доработку.',
            ]);
        }

        $printUser = User::query()
            ->whereHas('roles', fn ($query) => $query
                ->where('name', 'Печать')
                ->where('guard_name', 'web'))
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

    public function completePrinting(Project $project): RedirectResponse
    {
        $project->ensureWorkflowState();

        if ($project->currentProjectStage()?->stageDefinition?->slug !== ProjectStageDefinition::SLUG_PRINTING) {
            throw ValidationException::withMessages([
                'project' => 'Проект еще не находится на этапе печати.',
            ]);
        }

        if ($project->printing_ready_at === null) {
            throw ValidationException::withMessages([
                'project' => 'Сначала дождитесь, пока печатник отметит проект как готовый.',
            ]);
        }

        $printingStage = $project->projectStages()
            ->whereHas('stageDefinition', fn ($query) => $query->where('slug', ProjectStageDefinition::SLUG_PRINTING))
            ->firstOrFail();

        if ($printingStage->status !== ProjectStage::STATUS_IN_PROGRESS) {
            throw ValidationException::withMessages([
                'project' => 'Проект уже завершен.',
            ]);
        }

        $printingStage->update([
            'status' => ProjectStage::STATUS_COMPLETED,
            'completed_at' => $printingStage->completed_at ?? now(),
        ]);

        return to_route('moderator.projects.show', $project)
            ->with('status', 'Проект отмечен как готовый. Работа по заказу завершена.');
    }

    private function generateMontageReviewToken(): string
    {
        do {
            $token = Str::random(40);
        } while (Project::query()->where('montage_review_token', $token)->exists());

        return $token;
    }
}
