<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProjectClientSelectionRequest;
use App\Models\Project;
use App\Models\ProjectClientSelectionChoice;
use App\Models\ProjectClientSelectionSlot;
use App\Models\ProjectSourceImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectClientSelectionController extends Controller
{
    public function show(string $token): Response
    {
        $project = $this->resolveProjectByToken($token);

        return Inertia::render('client/projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'token' => $project->client_selection_token,
                'clientSelectionSubmittedAt' => $project->client_selection_submitted_at?->toIso8601String(),
            ],
            'slots' => $project->clientSelectionSlots
                ->map(fn (ProjectClientSelectionSlot $slot): array => [
                    'id' => $slot->id,
                    'name' => $slot->name,
                    'maxLikes' => $slot->max_likes,
                    'selectedImageIds' => $slot->choices
                        ->pluck('project_source_image_id')
                        ->all(),
                ])
                ->values()
                ->all(),
            'images' => $project->sourceImages
                ->map(fn (ProjectSourceImage $image): array => [
                    'id' => $image->id,
                    'name' => $image->original_name,
                    'url' => Storage::disk('public')->url($image->path),
                    'sizeBytes' => $image->size_bytes,
                ])
                ->values()
                ->all(),
            'status' => session('status'),
        ]);
    }

    public function toggleSelection(
        UpdateProjectClientSelectionRequest $request,
        string $token,
    ): RedirectResponse {
        $project = $this->resolveProjectByToken($token);
        $validated = $request->validated();

        if ($project->client_selection_submitted_at !== null) {
            throw ValidationException::withMessages([
                'source_image_id' => 'Выбор уже отправлен модератору. Изменения больше недоступны.',
            ]);
        }

        $slot = $project->clientSelectionSlots()
            ->withCount('choices')
            ->findOrFail($validated['slot_id']);

        $project->sourceImages()
            ->whereKey($validated['source_image_id'])
            ->firstOrFail();

        $existingChoice = $slot->choices()
            ->where('project_source_image_id', $validated['source_image_id'])
            ->first();

        if ($existingChoice !== null) {
            $existingChoice->delete();

            return back()->with('status', 'Выбор обновлен.');
        }

        if ($slot->choices_count >= $slot->max_likes) {
            throw ValidationException::withMessages([
                'source_image_id' => "Для блока «{$slot->name}» можно выбрать только {$slot->max_likes} фото.",
            ]);
        }

        ProjectClientSelectionChoice::query()->create([
            'project_client_selection_slot_id' => $slot->id,
            'project_source_image_id' => $validated['source_image_id'],
        ]);

        return back()->with('status', 'Фото добавлено в выбор.');
    }

    public function submitSelection(string $token): RedirectResponse
    {
        $project = $this->resolveProjectByToken($token);

        if ($project->client_selection_submitted_at !== null) {
            return to_route('client.projects.show', ['token' => $project->client_selection_token])
                ->with('status', 'Вы уже отправили выбор модератору.');
        }

        $incompleteSlot = $project->clientSelectionSlots()
            ->withCount('choices')
            ->get()
            ->first(fn (ProjectClientSelectionSlot $slot): bool => $slot->choices_count < $slot->max_likes);

        if ($incompleteSlot !== null) {
            throw ValidationException::withMessages([
                'selection' => "Заполните блок «{$incompleteSlot->name}». Нужно выбрать {$incompleteSlot->max_likes} фото.",
            ]);
        }

        DB::transaction(function () use ($project): void {
            $project->forceFill([
                'client_selection_submitted_at' => now(),
            ])->save();
        });

        return to_route('client.projects.show', ['token' => $project->client_selection_token])
            ->with('status', 'Выбор отправлен модератору. Теперь ожидайте подтверждения.');
    }

    private function resolveProjectByToken(string $token): Project
    {
        return Project::query()
            ->where('client_selection_token', $token)
            ->whereNotNull('client_selection_published_at')
            ->with([
                'clientSelectionSlots.choices',
                'sourceImages',
            ])
            ->firstOrFail();
    }
}
