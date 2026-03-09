<?php

namespace App\Http\Controllers;

use App\Models\Design;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DesignController extends Controller
{
    /**
     * Display a listing of the designs.
     */
    public function index()
    {
        $designs = Design::all();
        return response()->json($designs, 200);
    }

    /**
     * Store a newly created design in storage.
     */
    public function store(Request $request)
    {
        // 1. Change 'url' to 'image' validation
        $request->validate([
            'section_id' => 'required|integer',
            'image_type' => 'required|string|max:255',
            'image_url'  => 'required|image|mimes:jpeg,png,webp,jpg|max:5120', // Max 5MB
        ]);

        try {
            // 2. Handle the File Upload
            if ($request->hasFile('image_url')) {
                $file = $request->file('image_url');
                
                // Store file in storage/app/public/designs
                $path = $file->store('designs', 'public');
                
                // Generate the full URL for the database
                $fullUrl = asset('storage/' . $path);

                // 3. Create the record
                $design = Design::create([
                    'section_id' => $request->section_id,
                    'image_type' => $request->image_type,
                    'image_url'  => $fullUrl, // Saving the generated URL string
                ]);

                return response()->json([
                    'message' => 'Design created successfully',
                    'data'    => $design
                ], 201);
            }

            return response()->json(['message' => 'No file uploaded'], 400);

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
        if ($request->hasFile('image_url')) {
            // Delete old file if you want to save space
            // Storage::disk('public')->delete(str_replace(asset('storage/'), '', $design->image_url));

            $path = $request->file('image_url')->store('designs', 'public');
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
}