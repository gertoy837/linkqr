<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentikasi lewat header X-API-Key untuk endpoint publik /api/v1/*.
 *
 * Berbeda dari Sanctum yang memakai token per-user, di sini kuncinya milik
 * workspace: integrator boleh memakainya dari server mana pun tanpa login.
 * Middleware ini juga menegakkan paket — API access hanya untuk Enterprise.
 */
class AuthenticateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->header('X-API-Key')
            ?: $request->bearerToken();

        if (!$plain) {
            return response()->json([
                'message' => 'API key tidak ditemukan. Sertakan header X-API-Key.',
                'code' => 'api_key_missing',
            ], 401);
        }

        $key = ApiKey::with('tenant')->where('key_hash', hash('sha256', $plain))->first();

        if (!$key) {
            return response()->json([
                'message' => 'API key tidak valid.',
                'code' => 'api_key_invalid',
            ], 401);
        }

        if (!$key->isValid()) {
            return response()->json([
                'message' => $key->is_expired
                    ? 'API key sudah kedaluwarsa.'
                    : 'API key sedang dinonaktifkan.',
                'code' => $key->is_expired ? 'api_key_expired' : 'api_key_disabled',
            ], 401);
        }

        if (!$key->tenant || !$key->tenant->is_active) {
            return response()->json([
                'message' => 'Workspace pemilik API key ini sedang nonaktif.',
                'code' => 'tenant_suspended',
            ], 403);
        }

        // Gate paket: Enterprise yang menjanjikan "Akses API Developer".
        // Tanpa cek ini, fitur itu jadi janji kosong.
        if (!($key->tenant->planDefinition()['features_enabled']['api_access'] ?? false)) {
            return response()->json([
                'message' => 'Akses API hanya tersedia pada paket Enterprise. Upgrade untuk mengaktifkan.',
                'code' => 'plan_upgrade_required',
                'current_plan' => $key->tenant->plan,
            ], 403);
        }

        $key->touchLastUsed();

        $request->attributes->set('api_key', $key);
        $request->setUserResolver(fn () => $key->user);

        return $next($request);
    }
}