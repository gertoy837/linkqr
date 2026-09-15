<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Models\QrScanLog;
use App\Support\RequestInspector;
use Illuminate\Http\Request;

class RedirectController extends Controller
{
    public function redirect(Request $request, string $shortCode)
    {
        $qr = QrCode::where('short_code', $shortCode)->first();

        if (!$qr || !$qr->is_active) {
            abort(404, 'Link not found or inactive.');
        }

        $ip = RequestInspector::clientIp($request);
        $parsed = RequestInspector::parse($request->userAgent());
        $geo = RequestInspector::geo($request, $ip);

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

        return redirect($qr->target_url, 302);
    }
}