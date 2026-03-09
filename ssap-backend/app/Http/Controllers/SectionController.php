<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\Testing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

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
            'zip_file'   => 'required|file|extensions:zip,rar,jpg,jpeg,png,liquid', 
        ], [
            'zip_file.extensions' => 'The file must be a zip, rar, image, or a .liquid file.'
        ]);

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
            $section->current_status = $request->current_status ?? 'In Testing';
        }

        // --- 2. HANDLE STATUS UPDATES ---
        if ($request->has('current_status')) {
            $section->current_status = $request->current_status;
        }

        $section->save();

        // --- 3. HANDLE ISSUE LOGGING (Tester Logic) ---
        if ($request->current_status === 'Issue Logged') {
            Testing::create([
                'section_id'  => $id,
                'type'        => $request->type,
                'severity'    => $request->severity,
                'description' => $request->description,
            ]);
        }

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
}