<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\Testing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage; // Add this at the top with other imports

class SectionController extends Controller
{
    public function index() {
        return response()->json(Section::with('issues')->get());
    }

    public function store(Request $request) {
        // Validation: Added 'liquid' to the allowed extensions list
        $request->validate([
            'title'      => 'required|string|max:255',
            'creator_id' => 'required',
            'zip_file'   => 'required|file|extensions:zip,jpg,jpeg,png,liquid',
        ], [
            'zip_file.extensions' => 'The file must be a zip, rar, image, or a .liquid file.'
        ],
        );

        $path = null;
        if ($request->hasFile('zip_file')) {
            $file = $request->file('zip_file');
            
            // It is safer to use a unique name or slug, but keeping your original logic:
            $fileName = $file->getClientOriginalName();
            $path = $file->storeAs('sections', $fileName);
        }

        $section = Section::create([
            'title'          => $request->title,
            'creator_id'     => $request->creator_id,
            'current_status' => $request->current_status ?? 'In Testing',
            'zip_url'        => $path, 
            // Force a default string if the request is empty
            'live_link' => $request->live_link, 
            'shopify_admin_link' => $request->shopify_admin_link
        ]);

        return response()->json([
            'message' => 'Section created successfully',
            'data' => $section
        ], 201);
    }

    public function show($id) {
        $section = Section::with('issues')->find($id);
        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }
        return response()->json($section, 200);
    }

    /**
     * COMBINED UPDATE LOGIC
     * Handles: Admin Task Assignment & Tester Issue Logging
     */
    public function update(Request $request, $id) {
        $section = Section::find($id);

        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }

        // --- 1. HANDLE ADMIN TASK ASSIGNMENT ---
        if ($request->has('tester_id')) {
            $section->tester_id = $request->tester_id;
            $section->current_status = $request->current_status ?? 'Pending Allocation';
        }
        // --- 1. HANDLE ADMIN TASK ASSIGNMENT ---
        if ($request->has('designer_id')) {
            $section->designer_id = $request->designer_id;
            $section->current_status = $request->current_status ?? 'Pending Admin';
        }

        // --- 2. HANDLE STATUS UPDATES ---
        if ($request->has('current_status')) {
            $section->current_status = $request->current_status;
        }

        $section->save();

        return response()->json([
            'message' => 'Section updated successfully',
            'data' => $section->load('issues')
        ], 200);
    }

    public function destroy($id) {
        $section = Section::find($id);
        if (!$section) {
            return response()->json(['message' => 'Section not found'], 404);
        }
        $section->delete();
        return response()->json(['message' => 'Section deleted successfully'], 200);
    }

    public function download($id) {
        $section = Section::find($id);

        if (!$section || !$section->zip_url) {
            return response()->json(['message' => 'File path not found'], 404);
        }

        if (!Storage::disk('local')->exists($section->zip_url)) {
            return response()->json(['message' => 'File missing on server'], 404);
        }

        // Get original mime type (e.g., application/zip or image/png)
        $mimeType = Storage::disk('local')->mimeType($section->zip_url);
        $path = Storage::disk('local')->path($section->zip_url);

        // Clean buffer to prevent corruption
        if (ob_get_level()) ob_end_clean();

        return response()->download($path, basename($section->zip_url), [
            'Content-Type' => $mimeType,
            'Access-Control-Expose-Headers' => 'Content-Disposition'
        ]);
    }
    
    public function getDesignerTasks(Request $request, $designerId) {
        // Fetches sections where the designer_id matches the logged-in designer
        $sections = Section::where('designer_id', $designerId)
                           ->with('issues')
                           .get();
        return response()->json($sections);
    }
}
