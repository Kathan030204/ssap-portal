<?php

namespace App\Http\Controllers;

use App\Models\Design;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Response;

class DesignController extends Controller
{
    /**
     * Display a listing of the designs.
     */
    public function index(Request $request) // Add Request $request here
    {
        // Check if section_id is provided in the URL query string
        $sectionId = $request->query('section_id');
    
        if ($sectionId) {
            // Filter designs by the specific section_id
            $designs = Design::where('section_id', $sectionId)->get();
        } else {
            // Fallback: Return all or an empty array depending on your preference
            $designs = Design::all(); 
        }
        return response()->json($designs, 200);
    }
    /**
     * Store a newly created design in storage.
     */
    public function store(Request $request)
{
    $request->validate([
        'section_id' => 'required|integer',
        'image_type' => 'required|string|max:255',
        'image_url'  => 'required|image|mimes:jpeg,png,webp,jpg,gif', 
    ]);

    try {
        if ($request->hasFile('image_url')) {
            $file = $request->file('image_url');
            
            // 1. Get the original name from the designer's computer
            $originalName = $file->getClientOriginalName();
            
            // 2. Remove spaces and special characters for a clean URL
            $cleanName = (  $originalName);

            // 3. Use storeAs instead of store
            // 'designs' is the folder, $cleanName is our custom name, 'public' is the disk
            $path = $file->storeAs('designs', $cleanName, 'public');
            
            $fullUrl = asset('storage/' . $path);

            $design = Design::create([
                'section_id' => $request->section_id,
                'image_type' => $request->image_type,
                'image_url'  => $fullUrl, 
            ]);

            return response()->json([
                'message' => 'Design created successfully',
                'data'    => $design
            ], 201);
        }
    } catch (\Exception $e) {
        return response()->json(['message' => 'Upload failed: ' . $e->getMessage()], 500);
    }
}

    /**
     * Display the specified design.
     */
    public function show($id)
    {
        $design = Design::find($id);

        if (!$design) {
            return response()->json(['message' => 'Design not found'], 404);
        }

        return response()->json($design, 200);
    }

    /**
     * Update the specified design in storage.
     */
    public function update(Request $request, $id)
    {
        $design = Design::find($id);

        if (!$design) {
            return response()->json(['message' => 'Design not found'], 404);
        }

        // Use 'sometimes' so fields are optional during update
        $validated = $request->validate([
            'section_id' => 'sometimes|integer',
            'image_type' => 'sometimes|string',
            'image_url'  => 'sometimes|image|mimes:jpeg,png,webp',
        ]);

        // If a new file is uploaded during update
        // Inside update(Request $request, $id)
        if ($request->hasFile('image_url')) {
            $file = $request->file('image_url');
            $originalName = $file->getClientOriginalName();
            $cleanName = time() . '_' . str_replace(' ', '_', $originalName);

            // Store with original name
            $path = $file->storeAs('designs', $cleanName, 'public');
            $validated['image_url'] = asset('storage/' . $path);
        }

        $design->update($validated);

        return response()->json([
            'message' => 'Design updated successfully',
            'data'    => $design
        ], 200);
    }

    /**
     * Remove the specified design from storage.
     */
    public function destroy($id)
    {
        $design = Design::find($id);

        if (!$design) {
            return response()->json(['message' => 'Design not found'], 404);
        }

        // Optional: Delete the actual file from storage before deleting DB record
        $filePath = str_replace(asset('storage/'), '', $design->image_url);
        Storage::disk('public')->delete($filePath);

        $design->delete();

        return response()->json([
            'message' => 'Design deleted successfully'
        ], 200);
    }

    public function download($id)
{
    $design = Design::find($id);

    if (!$design) {
        return response()->json(['message' => 'Design not found'], 404);
    }

    // 1. Extract the path after "/storage/"
    // This is safer than using str_replace with asset()
    $urlParts = explode('/storage/', $design->image_url);
    $relativePath = end($urlParts); 

    // 2. Check existence on the 'public' disk
    if (Storage::disk('public')->exists($relativePath)) {
        return Storage::disk('public')->download(
            $relativePath, 
            basename($relativePath)
        );
    }

    // 3. Debugging: If it still fails, return the path it was looking for
    return response()->json([
        'message' => 'File not found on disk',
        'tried_path' => $relativePath,
        'full_url' => $design->image_url
    ], 404);
}
}