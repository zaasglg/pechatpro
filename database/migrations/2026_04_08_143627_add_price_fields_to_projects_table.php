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
            $table->foreignId('project_price_id')
                ->nullable()
                ->after('print_quantity')
                ->constrained('project_prices')
                ->nullOnDelete();
            $table->decimal('unit_price', 10, 2)->nullable()->after('project_price_id');
            $table->decimal('total_price', 10, 2)->nullable()->after('unit_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_price_id');
            $table->dropColumn(['unit_price', 'total_price']);
        });
    }
};
