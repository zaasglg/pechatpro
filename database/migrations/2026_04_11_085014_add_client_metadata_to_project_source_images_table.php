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
        Schema::table('project_source_images', function (Blueprint $table): void {
            $table->string('client_name')->nullable()->after('original_name');
            $table->text('client_quote')->nullable()->after('client_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_source_images', function (Blueprint $table): void {
            $table->dropColumn(['client_name', 'client_quote']);
        });
    }
};
