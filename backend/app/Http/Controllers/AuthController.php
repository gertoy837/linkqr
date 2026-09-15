<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'plan' => 'nullable|string|in:' . implode(',', array_keys(config('plans', []))),
            'billing_cycle' => 'nullable|string|in:monthly,yearly',
        ]);

        $planKey = $validated['plan'] ?? 'starter';
        $cycle = $validated['billing_cycle'] ?? 'monthly';

        // Enterprise is sales-led: it can't be self-activated at signup.
        if (!empty(config("plans.{$planKey}.contact_only"))) {
            throw ValidationException::withMessages([
                'plan' => ['Paket Enterprise diaktifkan lewat tim kami. Hubungi support untuk melanjutkan.'],
            ]);
        }

        // Every signup gets its own workspace. Without this, all users landed
        // in tenant 1 and shared the same QR inventory and quota.
        $tenant = Tenant::create([
            'name' => $validated['name'] . "'s Workspace",
            'slug' => $this->uniqueSlug($validated['name']),
            'is_active' => true,
            'plan' => $planKey,
            'billing_cycle' => $cycle,
            'plan_expires_at' => $planKey === 'starter'
                ? null
                : ($cycle === 'yearly' ? Carbon::now()->addYear() : Carbon::now()->addMonth()),
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'tenant_id' => $tenant->id,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('tenant'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user->load('tenant'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user()->load('tenant'));
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'workspace';
        $slug = $base;
        $i = 1;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }

        return $slug;
    }
}