<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_montage_revision_requests', function (Blueprint $table) {
            $table->text('comment')->nullable()->after('project_montage_asset_id');
        });
    }

    public function down(): void
    {
        Schema::table('project_montage_revision_requests', function (Blueprint $table) {
            $table->dropColumn('comment');
        });
    }
};
