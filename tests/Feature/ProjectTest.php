<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

test('projects table contains the required columns', function () {
    expect(Schema::hasColumns('projects', [
        'id',
        'photographer_id',
        'montage_user_id',
        'designer_user_id',
        'name',
        'class_name',
        'album_type',
        'album_size',
        'cover_type',
        'page_count',
        'portrait_count',
        'student_count',
        'print_quantity',
        'client_selection_token',
        'client_selection_published_at',
        'client_selection_deadline_at',
        'client_selection_submitted_at',
        'montage_review_token',
        'montage_review_published_at',
        'montage_review_submitted_at',
        'montage_review_comment',
        'printing_ready_at',
        'created_at',
        'updated_at',
    ]))->toBeTrue();
});

test('project montage revision requests table contains the required columns', function () {
    expect(Schema::hasColumns('project_montage_revision_requests', [
        'id',
        'project_id',
        'project_montage_asset_id',
        'comment',
        'created_at',
        'updated_at',
    ]))->toBeTrue();
});

test('projects can be created with the configured album fields', function () {
    $photographer = User::factory()->create();

    $project = Project::factory()->create([
        'photographer_id' => $photographer->id,
        'name' => 'Выпускной 11 класса',
        'class_name' => '11 класс',
        'album_type' => 'Пластик',
        'album_size' => '25x25',
        'cover_type' => 'Мягкий',
        'page_count' => 20,
        'portrait_count' => 28,
        'student_count' => 28,
        'print_quantity' => 30,
    ]);

    expect($project->name)->toBe('Выпускной 11 класса');
    expect($project->photographer_id)->toBe($photographer->id);
    expect($project->class_name)->toBe('11 класс');
    expect($project->album_type)->toBe('Пластик');
    expect($project->album_size)->toBe('25x25');
    expect($project->cover_type)->toBe('Мягкий');
    expect($project->page_count)->toBe(20);
    expect($project->portrait_count)->toBe(28);
    expect($project->student_count)->toBe(28);
    expect($project->print_quantity)->toBe(30);
});
