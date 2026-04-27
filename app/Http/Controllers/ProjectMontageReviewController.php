<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubmitProjectMontageReviewRequest;
use App\Http\Requests\UpdateProjectMontageReviewRequest;
use App\Models\Project;
use App\Models\ProjectMontageAsset;
use App\Models\ProjectMontageRevisionRequest;
use App\Support\ProjectMontageAssetPreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectMontageReviewController extends Controller
{
    public function __construct(private ProjectMontageAssetPreviewGenerator $previewGenerator) {}

    public function show(string $token): Response
    {
        $project = $this->resolveProjectByToken($token);
        $revisionRequests = $project->montageRevisionRequests
            ->keyBy('project_montage_asset_id');

        $visibleAssets = $project->designer_user_id !== null
            ? $project->montageAssets
                ->where('uploaded_by_user_id', $project->designer_user_id)
                ->values()
            : $project->montageAssets;

        return Inertia::render('client/montage-reviews/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'token' => $project->montage_review_token,
                'reviewSubmittedAt' => $project->montage_review_submitted_at?->toIso8601String(),
            ],
            'images' => $visibleAssets
                ->map(function (ProjectMontageAsset $asset) use ($revisionRequests): array {
                    $revisionRequest = $revisionRequests->get($asset->id);
                    $previewPath = $this->previewGenerator->resolvePreviewPath($asset);

                    return [
                        'id' => $asset->id,
                        'name' => $asset->original_name,
                        'url' => PublicStorageUrl::make($asset->path),
                        'previewUrl' => $previewPath !== null
                            ? PublicStorageUrl::make($previewPath)
                            : null,
                        'mimeType' => $asset->mime_type,
                        'sizeBytes' => $asset->size_bytes,
                        'selectedForRevision' => $revisionRequest !== null,
                        'comment' => $revisionRequest?->comment,
                    ];
                })
                ->values()
                ->all(),
            'status' => session('status'),
        ]);
    }

    public function toggleSelection(
        UpdateProjectMontageReviewRequest $request,
        string $token,
    ): RedirectResponse {
        $project = $this->resolveProjectByToken($token);
        $validated = $request->validated();

        if ($project->montage_review_submitted_at !== null) {
            throw ValidationException::withMessages([
                'asset_id' => 'Замечания уже отправлены модератору. Изменения больше недоступны.',
            ]);
        }

        $asset = $project->montageAssets()
            ->whereKey($validated['asset_id'])
            ->firstOrFail();

        $existingRequest = $project->montageRevisionRequests()
            ->where('project_montage_asset_id', $asset->id)
            ->first();

        if ($existingRequest !== null) {
            $existingRequest->delete();

            return back()->with('status', 'Список правок обновлён.');
        }

        ProjectMontageRevisionRequest::query()->create([
            'project_id' => $project->id,
            'project_montage_asset_id' => $asset->id,
        ]);

        return back()->with('status', 'Работа отмечена для правки.');
    }

    public function submit(
        SubmitProjectMontageReviewRequest $request,
        string $token,
    ): RedirectResponse {
        $project = $this->resolveProjectByToken($token);
        $validated = $request->validated();

        if ($project->montage_review_submitted_at !== null) {
            return to_route('client.montage-reviews.show', ['token' => $project->montage_review_token])
                ->with('status', 'Вы уже отправили замечания модератору.');
        }

        $comments = collect($validated['comments'] ?? [])
            ->mapWithKeys(fn (mixed $comment, mixed $assetId): array => [
                (string) $assetId => trim((string) $comment),
            ]);
        $hasRevisionRequests = $project->montageRevisionRequests()->exists();

        DB::transaction(function () use ($project, $comments): void {
            $project->montageRevisionRequests()
                ->get()
                ->each(function (ProjectMontageRevisionRequest $revisionRequest) use ($comments): void {
                    $comment = $comments->get((string) $revisionRequest->project_montage_asset_id);

                    $revisionRequest->update([
                        'comment' => filled($comment) ? $comment : null,
                    ]);
                });

            $project->forceFill([
                'montage_review_comment' => null,
                'montage_review_submitted_at' => now(),
            ])->save();
        });

        return to_route('client.montage-reviews.show', ['token' => $project->montage_review_token])
            ->with('status', $hasRevisionRequests
                ? 'Замечания отправлены модератору.'
                : 'Готовые работы подтверждены. Модератор уже получил ваше подтверждение.');
    }

    private function resolveProjectByToken(string $token): Project
    {
        return Project::query()
            ->where('montage_review_token', $token)
            ->whereNotNull('montage_review_published_at')
            ->with([
                'montageAssets',
                'montageRevisionRequests',
            ])
            ->firstOrFail();
    }
}
