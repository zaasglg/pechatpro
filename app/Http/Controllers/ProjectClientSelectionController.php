<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectClientSelectionSubmissionRequest;
use App\Models\Project;
use App\Models\ProjectClientSelectionSubmissionImage;
use App\Models\ProjectSourceImage;
use App\Support\ProjectSourceImagePreviewGenerator;
use App\Support\PublicStorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProjectClientSelectionController extends Controller
{
    private const RESERVATION_TTL_MINUTES = 15;

    public function show(
        Request $request,
        string $token,
        ProjectSourceImagePreviewGenerator $previewGenerator,
    ): Response {
        $project = $this->resolveProjectByToken($token);
        $sessionId = $request->session()->getId();

        $this->deleteExpiredReservations($project->id);
        $this->refreshSessionReservations($project->id, $sessionId);

        $submittedStudentsCount = $project->clientSelectionSubmissions()->count();
        $takenImageIds = ProjectClientSelectionSubmissionImage::query()
            ->whereHas('submission', fn ($query) => $query->where('project_id', $project->id))
            ->pluck('project_source_image_id')
            ->all();
        $reservations = $this->activeReservations($project->id);
        $selectedImageIds = $reservations
            ->where('session_id', $sessionId)
            ->pluck('project_source_image_id')
            ->map(fn (mixed $imageId): int => (int) $imageId)
            ->values()
            ->all();
        $reservedImageIds = $reservations
            ->where('session_id', '!=', $sessionId)
            ->pluck('project_source_image_id')
            ->map(fn (mixed $imageId): int => (int) $imageId)
            ->all();

        return Inertia::render('client/projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'className' => $project->class_name,
                'token' => $project->client_selection_token,
                'portraitCount' => $project->portrait_count,
                'studentCount' => $project->student_count,
                'submittedStudentsCount' => $submittedStudentsCount,
                'remainingStudentsCount' => max($project->student_count - $submittedStudentsCount, 0),
                'clientSelectionDeadlineAt' => $project->client_selection_deadline_at?->toIso8601String(),
                'clientSelectionCompletedAt' => $project->client_selection_submitted_at?->toIso8601String(),
            ],
            'selection' => [
                'selectedImageIds' => $selectedImageIds,
            ],
            'images' => $project->sourceImages
                ->map(function (ProjectSourceImage $image) use (
                    $previewGenerator,
                    $reservedImageIds,
                    $selectedImageIds,
                    $takenImageIds,
                ): array {
                    $previewPath = $previewGenerator->resolvePreviewPath($image);
                    $isTaken = in_array($image->id, $takenImageIds, true);
                    $isSelected = in_array($image->id, $selectedImageIds, true);
                    $isReserved = ! $isSelected && in_array($image->id, $reservedImageIds, true);

                    return [
                        'id' => $image->id,
                        'name' => $image->original_name,
                        'url' => PublicStorageUrl::make($image->path),
                        'previewUrl' => $previewPath !== null
                            ? PublicStorageUrl::make($previewPath)
                            : null,
                        'mimeType' => $image->mime_type,
                        'sizeBytes' => $image->size_bytes,
                        'isTaken' => $isTaken,
                        'isReserved' => $isReserved,
                        'isSelected' => $isSelected,
                    ];
                })
                ->values()
                ->all(),
            'status' => session('status'),
        ]);
    }

    public function toggleImageSelection(
        Request $request,
        string $token,
    ): RedirectResponse {
        $project = $this->resolveProjectByToken($token);
        $sessionId = $request->session()->getId();
        $validated = $request->validate([
            'image_id' => ['required', 'integer'],
        ]);

        $this->ensureClientSelectionDeadlineActive($project);

        DB::transaction(function () use ($project, $sessionId, $validated): void {
            $this->deleteExpiredReservations($project->id);

            $lockedProject = Project::query()
                ->whereKey($project->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $existingSubmissionsCount = $lockedProject->clientSelectionSubmissions()
                ->lockForUpdate()
                ->count();

            if ($existingSubmissionsCount >= $lockedProject->student_count) {
                throw ValidationException::withMessages([
                    'submission' => 'Лимит учеников для этой ссылки уже заполнен.',
                ]);
            }

            $imageId = (int) $validated['image_id'];

            $this->ensureProjectOwnsImages($lockedProject, collect([$imageId]));

            $currentSelectionIds = $this->sessionReservationIds($lockedProject->id, $sessionId, true);

            if ($currentSelectionIds->contains($imageId)) {
                DB::table('project_client_selection_reservations')
                    ->where('project_id', $lockedProject->id)
                    ->where('session_id', $sessionId)
                    ->where('project_source_image_id', $imageId)
                    ->delete();

                return;
            }

            if ($currentSelectionIds->count() >= $lockedProject->portrait_count) {
                throw ValidationException::withMessages([
                    'selected_image_ids' => "Можно выбрать только {$lockedProject->portrait_count} {$this->formatPortraitWord($lockedProject->portrait_count)}.",
                ]);
            }

            $alreadySubmitted = ProjectClientSelectionSubmissionImage::query()
                ->where('project_source_image_id', $imageId)
                ->lockForUpdate()
                ->exists();

            if ($alreadySubmitted) {
                throw ValidationException::withMessages([
                    'selected_image_ids' => 'Эту фотографию уже закрепили за другим учеником. Выберите другой кадр.',
                ]);
            }

            $reservedByAnotherStudent = DB::table('project_client_selection_reservations')
                ->where('project_id', $lockedProject->id)
                ->where('project_source_image_id', $imageId)
                ->where('session_id', '!=', $sessionId)
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->exists();

            if ($reservedByAnotherStudent) {
                throw ValidationException::withMessages([
                    'selected_image_ids' => 'Эту фотографию сейчас выбирает другой ученик. Выберите другой кадр.',
                ]);
            }

            $timestamp = now();

            DB::table('project_client_selection_reservations')->insert([
                'project_id' => $lockedProject->id,
                'project_source_image_id' => $imageId,
                'session_id' => $sessionId,
                'expires_at' => $this->reservationExpiresAt(),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        });

        return to_route('client.projects.show', ['token' => $project->client_selection_token]);
    }

    public function submitSelection(
        StoreProjectClientSelectionSubmissionRequest $request,
        string $token,
    ): RedirectResponse {
        $project = $this->resolveProjectByToken($token);
        $validated = $request->validated();
        $sessionId = $request->session()->getId();

        $this->ensureClientSelectionDeadlineActive($project);

        if ($project->portrait_count < 1) {
            throw ValidationException::withMessages([
                'selected_image_ids' => 'Для этого проекта не настроено количество портреток.',
            ]);
        }

        DB::transaction(function () use ($project, $sessionId, $validated): void {
            $this->deleteExpiredReservations($project->id);

            $lockedProject = Project::query()
                ->whereKey($project->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $existingSubmissionsCount = $lockedProject->clientSelectionSubmissions()
                ->lockForUpdate()
                ->count();

            if ($existingSubmissionsCount >= $lockedProject->student_count) {
                throw ValidationException::withMessages([
                    'submission' => 'Лимит учеников для этой ссылки уже заполнен.',
                ]);
            }

            $selectedImageIds = collect($validated['selected_image_ids'])
                ->map(fn (mixed $imageId): int => (int) $imageId)
                ->values();

            $this->ensureProjectOwnsImages($lockedProject, $selectedImageIds);

            $takenImageIds = ProjectClientSelectionSubmissionImage::query()
                ->whereIn('project_source_image_id', $selectedImageIds)
                ->lockForUpdate()
                ->pluck('project_source_image_id');

            if ($takenImageIds->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'selected_image_ids' => 'Некоторые фотографии уже выбрал другой ученик. Обновите страницу и выберите другие.',
                ]);
            }

            $reservedByAnotherStudent = DB::table('project_client_selection_reservations')
                ->where('project_id', $lockedProject->id)
                ->whereIn('project_source_image_id', $selectedImageIds)
                ->where('session_id', '!=', $sessionId)
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->pluck('project_source_image_id');

            if ($reservedByAnotherStudent->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'selected_image_ids' => 'Некоторые фотографии уже выбирает другой ученик. Обновите страницу и выберите другие.',
                ]);
            }

            $studentName = Str::of("{$validated['last_name']} {$validated['first_name']}")
                ->squish()
                ->toString();
            $studentQuote = trim($validated['student_quote']);

            $submission = $lockedProject->clientSelectionSubmissions()->create([
                'student_name' => $studentName,
                'student_quote' => $studentQuote,
                'submitted_at' => now(),
            ]);

            $submission->selectedImages()->attach($selectedImageIds->all());

            $selectedImages = $lockedProject->sourceImages()
                ->whereIn('id', $selectedImageIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($selectedImageIds->values() as $index => $selectedImageId) {
                /** @var ProjectSourceImage $selectedImage */
                $selectedImage = $selectedImages->get($selectedImageId);

                $selectedImage->forceFill([
                    'original_name' => $this->selectedImageFileName(
                        $validated['last_name'],
                        $validated['first_name'],
                        $selectedImage->original_name,
                        $index + 1,
                        $selectedImageIds->count(),
                    ),
                    'client_name' => $studentName,
                    'client_quote' => $studentQuote,
                ])->save();
            }

            DB::table('project_client_selection_reservations')
                ->where('project_id', $lockedProject->id)
                ->where('session_id', $sessionId)
                ->delete();

            $lockedProject->forceFill([
                'client_selection_submitted_at' => $existingSubmissionsCount + 1 >= $lockedProject->student_count
                    ? now()
                    : null,
            ])->save();
        });

        $submittedStudentsCount = $project->clientSelectionSubmissions()->count();
        $isLimitReached = $submittedStudentsCount >= $project->student_count;

        return to_route('client.projects.show', ['token' => $project->client_selection_token])
            ->with('status', $isLimitReached
                ? 'Анкета отправлена. Лимит учеников заполнен.'
                : 'Анкета отправлена. Теперь ссылкой может воспользоваться следующий ученик.');
    }

    private function resolveProjectByToken(string $token): Project
    {
        return Project::query()
            ->where('client_selection_token', $token)
            ->whereNotNull('client_selection_published_at')
            ->with(['sourceImages'])
            ->firstOrFail();
    }

    /**
     * @param  Collection<int, int>  $selectedImageIds
     */
    private function ensureProjectOwnsImages(Project $project, Collection $selectedImageIds): void
    {
        $ownedImageIdsCount = $project->sourceImages()
            ->whereIn('id', $selectedImageIds)
            ->count();

        if ($ownedImageIdsCount !== $selectedImageIds->count()) {
            throw ValidationException::withMessages([
                'selected_image_ids' => 'Можно выбирать только фотографии из текущего проекта.',
            ]);
        }
    }

    private function ensureClientSelectionDeadlineActive(Project $project): void
    {
        if (! $project->clientSelectionDeadlinePassed()) {
            return;
        }

        throw ValidationException::withMessages([
            'submission' => 'Срок выбора фотографий истек. Обратитесь к модератору за новой ссылкой или продлением.',
        ]);
    }

    private function deleteExpiredReservations(int $projectId): void
    {
        DB::table('project_client_selection_reservations')
            ->where('project_id', $projectId)
            ->where('expires_at', '<=', now())
            ->delete();
    }

    private function refreshSessionReservations(int $projectId, string $sessionId): void
    {
        DB::table('project_client_selection_reservations')
            ->where('project_id', $projectId)
            ->where('session_id', $sessionId)
            ->where('expires_at', '>', now())
            ->update([
                'expires_at' => $this->reservationExpiresAt(),
                'updated_at' => now(),
            ]);
    }

    /**
     * @return Collection<int, object>
     */
    private function activeReservations(int $projectId): Collection
    {
        return DB::table('project_client_selection_reservations')
            ->select(['project_source_image_id', 'session_id', 'expires_at'])
            ->where('project_id', $projectId)
            ->where('expires_at', '>', now())
            ->get();
    }

    /**
     * @return Collection<int, int>
     */
    private function sessionReservationIds(
        int $projectId,
        string $sessionId,
        bool $lockForUpdate = false,
    ): Collection {
        $query = DB::table('project_client_selection_reservations')
            ->where('project_id', $projectId)
            ->where('session_id', $sessionId)
            ->where('expires_at', '>', now());

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->pluck('project_source_image_id')
            ->map(fn (mixed $imageId): int => (int) $imageId)
            ->values();
    }

    private function reservationExpiresAt()
    {
        return now()->addMinutes(self::RESERVATION_TTL_MINUTES);
    }

    private function formatPortraitWord(int $count): string
    {
        if ($count % 10 === 1 && $count % 100 !== 11) {
            return 'портретку';
        }

        if (in_array($count % 10, [2, 3, 4], true) && ! in_array($count % 100, [12, 13, 14], true)) {
            return 'портретки';
        }

        return 'портреток';
    }

    private function selectedImageFileName(
        string $lastName,
        string $firstName,
        string $originalName,
        int $sequence,
        int $selectedImagesCount,
    ): string {
        $baseName = $this->participantFileNameBase($lastName, $firstName);

        if ($selectedImagesCount > 1) {
            $baseName .= "_{$sequence}";
        }

        $extension = pathinfo($originalName, PATHINFO_EXTENSION);

        if ($extension === '') {
            return $baseName;
        }

        return "{$baseName}.{$extension}";
    }

    private function participantFileNameBase(string $lastName, string $firstName): string
    {
        $fullName = Str::of("{$lastName} {$firstName}")
            ->squish()
            ->lower()
            ->replace(' ', '_')
            ->toString();

        $baseName = preg_replace('/[^\pL\pN]+/u', '_', $fullName) ?? '';

        return trim($baseName, '_') !== '' ? trim($baseName, '_') : 'student';
    }
}
