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
        Schema::create('project_client_selection_submissions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('student_name', 120);
            $table->text('student_quote');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(
                ['project_id', 'submitted_at'],
                'project_client_submission_project_submitted_idx',
            );
            $table->foreign('project_id', 'project_client_submission_project_fk')
                ->references('id')
                ->on('projects')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_client_selection_submissions');
    }
};
