<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testing extends Model
{
    // Ensure this matches your table name from the error
    protected $table = 'testing'; 

    // This array tells Laravel these columns are safe to insert data into
    protected $fillable = [
        'section_id', 
        'type', 
        'severity', 
        'description'
    ];
}