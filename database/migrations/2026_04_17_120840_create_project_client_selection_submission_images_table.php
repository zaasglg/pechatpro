<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('project_client_selection_submission_images', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('project_client_selection_submission_id');
            $table->unsignedBigInteger('project_source_image_id');
            $table->timestamps();

            $table->unique(
                ['project_client_selection_submission_id', 'project_source_image_id'],
                'project_client_submission_image_unique',
            );
            $table->unique('project_source_image_id', 'project_client_submission_image_source_unique');
            $table->foreign(
                'project_client_selection_submission_id',
                'project_client_submission_image_submission_fk',
            )->references('id')->on('project_client_selection_submissions')->cascadeOnDelete();
            $table->foreign(
                'project_source_image_id',
                'project_client_submission_image_source_fk',
            )->references('id')->on('project_source_images')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_client_selection_submission_images');
    }
};
