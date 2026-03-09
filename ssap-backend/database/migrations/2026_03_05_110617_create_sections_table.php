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
    Schema::create('sections', function (Blueprint $table) {
        $table->id();
        $table->string('title');
        $table->unsignedBigInteger('creator_id'); // ID of the person who created it
        $table->string('current_status')->default('pending'); 
        $table->string('zip_url')->nullable(); // URL to the uploaded zip file
        $table->timestamps();

        // Optional: Add a foreign key constraint if you have an accounts/users table
        // $table->foreign('creator_id')->references('id')->on('accounts')->onDelete('cascade');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
