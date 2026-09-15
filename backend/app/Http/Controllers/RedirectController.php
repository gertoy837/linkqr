<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Models\QrScanLog;
use App\Support\RequestInspector;
use Carbon\Carbon;
use Illuminate\Http\Request;

class RedirectController extends Controller
{
    public function redirect(Request $request, string $shortCode)
    {
        $qr = QrCode::with('tenant')->where('short_code', $shortCode)->first();

        if (!$qr || !$qr->is_active) {
            abort(404, 'Link not found or inactive.');
        }

        // Workspace yang dinonaktifkan berhenti melayani redirect. 410 Gone,
        // bukan 404: sumbernya jelas ada dan sengaja tidak dilayani lagi.
        if ($qr->tenant && !$qr->tenant->is_active) {
            abort(410, 'Workspace dinonaktifkan.');
        }

        $ip = RequestInspector::clientIp($request);
        $parsed = RequestInspector::parse($request->userAgent());
        $geo = RequestInspector::geo($request, $ip);

        // Deduplicate: skip logging if same IP + QR + device_type within 2 seconds
        // (catches browser prefetch/preload that fires duplicate requests)
        $recentDuplicate = QrScanLog::where('qr_code_id', $qr->id)
            ->where('ip_address', $ip)
            ->where('device_type', $parsed['device_type'])
            ->where('scanned_at', '>=', Carbon::now()->subSeconds(2))
            ->exists();

        if (!$recentDuplicate) {
            QrScanLog::create([
                'qr_code_id' => $qr->id,
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
                'referer' => $request->header('referer'),
                'country' => $geo['country'],
                'city' => $geo['city'],
                'device_type' => $parsed['device_type'],
                'os' => $parsed['os'],
                'browser' => $parsed['browser'],
                'scanned_at' => now(),
            ]);

            $qr->incrementScan();
        }

        return redirect($qr->target_url, 302);
    }
}