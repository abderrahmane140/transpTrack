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
        Schema::create('routes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique()->nullable();
            $table->text('description')->nullable();
            $table->string('start_location');
            $table->string('end_location');
            $table->decimal('start_latitude', 10, 7)->nullable();
            $table->decimal('start_longitude', 10, 7)->nullable();
            $table->decimal('end_latitude', 10, 7)->nullable();
            $table->decimal('end_longitude', 10, 7)->nullable();
            $table->unsignedInteger('estimated_duration_minutes')->nullable();
            $table->decimal('total_distance_km', 8, 2)->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
