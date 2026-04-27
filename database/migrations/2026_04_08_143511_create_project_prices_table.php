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
        Schema::create('project_prices', function (Blueprint $table) {
            $table->id();
            $table->string('album_type');
            $table->string('album_size');
            $table->string('cover_type');
            $table->unsignedSmallInteger('page_count');
            $table->decimal('unit_price', 10, 2);
            $table->timestamps();

            $table->unique(
                ['album_type', 'album_size', 'cover_type', 'page_count'],
                'project_prices_configuration_unique',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_prices');
    }
};
