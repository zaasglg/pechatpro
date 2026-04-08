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
        Schema::table('projects', function (Blueprint $table) {
            $table->string('client_selection_token')->nullable()->unique()->after('print_quantity');
            $table->timestamp('client_selection_published_at')->nullable()->after('client_selection_token');
            $table->timestamp('client_selection_submitted_at')->nullable()->after('client_selection_published_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'client_selection_token',
                'client_selection_published_at',
                'client_selection_submitted_at',
            ]);
        });
    }
};
