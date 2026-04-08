<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_montage_revision_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('project_montage_asset_id');
            $table->timestamps();

            $table->unique(
                ['project_id', 'project_montage_asset_id'],
                'pmrr_project_asset_unique',
            );
            $table->foreign('project_id', 'pmrr_project_fk')
                ->references('id')
                ->on('projects')
                ->cascadeOnDelete();
            $table->foreign('project_montage_asset_id', 'pmrr_asset_fk')
                ->references('id')
                ->on('project_montage_assets')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_montage_revision_requests');
    }
};
