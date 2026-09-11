<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class LoginController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if ($request->isMethod('options')) {
            return response()->json(['status' => 'ok'], 200);
        }

        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Invalid email or password.'
            ], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('momentum_pwa')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'token'  => $token,
            'user'   => [
                'id'    => $user->id,
                'email' => $user->email,
            ],
        ], 200);
    }
}
