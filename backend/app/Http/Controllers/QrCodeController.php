<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Models\QrScanLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class QrCodeController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $qrs = $request->user()->qrCodes()->latest()->get();
        return response()->json($qrs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'target_url' => 'required|url',
            'color' => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
            'logo' => 'nullable|string',
        ]);

        // Generate unique short code
        do {
            $shortCode = Str::random(6);
        } while (QrCode::where('short_code', $shortCode)->exists());

        $qr = $request->user()->qrCodes()->create([
            'title' => $validated['title'],
            'target_url' => $validated['target_url'],
            'short_code' => $shortCode,
            'color' => $validated['color'] ?? '#2563EB',
            'logo' => $validated['logo'] ?? null,
            'tenant_id' => $request->user()->tenant_id ?? 1,
        ]);

        return response()->json($qr, 201);
    }

    public function show(QrCode $qrCode)
    {
        $this->authorize('view', $qrCode);
        return response()->json($qrCode);
    }

    public function update(Request $request, QrCode $qrCode)
    {
        $this->authorize('update', $qrCode);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'target_url' => 'sometimes|url',
            'is_active' => 'sometimes|boolean',
            'color' => 'nullable|regex:/^#[0-9A-Fa-f]{6}$/',
            'logo' => 'nullable|string',
        ]);

        $qrCode->update($validated);

        return response()->json($qrCode);
    }

    public function destroy(QrCode $qrCode)
    {
        $this->authorize('delete', $qrCode);
        $qrCode->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function stats(QrCode $qrCode)
    {
        $this->authorize('view', $qrCode);

        $totalScans = $qrCode->scan_count;
        $logs = $qrCode->scanLogs;

        // Per day (last 30 days)
        $perDay = $logs->groupBy(function ($log) {
            return $log->scanned_at->format('Y-m-d');
        })->map->count();

        // Device breakdown
        $devices = $logs->groupBy('device_type')->map->count();

        // Top countries
        $countries = $logs->groupBy('country')->map->count()->sortDesc()->take(5);

        return response()->json([
            'total_scans' => $totalScans,
            'last_30_days' => $perDay->take(30),
            'devices' => $devices,
            'countries' => $countries,
            'recent_logs' => $logs->take(10),
        ]);
    }
}