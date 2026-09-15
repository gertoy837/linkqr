<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate fitur berdasarkan paket.
 *
 * Dipakai sebagai `feature:export` di route. Tanpa ini, fitur yang diiklankan
 * di halaman harga (export, custom domain, API) hanya jadi tulisan — siapa pun
 * di paket Starter bisa memakainya.
 */
class EnsurePlanFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();
        $tenant = $user?->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan.'], 404);
        }

        $enabled = $tenant->planDefinition()['features_enabled'][$feature] ?? false;

        // Admin selalu boleh, supaya operator bisa menguji fitur tanpa harus
        // menaikkan paket workspace-nya sendiri.
        if (!$enabled && !$user->is_admin) {
            return response()->json([
                'message' => "Fitur ini tersedia pada paket yang lebih tinggi. Upgrade untuk mengaktifkan.",
                'code' => 'plan_upgrade_required',
                'feature' => $feature,
                'current_plan' => $tenant->plan,
                'current_plan_name' => $tenant->planName(),
            ], 403);
        }

        return $next($request);
    }
}