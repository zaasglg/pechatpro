<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_client_selection_reservations')) {
            Schema::table('project_client_selection_reservations', function (Blueprint $table): void {
                if (! Schema::hasColumn('project_client_selection_reservations', 'project_id')) {
                    $table->foreignId('project_id')->after('id');
                }

                if (! Schema::hasColumn('project_client_selection_reservations', 'project_source_image_id')) {
                    $table->foreignId('project_source_image_id')->after('project_id');
                }

                if (! Schema::hasColumn('project_client_selection_reservations', 'session_id')) {
                    $table->string('session_id', 120)->after('project_source_image_id');
                }

                if (! Schema::hasColumn('project_client_selection_reservations', 'expires_at')) {
                    $table->timestamp('expires_at')->after('session_id');
                }
            });

            if (DB::getDriverName() !== 'mysql') {
                return;
            }

            if (! $this->constraintExists(
                'project_client_selection_reservations',
                'pcsr_project_fk',
            ) && ! $this->constraintExists(
                'project_client_selection_reservations',
                'project_client_selection_reservations_project_id_foreign',
            )) {
                Schema::table('project_client_selection_reservations', function (Blueprint $table): void {
                    $table->foreign('project_id', 'pcsr_project_fk')
                        ->references('id')
                        ->on('projects')
                        ->cascadeOnDelete();
                });
            }

            if (! $this->constraintExists(
                'project_client_selection_reservations',
                'pcsr_source_image_fk',
            )) {
                Schema::table('project_client_selection_reservations', function (Blueprint $table): void {
                    $table->foreign('project_source_image_id', 'pcsr_source_image_fk')
                        ->references('id')
                        ->on('project_source_images')
                        ->cascadeOnDelete();
                });
            }

            if (! $this->indexExists(
                'project_client_selection_reservations',
                'project_client_selection_reservation_image_unique',
            )) {
                Schema::table('project_client_selection_reservations', function (Blueprint $table): void {
                    $table->unique(
                        'project_source_image_id',
                        'project_client_selection_reservation_image_unique',
                    );
                });
            }

            if (! $this->indexExists(
                'project_client_selection_reservations',
                'project_client_selection_reservation_session_idx',
            )) {
                Schema::table('project_client_selection_reservations', function (Blueprint $table): void {
                    $table->index(
                        ['project_id', 'session_id', 'expires_at'],
                        'project_client_selection_reservation_session_idx',
                    );
                });
            }

            if (! $this->indexExists(
                'project_client_selection_reservations',
                'project_client_selection_reservation_project_expiry_idx',
            )) {
                Schema::table('project_client_selection_reservations', function (Blueprint $table): void {
                    $table->index(
                        ['project_id', 'expires_at'],
                        'project_client_selection_reservation_project_expiry_idx',
                    );
                });
            }

            return;
        }

        Schema::create('project_client_selection_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('project_source_image_id')
                ->unique('project_client_selection_reservation_image_unique');
            $table->string('session_id', 120);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(
                ['project_id', 'session_id', 'expires_at'],
                'project_client_selection_reservation_session_idx',
            );
            $table->index(
                ['project_id', 'expires_at'],
                'project_client_selection_reservation_project_expiry_idx',
            );
            $table->foreign('project_id', 'pcsr_project_fk')
                ->references('id')
                ->on('projects')
                ->cascadeOnDelete();
            $table->foreign('project_source_image_id', 'pcsr_source_image_fk')
                ->references('id')
                ->on('project_source_images')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_client_selection_reservations');
    }

    private function constraintExists(string $table, string $constraintName): bool
    {
        $result = DB::selectOne(
            'select constraint_name from information_schema.table_constraints where table_schema = database() and table_name = ? and constraint_name = ? limit 1',
            [$table, $constraintName],
        );

        return $result !== null;
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $result = DB::selectOne(
            'select index_name from information_schema.statistics where table_schema = database() and table_name = ? and index_name = ? limit 1',
            [$table, $indexName],
        );

        return $result !== null;
    }
};
