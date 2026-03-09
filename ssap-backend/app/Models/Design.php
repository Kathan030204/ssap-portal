<?php

// app/Models/Design.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Design extends Model
{
    // Explicitly define the table name
    protected $table = 'design';

    protected $fillable = [
        'section_id',
        'image_type',
        'image_url',
    ];
}