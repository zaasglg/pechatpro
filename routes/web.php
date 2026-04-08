<?php

use App\Http\Controllers\Admin\CityController;
use App\Http\Controllers\Admin\ModerationReviewController;
use App\Http\Controllers\Admin\ModeratorProjectController;
use App\Http\Controllers\Admin\PhotographerApprovalController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MontageProjectController;
use App\Http\Controllers\PhotographerProjectController;
use App\Http\Controllers\PrintProjectController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectClientSelectionController;
use App\Http\Controllers\ProjectMontageAssetController;
use App\Http\Controllers\ProjectMontageReviewController;
use App\Http\Controllers\ProjectSourceImageController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

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
        Route::post('/{project}/moderation/publish-client-review', [ModerationReviewController::class, 'publishClientReview'])
            ->name('moderation.publish-client-review');
        Route::post('/{project}/moderation/send-back-to-montage', [ModerationReviewController::class, 'sendBackToMontage'])
            ->name('moderation.send-back-to-montage');
        Route::post('/{project}/moderation/approve', [ModerationReviewController::class, 'approve'])
            ->name('moderation.approve');
    });

Route::middleware(['auth', 'role:Монтажер'])
    ->prefix('montage/projects')
    ->as('montage.projects.')
    ->group(function (): void {
        Route::get('/', [MontageProjectController::class, 'index'])->name('index');
        Route::get('/{project}/works', [ProjectMontageAssetController::class, 'show'])->name('works.show');
        Route::post('/{project}/works', [ProjectMontageAssetController::class, 'store'])->name('works.store');
        Route::post('/{project}/works/{asset}/replace', [ProjectMontageAssetController::class, 'replace'])->name('works.replace');
        Route::post('/{project}/works/complete', [ProjectMontageAssetController::class, 'complete'])->name('works.complete');
    });

Route::middleware(['auth', 'role:Печать'])
    ->prefix('print/projects')
    ->as('print.projects.')
    ->group(function (): void {
        Route::get('/', [PrintProjectController::class, 'index'])->name('index');
        Route::get('/{project}', [PrintProjectController::class, 'show'])->name('show');
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
        Route::post('/{project}/source-images/complete', [ProjectSourceImageController::class, 'complete'])
            ->name('source-images.complete');
        Route::get('/{project}', [PhotographerProjectController::class, 'show'])->name('show');
        Route::delete('/{project}', [PhotographerProjectController::class, 'destroy'])->name('destroy');
        Route::post('/', [PhotographerProjectController::class, 'store'])->name('store');
    });

Route::get('client/projects/{token}', [ProjectClientSelectionController::class, 'show'])
    ->name('client.projects.show');
Route::post('client/projects/{token}/toggle-selection', [ProjectClientSelectionController::class, 'toggleSelection'])
    ->name('client.projects.toggle-selection');
Route::post('client/projects/{token}/submit', [ProjectClientSelectionController::class, 'submitSelection'])
    ->name('client.projects.submit');
Route::get('client/montage-reviews/{token}', [ProjectMontageReviewController::class, 'show'])
    ->name('client.montage-reviews.show');
Route::post('client/montage-reviews/{token}/toggle-selection', [ProjectMontageReviewController::class, 'toggleSelection'])
    ->name('client.montage-reviews.toggle-selection');
Route::post('client/montage-reviews/{token}/submit', [ProjectMontageReviewController::class, 'submit'])
    ->name('client.montage-reviews.submit');
