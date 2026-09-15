<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use Illuminate\Http\Request;

/**
 * Manajemen API key milik workspace.
 *
 * Kunci mentah hanya dikembalikan SEKALI di respons create. Setelah itu yang
 * bisa dilihat cuma prefix-nya, jadi kalau hilang harus dibuat ulang — itu
 * memang perilaku yang diinginkan untuk sebuah kredensial.
 */
class ApiKeyController extends Controller
{
    public function index(Request $request)
    {
        $keys = $request->user()
            ->tenant
            ->apiKeys()
            ->with('user:id,name,email')
            ->latest()
            ->get();

        return response()->json([
            'data' => $keys,
            'feature_enabled' => (bool) ($request->user()->tenant->planDefinition()['features_enabled']['api_access'] ?? false),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'expires_in_days' => 'nullable|integer|min:1|max:3650',
        ]);

        $expiresAt = !empty($validated['expires_in_days'])
            ? now()->addDays((int) $validated['expires_in_days'])
            : null;

        [$key, $plain] = ApiKey::generate(
            $request->user(),
            $validated['name'],
            $expiresAt
        );

        return response()->json([
            'message' => 'API key dibuat. Salin sekarang — kunci ini tidak akan ditampilkan lagi.',
            'api_key' => $key,
            'plain_key' => $plain,
        ], 201);
    }

    public function toggle(Request $request, ApiKey $apiKey)
    {
        $this->authorizeKey($request, $apiKey);

        $apiKey->is_active = !$apiKey->is_active;
        $apiKey->save();

        return response()->json([
            'message' => $apiKey->is_active ? 'API key diaktifkan.' : 'API key dinonaktifkan.',
            'api_key' => $apiKey,
        ]);
    }

    public function destroy(Request $request, ApiKey $apiKey)
    {
        $this->authorizeKey($request, $apiKey);

        $apiKey->delete();

        return response()->json(['message' => 'API key dihapus permanen.']);
    }

    private function authorizeKey(Request $request, ApiKey $apiKey): void
    {
        if ($apiKey->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'API key ini bukan milik workspace kamu.');
        }
    }
}