<?php

namespace App\Http\Controllers;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    public function index() { 
        return Account::all(); 
    }

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

    /**
     * FIX: Added the missing update method
     */
    public function update(Request $request, $id)
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $validated = $request->validate([
            // Ensure uniqueness but ignore the current user's ID
            'username' => ['required', 'string', Rule::unique('accounts')->ignore($id)],
            'email'    => ['required', 'email', Rule::unique('accounts')->ignore($id)],
            'role'     => 'required|string',
            'password' => 'nullable|string|min:8', // Optional during update
        ]);

        // Only update password if a new one is provided
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $account->update($validated);

        return response()->json([
            'message' => 'Account updated successfully',
            'data' => $account
        ], 200);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'role'     => 'required|string'
        ]);

        $user = Account::where('email', $credentials['email'])->first();

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
        $user = Account::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        $user->delete();
        return response()->json(['message' => 'User deleted successfully'], 200);
    }

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
    
        if (Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'New password cannot be the same as your current password.'], 400);
        }
    
        $user->password = Hash::make($request->password);
        $user->save();
    
        return response()->json(['message' => 'Password updated successfully!'], 200);
    }
}