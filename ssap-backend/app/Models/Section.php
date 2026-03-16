<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Testing;

class Section extends Model
{
    protected $fillable = [
        'title',
        'creator_id',
        'current_status',
        'zip_url',
        'live_link',           // Add this
        'shopify_admin_link',   // Add this
    ];

    public function issues()
    {
        // This looks for 'section_id' in the 'test_issues' table
        return $this->hasMany(Testing::class, 'section_id', 'id');
    }
}
