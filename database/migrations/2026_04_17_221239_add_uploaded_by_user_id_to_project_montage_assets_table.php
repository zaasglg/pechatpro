<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_montage_assets', function (Blueprint $table): void {
            $table->foreignId('uploaded_by_user_id')
                ->nullable()
                ->after('project_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_montage_assets', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('uploaded_by_user_id');
        });
    }
};
