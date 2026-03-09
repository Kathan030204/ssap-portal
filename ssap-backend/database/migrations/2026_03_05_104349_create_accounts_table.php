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
        Schema::create('issues', function (Blueprint $table) {
            $table->id(); 
            
            // Using standard integer fields instead of foreignId
            $table->unsignedBigInteger('test_id');    
            $table->unsignedBigInteger('section_id'); 
            $table->unsignedBigInteger('tester_id');  
            
            $table->text('description');
            $table->enum('status', ['Open', 'Fixed'])->default('Open');
            
            $table->timestamps(); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issues');
    }
};