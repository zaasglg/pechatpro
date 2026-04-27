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
        Schema::table('projects', function (Blueprint $table): void {
            $table->foreignId('montage_user_id')
                ->nullable()
                ->after('photographer_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('designer_user_id')
                ->nullable()
                ->after('montage_user_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('designer_user_id');
            $table->dropConstrainedForeignId('montage_user_id');
        });
    }
};
