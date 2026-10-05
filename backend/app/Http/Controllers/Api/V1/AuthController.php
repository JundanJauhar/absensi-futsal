<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            // "username" is the team account name; "email" kept for backward compatibility
            'username' => ['required_without:email', 'nullable', 'string', 'max:255'],
            'email' => ['required_without:username', 'nullable', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim((string) ($credentials['username'] ?? $credentials['email'] ?? ''));
        $normalized = mb_strtolower($identifier);

        $user = User::query()
            ->whereRaw('LOWER(name) = ?', [$normalized])
            ->orWhereRaw('LOWER(email) = ?', [$normalized])
            ->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Username atau kata sandi tidak sesuai.'],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $user->createToken('ftms-web')->plainTextToken,
                'user' => $user,
            ],
            'meta' => [],
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(['success' => true, 'data' => $request->user(), 'meta' => []]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['success' => true, 'data' => null, 'meta' => []]);
    }
}
