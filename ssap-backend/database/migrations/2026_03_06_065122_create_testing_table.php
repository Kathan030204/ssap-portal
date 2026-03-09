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
          Schema::create('testing', function (Blueprint $table) {
              $table->id();
              $table->unsignedBigInteger('section_id'); // Reference to your sections table
              $table->string('type');      // Bug, Style, Responsive, Logic
              $table->string('severity');  // Minor, Major, Critical
              $table->text('description');
              $table->timestamps();
          });
      }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('testing');
    }
};
