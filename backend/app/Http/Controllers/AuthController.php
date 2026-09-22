<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
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

        // The plan picked on the pricing page is an *intent*, not a purchase.
        // It is echoed back so the client can send the visitor straight to
        // checkout, but it never lands on the tenant: a paid plan is only ever
        // activated by a verified payment (InvoiceController + the admin
        // verification console). Signing up used to write this straight onto
        // the tenant, which handed out Business Pro for free.
        $requestedPlan = $validated['plan'] ?? 'starter';
        $requestedCycle = $validated['billing_cycle'] ?? 'monthly';

        // Enterprise is sales-led: it can't be self-activated at signup.
        if (!empty(config("plans.{$requestedPlan}.contact_only"))) {
            throw ValidationException::withMessages([
                'plan' => ['Paket Enterprise diaktifkan lewat tim kami. Hubungi support untuk melanjutkan.'],
            ]);
        }

        // Every signup gets its own workspace. Without this, all users landed
        // in tenant 1 and shared the same QR inventory and quota.
        //
        // A new workspace always starts on the free plan, so no one can reach a
        // paid tier without paying for it.
        $tenant = Tenant::create([
            'name' => $validated['name'] . "'s Workspace",
            'slug' => $this->uniqueSlug($validated['name']),
            'is_active' => true,
            'plan' => 'starter',
            'billing_cycle' => 'monthly',
            'plan_expires_at' => null,
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
            // Echoed for the signup page: nothing has been charged or activated
            // yet, this only tells the client which checkout to open.
            'requested_plan' => $requestedPlan,
            'requested_billing_cycle' => $requestedCycle,
            'requires_payment' => (int) (config("plans.{$requestedPlan}.price.{$requestedCycle}") ?? 0) > 0,
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

        // Workspace yang dinonaktifkan tidak boleh dipakai lagi. Admin tetap
        // bisa masuk: dia yang perlu mengaktifkannya kembali.
        if (!$user->is_admin && $user->tenant && !$user->tenant->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Workspace akun ini sedang dinonaktifkan. Hubungi admin untuk mengaktifkan kembali.'],
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