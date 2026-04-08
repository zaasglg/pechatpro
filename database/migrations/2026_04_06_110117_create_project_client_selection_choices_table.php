<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('project_client_selection_choices')) {
            Schema::create('project_client_selection_choices', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('project_client_selection_slot_id');
                $table->unsignedBigInteger('project_source_image_id');
                $table->timestamps();

                $table->foreign('project_client_selection_slot_id', 'pcsc_slot_fk')
                    ->references('id')
                    ->on('project_client_selection_slots')
                    ->cascadeOnDelete();
                $table->foreign('project_source_image_id', 'pcsc_source_image_fk')
                    ->references('id')
                    ->on('project_source_images')
                    ->cascadeOnDelete();
                $table->unique([
                    'project_client_selection_slot_id',
                    'project_source_image_id',
                ], 'project_client_slot_image_unique');
            });

            return;
        }

        Schema::table('project_client_selection_choices', function (Blueprint $table) {
            if (! Schema::hasColumn('project_client_selection_choices', 'project_client_selection_slot_id')) {
                $table->unsignedBigInteger('project_client_selection_slot_id')->after('id');
            }

            if (! Schema::hasColumn('project_client_selection_choices', 'project_source_image_id')) {
                $table->unsignedBigInteger('project_source_image_id')->after('project_client_selection_slot_id');
            }
        });

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (! $this->constraintExists('project_client_selection_choices', 'pcsc_slot_fk')) {
            Schema::table('project_client_selection_choices', function (Blueprint $table) {
                $table->foreign('project_client_selection_slot_id', 'pcsc_slot_fk')
                    ->references('id')
                    ->on('project_client_selection_slots')
                    ->cascadeOnDelete();
            });
        }

        if (! $this->constraintExists('project_client_selection_choices', 'pcsc_source_image_fk')) {
            Schema::table('project_client_selection_choices', function (Blueprint $table) {
                $table->foreign('project_source_image_id', 'pcsc_source_image_fk')
                    ->references('id')
                    ->on('project_source_images')
                    ->cascadeOnDelete();
            });
        }

        if (! $this->constraintExists('project_client_selection_choices', 'project_client_slot_image_unique')) {
            Schema::table('project_client_selection_choices', function (Blueprint $table) {
                $table->unique([
                    'project_client_selection_slot_id',
                    'project_source_image_id',
                ], 'project_client_slot_image_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_client_selection_choices');
    }

    private function constraintExists(string $table, string $constraintName): bool
    {
        $result = DB::selectOne(
            'select constraint_name from information_schema.table_constraints where table_schema = database() and table_name = ? and constraint_name = ? limit 1',
            [$table, $constraintName],
        );

        return $result !== null;
    }
};
