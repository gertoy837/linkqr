<?php

namespace App\Http\Controllers;

use App\Models\QrScanLog;
use App\Support\DateGrouping;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Aggregated analytics across every QR code owned by the caller.
     *
     * Query params:
     *   days       - window size for the time series / breakdowns (default 30)
     *   qr_code_id - optional single-QR filter
     */
    public function summary(Request $request)
    {
        $user = $request->user();

        $days = (int) $request->query('days', 30);
        $days = max(1, min($days, 365));

        $qrQuery = $user->qrCodes();
        if ($request->filled('qr_code_id')) {
            $qrQuery->where('id', (int) $request->query('qr_code_id'));
        }
        $qrIds = $qrQuery->pluck('id');

        // "QR Aktif" harus benar-benar menghitung yang aktif. Sebelumnya memakai
        // jumlah seluruh QR milik user, jadi angka di dashboard (dan di kolom
        // "QR Aktif" pada ekspor CSV) tidak cocok dengan kenyataan.
        $activeQrCount = $user->qrCodes()->where('is_active', true)->count();

        $empty = [
            'total_scans' => 0,
            'scans_today' => 0,
            'scans_window' => 0,
            'previous_window' => 0,
            'growth' => 0.0,
            'unique_visitors' => 0,
            'active_qr' => $activeQrCount,
            'days' => $days,
            'series' => [],
            'by_device' => [],
            'by_os' => [],
            'by_browser' => [],
            'by_country' => [],
            'top_qr' => [],
            'recent' => [],
        ];

        if ($qrIds->isEmpty()) {
            return response()->json($empty);
        }

        $now = Carbon::now();
        $windowStart = $now->copy()->subDays($days - 1)->startOfDay();
        $prevStart = $windowStart->copy()->subDays($days)->startOfDay();
        $todayStart = $now->copy()->startOfDay();

        $base = fn () => QrScanLog::whereIn('qr_code_id', $qrIds);

        // ---- Headline counters -------------------------------------------
        $totalScans = $base()->count();
        $scansToday = $base()->where('scanned_at', '>=', $todayStart)->count();
        $scansWindow = $base()->where('scanned_at', '>=', $windowStart)->count();
        $scansPrev = $base()
            ->whereBetween('scanned_at', [$prevStart, $windowStart->copy()->subSecond()])
            ->count();

        $growth = $scansPrev > 0
            ? round((($scansWindow - $scansPrev) / $scansPrev) * 100, 1)
            : ($scansWindow > 0 ? 100.0 : 0.0);

        $uniqueVisitors = $base()
            ->where('scanned_at', '>=', $windowStart)
            ->whereNotNull('ip_address')
            ->distinct()
            ->count('ip_address');

        // ---- Daily series (zero-filled so the chart is continuous) -------
        $rawSeries = $base()
            ->where('scanned_at', '>=', $windowStart)
            ->select(
                DB::raw(DateGrouping::dayExpression('scanned_at') . ' as day'),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $windowStart->copy()->addDays($i)->toDateString();
            $series[] = [
                'date' => $date,
                'count' => (int) ($rawSeries[$date] ?? 0),
            ];
        }

        // ---- Breakdowns ---------------------------------------------------
        $breakdown = function (string $column) use ($base, $windowStart) {
            return $base()
                ->where('scanned_at', '>=', $windowStart)
                ->whereNotNull($column)
                ->where($column, '!=', '')
                ->select($column, DB::raw('COUNT(*) as total'))
                ->groupBy($column)
                ->orderByDesc('total')
                ->limit(8)
                ->get()
                ->map(fn ($row) => ['label' => (string) $row->{$column}, 'count' => (int) $row->total])
                ->all();
        };

        // ---- Most scanned QR codes ---------------------------------------
        $topQr = QrScanLog::whereIn('qr_code_id', $qrIds)
            ->where('scanned_at', '>=', $windowStart)
            ->select('qr_code_id', DB::raw('COUNT(*) as total'))
            ->groupBy('qr_code_id')
            ->orderByDesc('total')
            ->limit(5)
            ->with('qrCode:id,title,short_code')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->qr_code_id,
                'title' => $row->qrCode->title ?? 'QR #' . $row->qr_code_id,
                'short_code' => $row->qrCode->short_code ?? null,
                'count' => (int) $row->total,
            ])
            ->all();

        // ---- Recent scans -------------------------------------------------
        $recent = $base()
            ->orderByDesc('scanned_at')
            ->limit(15)
            ->get(['id', 'qr_code_id', 'country', 'city', 'device_type', 'os', 'browser', 'scanned_at'])
            ->map(fn ($log) => [
                'id' => $log->id,
                'qr_code_id' => $log->qr_code_id,
                'country' => $log->country,
                'city' => $log->city,
                'device_type' => $log->device_type,
                'os' => $log->os,
                'browser' => $log->browser,
                'scanned_at' => optional($log->scanned_at)->toIso8601String(),
            ])
            ->all();

        return response()->json([
            'total_scans' => $totalScans,
            'scans_today' => $scansToday,
            'scans_window' => $scansWindow,
            'previous_window' => $scansPrev,
            'growth' => $growth,
            'unique_visitors' => $uniqueVisitors,
            'active_qr' => $activeQrCount,
            'days' => $days,
            'series' => $series,
            'by_device' => $breakdown('device_type'),
            'by_os' => $breakdown('os'),
            'by_browser' => $breakdown('browser'),
            'by_country' => $breakdown('country'),
            'top_qr' => $topQr,
            'recent' => $recent,
        ]);
    }
}