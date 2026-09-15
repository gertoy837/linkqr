<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Models\QrScanLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Export laporan — fitur yang diiklankan di paket Business Pro.
 *
 * Dua format:
 *  - PDF  : laporan siap cetak/kirim ke klien (dompdf)
 *  - CSV  : dibuka langsung di Excel/Google Sheets
 *
 * CSV dipakai untuk "Excel" karena Excel membuka CSV secara native, sementara
 * xlsx butuh dependensi tambahan (PhpSpreadsheet) yang belum perlu di sini.
 */
class ExportController extends Controller
{
    public function analytics(Request $request)
    {
        $validated = $request->validate([
            'days' => 'nullable|integer|min:1|max:365',
            'format' => 'nullable|string|in:pdf,csv',
            'qr_code_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $days = $validated['days'] ?? 30;
        $format = $validated['format'] ?? 'pdf';

        $qrIds = $user->qrCodes()
            ->when(
                !empty($validated['qr_code_id']),
                fn ($q) => $q->where('id', $validated['qr_code_id'])
            )
            ->pluck('id');

        $now = Carbon::now();
        $from = $now->copy()->subDays($days - 1)->startOfDay();

        $logs = QrScanLog::whereIn('qr_code_id', $qrIds)
            ->where('scanned_at', '>=', $from);

        $totalScans = (clone $logs)->count();
        $uniqueVisitors = (clone $logs)->whereNotNull('ip_address')->distinct()->count('ip_address');

        $series = (clone $logs)
            ->select(DB::raw("strftime('%Y-%m-%d', scanned_at) as day"), DB::raw('COUNT(*) as total'))
            ->groupBy('day')
            ->pluck('total', 'day');

        $days_series = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $from->copy()->addDays($i)->toDateString();
            $days_series[] = ['date' => $date, 'count' => (int) ($series[$date] ?? 0)];
        }

        $breakdown = function (string $column) use ($logs) {
            return (clone $logs)
                ->whereNotNull($column)
                ->where($column, '!=', '')
                ->select($column, DB::raw('COUNT(*) as total'))
                ->groupBy($column)
                ->orderByDesc('total')
                ->limit(10)
                ->get()
                ->map(fn ($r) => ['label' => (string) $r->{$column}, 'count' => (int) $r->total])
                ->all();
        };

        $payload = [
            'generated_at' => $now,
            'period_days' => $days,
            'period_from' => $from,
            'period_to' => $now,
            'workspace' => $user->tenant->name ?? '-',
            'user' => $user->name,
            'total_scans' => $totalScans,
            'unique_visitors' => $uniqueVisitors,
            'active_qr' => $qrIds->count(),
            'series' => $days_series,
            'by_device' => $breakdown('device_type'),
            'by_country' => $breakdown('country'),
            'by_os' => $breakdown('os'),
            'by_browser' => $breakdown('browser'),
            'top_qr' => QrScanLog::whereIn('qr_code_id', $qrIds)
                ->where('scanned_at', '>=', $from)
                ->select('qr_code_id', DB::raw('COUNT(*) as total'))
                ->groupBy('qr_code_id')
                ->orderByDesc('total')
                ->limit(10)
                ->with('qrCode:id,title,short_code')
                ->get()
                ->map(fn ($r) => [
                    'title' => $r->qrCode->title ?? ('QR #' . $r->qr_code_id),
                    'short_code' => $r->qrCode->short_code ?? '-',
                    'count' => (int) $r->total,
                ])
                ->all(),
        ];

        $stamp = $now->format('Ymd-His');

        if ($format === 'csv') {
            return $this->analyticsCsv($payload, $stamp);
        }

        $pdf = Pdf::loadView('exports.analytics', $payload)
            ->setPaper('a4', 'portrait');

        return $pdf->download("linkqr-analitik-{$stamp}.pdf");
    }

    public function qrCodes(Request $request)
    {
        $validated = $request->validate([
            'format' => 'nullable|string|in:csv',
        ]);

        $user = $request->user();

        $qrs = QrCode::where('user_id', $user->id)
            ->orderByDesc('scan_count')
            ->get();

        $stamp = Carbon::now()->format('Ymd-His');
        $filename = "linkqr-daftar-qr-{$stamp}.csv";

        return response()->streamDownload(function () use ($qrs) {
            $out = fopen('php://output', 'w');

            // BOM supaya Excel membaca UTF-8 dengan benar (tanpa ini, huruf
            // beraksen jadi mojibake di Excel versi Windows).
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Nama', 'Link Pendek', 'Target URL', 'Status',
                'Total Scan', 'Scan Terakhir', 'Dibuat',
            ]);

            foreach ($qrs as $qr) {
                fputcsv($out, [
                    $qr->title,
                    url("/s/{$qr->short_code}"),
                    $qr->target_url,
                    $qr->is_active ? 'Aktif' : 'Nonaktif',
                    $qr->scan_count,
                    optional($qr->last_scanned_at)->format('Y-m-d H:i'),
                    optional($qr->created_at)->format('Y-m-d H:i'),
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function analyticsCsv(array $payload, string $stamp)
    {
        $filename = "linkqr-analitik-{$stamp}.csv";

        return response()->streamDownload(function () use ($payload) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, ['Laporan Analitik LinkQR']);
            fputcsv($out, ['Workspace', $payload['workspace']]);
            fputcsv($out, ['Dibuat oleh', $payload['user']]);
            fputcsv($out, ['Periode', $payload['period_from']->format('d M Y') . ' - ' . $payload['period_to']->format('d M Y')]);
            fputcsv($out, ['Dibuat pada', $payload['generated_at']->format('d M Y H:i')]);
            fputcsv($out, []);

            fputcsv($out, ['RINGKASAN']);
            fputcsv($out, ['Total Scan', $payload['total_scans']]);
            fputcsv($out, ['Pengunjung Unik', $payload['unique_visitors']]);
            fputcsv($out, ['QR Aktif', $payload['active_qr']]);
            fputcsv($out, []);

            fputcsv($out, ['TREN HARIAN']);
            fputcsv($out, ['Tanggal', 'Jumlah Scan']);
            foreach ($payload['series'] as $point) {
                fputcsv($out, [$point['date'], $point['count']]);
            }
            fputcsv($out, []);

            foreach ([
                'PERANGKAT' => 'by_device',
                'NEGARA' => 'by_country',
                'SISTEM OPERASI' => 'by_os',
                'BROWSER' => 'by_browser',
            ] as $title => $key) {
                fputcsv($out, [$title]);
                fputcsv($out, ['Label', 'Jumlah']);
                foreach ($payload[$key] as $row) {
                    fputcsv($out, [$row['label'], $row['count']]);
                }
                fputcsv($out, []);
            }

            fputcsv($out, ['QR PALING BANYAK DISCAN']);
            fputcsv($out, ['Nama', 'Link Pendek', 'Jumlah Scan']);
            foreach ($payload['top_qr'] as $row) {
                fputcsv($out, [$row['title'], $row['short_code'], $row['count']]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}