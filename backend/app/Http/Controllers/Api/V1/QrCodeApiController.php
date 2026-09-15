<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\QrCode;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * API publik untuk integrator (paket Enterprise).
 *
 * Autentikasi lewat X-API-Key, bukan token login. Semua query dikunci ke
 * tenant pemilik kunci, jadi satu kunci tidak pernah bisa menyentuh data
 * workspace lain.
 */
class QrCodeApiController extends Controller
{
    public function index(Request $request)
    {
        $tenant = $request->attributes->get('api_key')->tenant;

        $perPage = (int) min(100, max(1, (int) $request->query('per_page', 25)));

        $qrs = QrCode::where('tenant_id', $tenant->id)
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = '%' . $request->query('q') . '%';
                $q->where('title', 'like', $term);
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($qrs);
    }

    public function show(Request $request, string $shortCode)
    {
        $tenant = $request->attributes->get('api_key')->tenant;

        $qr = QrCode::where('tenant_id', $tenant->id)
            ->where('short_code', $shortCode)
            ->first();

        if (!$qr) {
            return response()->json(['message' => 'QR code tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $qr]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'target_url' => 'required|url',
            'color' => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
        ]);

        $apiKey = $request->attributes->get('api_key');
        $tenant = $apiKey->tenant;

        // Kuota tetap dihitung per user pemilik kunci, konsisten dengan dashboard.
        $owner = $apiKey->user;

        if (!$owner->canCreateQr()) {
            return response()->json([
                'message' => "Kuota QR Code paket {$owner->planName()} sudah habis ({$owner->qrUsed()}/{$owner->qrLimit()}).",
                'code' => 'qr_limit_reached',
            ], 403);
        }

        do {
            $shortCode = Str::random(6);
        } while (QrCode::where('short_code', $shortCode)->exists());

        $qr = QrCode::create([
            'user_id' => $owner->id,
            'tenant_id' => $tenant->id,
            'title' => $validated['title'],
            'target_url' => $validated['target_url'],
            'short_code' => $shortCode,
            'color' => $validated['color'] ?? '#2563EB',
        ]);

        return response()->json([
            'message' => 'QR code dibuat.',
            'data' => $qr,
            'short_url' => url("/s/{$qr->short_code}"),
        ], 201);
    }

    public function stats(Request $request, string $shortCode)
    {
        $tenant = $request->attributes->get('api_key')->tenant;

        $qr = QrCode::where('tenant_id', $tenant->id)
            ->where('short_code', $shortCode)
            ->first();

        if (!$qr) {
            return response()->json(['message' => 'QR code tidak ditemukan.'], 404);
        }

        $logs = $qr->scanLogs();

        return response()->json([
            'short_code' => $qr->short_code,
            'total_scans' => $qr->scan_count,
            'last_scanned_at' => optional($qr->last_scanned_at)->toIso8601String(),
            'by_device' => $logs->clone()->whereNotNull('device_type')
                ->selectRaw('device_type as label, COUNT(*) as count')
                ->groupBy('device_type')->get(),
            'by_country' => $logs->clone()->whereNotNull('country')
                ->selectRaw('country as label, COUNT(*) as count')
                ->groupBy('country')->orderByDesc('count')->limit(10)->get(),
        ]);
    }
}