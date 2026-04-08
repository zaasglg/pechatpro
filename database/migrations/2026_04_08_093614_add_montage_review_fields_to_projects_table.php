<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->string('montage_review_token')->nullable()->unique()->after('client_selection_submitted_at');
            $table->timestamp('montage_review_published_at')->nullable()->after('montage_review_token');
            $table->timestamp('montage_review_submitted_at')->nullable()->after('montage_review_published_at');
            $table->text('montage_review_comment')->nullable()->after('montage_review_submitted_at');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropUnique('projects_montage_review_token_unique');
            $table->dropColumn([
                'montage_review_token',
                'montage_review_published_at',
                'montage_review_submitted_at',
                'montage_review_comment',
            ]);
        });
    }
};
