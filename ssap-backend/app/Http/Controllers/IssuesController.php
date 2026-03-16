<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Testing; // Your Issue model
use App\Models\Section; // To update section status

class IssuesController extends Controller
{
    /**
     * READ: Display a listing of all issues.
     */
    public function index()
    {
        return response()->json(Testing::all(), 200);
    }

    /**
     * CREATE: Store a newly created issue in the database.
     * This replaces the logic previously in SectionController.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'section_id'  => 'required|exists:sections,id',
            'type'        => 'required|string',
            'severity'    => 'required|string',
            'description' => 'required|string',
        ]);

        // 1. Create the Issue
        $issue = Testing::create([
            'section_id'  => $validated['section_id'],
            'type'        => $validated['type'],
            'severity'    => $validated['severity'],
            'description' => $validated['description'],
        ]);

        // 2. Automatically update the Section status to "Issue Logged"
        $section = Section::find($validated['section_id']);
        if ($section) {
            $section->update(['current_status' => 'Issue Logged']);
        }

        return response()->json([
            'message' => 'Issue created and section status updated.',
            'issue'   => $issue
        ], 201);
    }

    /**
     * READ: Display a specific issue.
     */
    public function show($id)
    {
        $issue = Testing::find($id);
        if (!$issue) {
            return response()->json(['message' => 'Issue not found'], 404);
        }
        return response()->json($issue, 200);
    }

    /**
     * UPDATE: Update the specified issue in database.
     */
    public function update(Request $request, $id)
    {
        $issue = Testing::find($id);

        if (!$issue) {
            return response()->json(['message' => 'Issue not found'], 404);
        }

        $validated = $request->validate([
            'type'        => 'sometimes|string',
            'severity'    => 'sometimes|string',
            'description' => 'sometimes|string',
        ]);

        $issue->update($validated);

        return response()->json([
            'message' => 'Issue updated successfully',
            'issue'   => $issue
        ], 200);
    }

    /**
     * DELETE: Remove the specified issue from database.
     */
    public function destroy($id)
    {
        $issue = Testing::find($id);
        if (!$issue) {
            return response()->json(['message' => 'Issue not found'], 404);
        }

        $issue->delete();
        return response()->json(['message' => 'Issue deleted successfully'], 200);
    }
}