<?php

use App\Http\Controllers\Admin\CityController;
use App\Http\Controllers\Admin\ModerationReviewController;
use App\Http\Controllers\Admin\ModeratorProjectController;
use App\Http\Controllers\Admin\PhotographerApprovalController;
use App\Http\Controllers\Admin\ProjectPriceController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MontageProjectController;
use App\Http\Controllers\PhotographerProjectController;
use App\Http\Controllers\PriceCalculatorController;
use App\Http\Controllers\PrintProjectController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectClientSelectionController;
use App\Http\Controllers\ProjectMontageAssetController;
use App\Http\Controllers\ProjectMontageDownloadController;
use App\Http\Controllers\ProjectMontageReviewController;
use App\Http\Controllers\ProjectSourceImageController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::post('locale', LocaleController::class)->name('locale.update');

Route::get('/price-calculator', PriceCalculatorController::class)->name('price-calculator');

Route::get('/test-s3', function () {
    try {
        // 1. Создаем тестовый файл
        Storage::disk('s3')->put('test.txt', 'Привет, IDrive e2! Файл успешно записан.');

        // 2. Проверяем, существует ли он
        if (Storage::disk('s3')->exists('test.txt')) {
            // 3. Удаляем файл (вы же хотели часто удалять)
            Storage::disk('s3')->delete('test.txt');

            return 'Успех! Laravel подключился к IDrive e2, создал и удалил файл.';
        }
    } catch (Exception $e) {
        return 'Ошибка: '.$e->getMessage();
    }
});

Route::get('/debug-s3', function () {
    return [
        'env_region' => env('AWS_DEFAULT_REGION'),
        'config_region' => config('filesystems.disks.s3.region'),
        'endpoint' => config('filesystems.disks.s3.endpoint'),
    ];
});

Route::get('/test-s3-permanent', function () {
    // Загружаем файл, но НЕ удаляем его
    Storage::disk('s3')->put('hello_world.txt', 'Этот файл останется в бакете!');

    return 'Файл загружен. Проверьте панель IDrive e2!';
});

Route::middleware('auth')->prefix('uploads')->as('uploads.')->group(function (): void {
    Route::post('multipart/create', [UploadController::class, 'createMultipart'])->name('multipart.create');
    Route::get('multipart/{uploadId}/sign', [UploadController::class, 'signPart'])->name('multipart.sign');
    Route::get('multipart/{uploadId}/parts', [UploadController::class, 'listParts'])->name('multipart.parts');
    Route::post('multipart/{uploadId}/complete', [UploadController::class, 'completeMultipart'])->name('multipart.complete');
    Route::delete('multipart/{uploadId}/abort', [UploadController::class, 'abortMultipart'])->name('multipart.abort');
    Route::post('{uploadId}/finalize', [UploadController::class, 'finalize'])->name('finalize');
});

Route::middleware('auth')->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password.update');
});

Route::middleware(['auth', 'role:Админ|Модератор'])
    ->prefix('admin')
    ->as('admin.')
    ->group(function (): void {
        Route::get('cities', [CityController::class, 'index'])->name('cities.index');
        Route::post('cities', [CityController::class, 'store'])->name('cities.store');
        Route::put('cities/{city}', [CityController::class, 'update'])->name('cities.update');
        Route::delete('cities/{city}', [CityController::class, 'destroy'])->name('cities.destroy');
        Route::get('photographer-approvals', [PhotographerApprovalController::class, 'index'])
            ->name('photographer-approvals.index');
        Route::post('photographer-approvals/{user}/approve', [PhotographerApprovalController::class, 'approve'])
            ->name('photographer-approvals.approve');
        Route::delete('photographers/{user}', [PhotographerApprovalController::class, 'destroy'])
            ->name('photographers.destroy');
    });

Route::middleware(['auth', 'role:Админ'])
    ->prefix('admin/project-prices')
    ->as('admin.project-prices.')
    ->group(function (): void {
        Route::get('/', [ProjectPriceController::class, 'index'])->name('index');
    });

Route::middleware(['auth', 'role:Админ'])
    ->prefix('admin/users')
    ->as('admin.users.')
    ->group(function (): void {
        Route::get('/', [AdminUserController::class, 'index'])->name('index');
        Route::post('/{user}/reset-password', [AdminUserController::class, 'resetPassword'])
            ->name('reset-password');
        Route::delete('/{user}', [AdminUserController::class, 'destroy'])
            ->name('destroy');
    });

Route::middleware(['auth', 'role:Модератор'])
    ->prefix('moderator/projects')
    ->as('moderator.projects.')
    ->group(function (): void {
        Route::get('/', [ModeratorProjectController::class, 'index'])->name('index');
        Route::get('/photographers/{photographer}', [ModeratorProjectController::class, 'showPhotographer'])
            ->name('photographers.show');
        Route::get('/{project}', [ModeratorProjectController::class, 'show'])->name('show');
        Route::post('/{project}/client-selection', [ModeratorProjectController::class, 'publishSelection'])
            ->name('client-selection.publish');
        Route::post('/{project}/client-selection/approve', [ModeratorProjectController::class, 'approveSelection'])
            ->name('client-selection.approve');
        Route::get('/{project}/ready-works/archive', [ProjectMontageDownloadController::class, 'moderatorArchive'])
            ->name('ready-works.archive');
        Route::get('/{project}/ready-works/{asset}/download', [ProjectMontageDownloadController::class, 'moderatorDownload'])
            ->name('ready-works.download');
        Route::get('/{project}/source-images/archive', [ProjectMontageDownloadController::class, 'moderatorSourceImagesArchive'])
            ->name('source-images.archive');
        Route::get('/{project}/source-images/{sourceImage}/download', [ProjectMontageDownloadController::class, 'moderatorSourceImageDownload'])
            ->name('source-images.download');
        Route::get('/{project}/archive', [ProjectMontageDownloadController::class, 'moderatorProjectArchive'])
            ->name('project.archive');
        Route::post('/{project}/moderation/publish-client-review', [ModerationReviewController::class, 'publishClientReview'])
            ->name('moderation.publish-client-review');
        Route::post('/{project}/moderation/assign-designer', [ModerationReviewController::class, 'assignDesigner'])
            ->name('moderation.assign-designer');
        Route::post('/{project}/moderation/send-back-to-montage', [ModerationReviewController::class, 'sendBackToMontage'])
            ->name('moderation.send-back-to-montage');
        Route::post('/{project}/moderation/approve', [ModerationReviewController::class, 'approve'])
            ->name('moderation.approve');
        Route::post('/{project}/printing/complete', [ModerationReviewController::class, 'completePrinting'])
            ->name('printing.complete');
        Route::delete('/{project}', [ModeratorProjectController::class, 'destroy'])
            ->name('destroy');
    });

Route::middleware(['auth', 'role:Монтажер|Дизайнер'])
    ->prefix('montage/projects')
    ->as('montage.projects.')
    ->group(function (): void {
        Route::get('/', [MontageProjectController::class, 'index'])->name('index');
        Route::get('/{project}/works', [ProjectMontageAssetController::class, 'show'])->name('works.show');
        Route::post('/{project}/works', [ProjectMontageAssetController::class, 'store'])->name('works.store');
        Route::get('/{project}/works/archive', [ProjectMontageDownloadController::class, 'montageArchive'])->name('works.archive');
        Route::get('/{project}/client-selection/archive', [ProjectMontageDownloadController::class, 'montageClientSelectionArchive'])
            ->name('client-selection.archive');
        Route::get('/{project}/works/{asset}/download', [ProjectMontageDownloadController::class, 'montageDownload'])->name('works.download');
        Route::post('/{project}/works/{asset}/replace', [ProjectMontageAssetController::class, 'replace'])->name('works.replace');
        Route::post('/{project}/works/complete', [ProjectMontageAssetController::class, 'complete'])->name('works.complete');
    });

Route::middleware(['auth', 'role:Печать'])
    ->prefix('print/projects')
    ->as('print.projects.')
    ->group(function (): void {
        Route::get('/', [PrintProjectController::class, 'index'])->name('index');
        Route::get('/{project}', [PrintProjectController::class, 'show'])->name('show');
        Route::get('/{project}/archive', [ProjectMontageDownloadController::class, 'printArchive'])->name('archive');
        Route::get('/{project}/works/{asset}/download', [ProjectMontageDownloadController::class, 'printDownload'])->name('works.download');
        Route::post('/{project}/complete', [PrintProjectController::class, 'complete'])->name('complete');
    });

Route::middleware(['auth', 'role:Фотограф'])
    ->prefix('projects')
    ->as('projects.')
    ->group(function (): void {
        Route::get('/', [PhotographerProjectController::class, 'index'])->name('index');
        Route::get('/create', [PhotographerProjectController::class, 'create'])->name('create');
        Route::get('/{project}/source-images', [ProjectSourceImageController::class, 'show'])
            ->name('source-images.show');
        Route::post('/{project}/source-images', [ProjectSourceImageController::class, 'store'])
            ->name('source-images.store');
        Route::delete('/{project}/source-images/{sourceImage}', [ProjectSourceImageController::class, 'destroy'])
            ->name('source-images.destroy');
        Route::post('/{project}/source-images/complete', [ProjectSourceImageController::class, 'complete'])
            ->name('source-images.complete');
        Route::get('/{project}', [PhotographerProjectController::class, 'show'])->name('show');
        Route::delete('/{project}', [PhotographerProjectController::class, 'destroy'])->name('destroy');
        Route::post('/', [PhotographerProjectController::class, 'store'])->name('store');
    });

Route::get('client/projects/{token}', [ProjectClientSelectionController::class, 'show'])
    ->name('client.projects.show');
Route::post('client/projects/{token}/toggle-image-selection', [ProjectClientSelectionController::class, 'toggleImageSelection'])
    ->name('client.projects.toggle-image-selection')
    ->block();
Route::post('client/projects/{token}/submit', [ProjectClientSelectionController::class, 'submitSelection'])
    ->name('client.projects.submit')
    ->block();
Route::get('client/montage-reviews/{token}', [ProjectMontageReviewController::class, 'show'])
    ->name('client.montage-reviews.show');
Route::post('client/montage-reviews/{token}/toggle-selection', [ProjectMontageReviewController::class, 'toggleSelection'])
    ->name('client.montage-reviews.toggle-selection');
Route::post('client/montage-reviews/{token}/submit', [ProjectMontageReviewController::class, 'submit'])
    ->name('client.montage-reviews.submit');
