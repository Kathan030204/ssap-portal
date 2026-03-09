<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash; // Added this
use Illuminate\Support\Facades\Validator;

class AccountController extends Controller
{
    public function index() { return Account::all(); }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|unique:accounts',
            'email'    => 'required|email|unique:accounts',
            'password' => 'required|string|min:8',
            'role'     => 'required|string'
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $account = Account::create($validated);

        return response()->json([
            'message' => 'Account created successfully',
            'data' => $account
        ], 201);
    }

    // ADD THIS LOGIN FUNCTION
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'role'     => 'required|string'
        ]);

        // Find the user by email
        $user = Account::where('email', $credentials['email'])->first();

        // Check password and role matching
        if ($user && Hash::check($credentials['password'], $user->password)) {
            if ($user->role === $credentials['role']) {
                return response()->json([
                    'message' => 'Login successful',
                    'user' => $user
                ], 200);
            }
            
            return response()->json(['message' => 'Role mismatch for this account.'], 403);
        }

        return response()->json(['message' => 'Invalid email or password.'], 401);
    }

    public function destroy($id) {
        $section = Account::find($id);
        if (!$section) {
            return response()->json(['message' => 'User not found'], 404);
        }
        $section->delete();
        return response()->json(['message' => 'User deleted successfully'], 200);
    }

    // Add this inside your AccountController class
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);
    
        $user = Account::where('email', $request->email)->first();
    
        if (!$user) {
            return response()->json(['message' => 'Email address not found.'], 404);
        }
    
        // Check if new password is same as old password
        if (Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'New password cannot be the same as your current password.'], 400);
        }
    
        // Update password
        $user->password = Hash::make($request->password);
        $user->save();
    
        return response()->json(['message' => 'Password updated successfully!'], 200);
    }
}