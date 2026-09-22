<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Support\DateGrouping;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        // Kuota paket ditegakkan di dalam User::createQrWithinQuota(), dalam satu
        // transaksi dengan pembuatan QR — memeriksa lalu membuat sebagai dua
        // langkah terpisah membiarkan dua permintaan paralel dua-duanya lolos.
        //
        // Dihitung per USER, bukan per tenant: dashboard menampilkan QR milik
        // user ini sendiri, jadi hitungan tingkat tenant membuat bar pemakaian
        // tidak cocok dengan daftarnya.
        $user = $request->user();

        $qr = $user->createQrWithinQuota([
            'title' => $validated['title'],
            'target_url' => $validated['target_url'],
            'color' => $validated['color'] ?? '#2563EB',
            'logo' => $validated['logo'] ?? null,
        ]);

        if (!$qr) {
            return response()->json([
                'message' => "Kuota QR Code paket {$user->planName()} sudah habis "
                    . "({$user->qrUsed()}/{$user->qrLimit()}). Upgrade paket untuk menambah QR.",
                'code' => 'qr_limit_reached',
                'usage' => [
                    'qr_used' => $user->qrUsed(),
                    'qr_limit' => $user->qrLimit(),
                ],
            ], 403);
        }

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

        $since = Carbon::now()->subDays(29)->startOfDay();

        // Semua agregasi dilakukan di SQL. Versi sebelumnya memuat SELURUH scan
        // log ke memori lalu mengelompokkannya di PHP — untuk QR yang sudah
        // discan puluhan ribu kali itu memuat puluhan ribu model sekaligus.
        $perDay = $qrCode->scanLogs()
            ->where('scanned_at', '>=', $since)
            ->select(
                DB::raw(DateGrouping::dayExpression('scanned_at') . ' as day'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('day')
            ->pluck('total', 'day');

        $devices = $qrCode->scanLogs()
            ->whereNotNull('device_type')
            ->where('device_type', '!=', '')
            ->select('device_type as label', DB::raw('COUNT(*) as total'))
            ->groupBy('device_type')
            ->pluck('total', 'label');

        $countries = $qrCode->scanLogs()
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->select('country as label', DB::raw('COUNT(*) as total'))
            ->groupBy('country')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'label');

        // Terbaru dulu. Tanpa orderBy, "recent_logs" justru mengembalikan scan
        // paling LAMA karena SQLite mengembalikan baris dalam urutan penyisipan.
        $recent = $qrCode->scanLogs()
            ->orderByDesc('scanned_at')
            ->limit(10)
            ->get();

        return response()->json([
            'total_scans' => $qrCode->scan_count,
            'last_30_days' => $perDay,
            'devices' => $devices,
            'countries' => $countries,
            'recent_logs' => $recent,
        ]);
    }
}