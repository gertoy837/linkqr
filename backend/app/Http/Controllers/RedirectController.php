<?php

namespace App\Http\Controllers;

use App\Models\QrCode;
use App\Models\QrScanLog;
use Illuminate\Http\Request;

class RedirectController extends Controller
{
    public function redirect(Request $request, string $shortCode)
    {
        $qr = QrCode::where('short_code', $shortCode)->first();

        if (!$qr || !$qr->is_active) {
            abort(404, 'Link not found or inactive.');
        }

        // Log scan
        $log = new QrScanLog([
            'qr_code_id' => $qr->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'scanned_at' => now(),
        ]);

        // Simple device detection
        $ua = $request->userAgent() ?? '';
        if (stripos($ua, 'mobile') !== false) {
            $log->device_type = 'mobile';
        } elseif (stripos($ua, 'tablet') !== false) {
            $log->device_type = 'tablet';
        } else {
            $log->device_type = 'desktop';
        }

        // OS and browser detection (simplified)
        if (stripos($ua, 'Windows') !== false) $log->os = 'Windows';
        elseif (stripos($ua, 'Mac') !== false) $log->os = 'macOS';
        elseif (stripos($ua, 'Linux') !== false) $log->os = 'Linux';
        elseif (stripos($ua, 'Android') !== false) $log->os = 'Android';
        elseif (stripos($ua, 'iOS') !== false || stripos($ua, 'iPhone') !== false || stripos($ua, 'iPad') !== false) $log->os = 'iOS';

        if (stripos($ua, 'Chrome') !== false && stripos($ua, 'Edg') === false) $log->browser = 'Chrome';
        elseif (stripos($ua, 'Firefox') !== false) $log->browser = 'Firefox';
        elseif (stripos($ua, 'Safari') !== false && stripos($ua, 'Chrome') === false) $log->browser = 'Safari';
        elseif (stripos($ua, 'Edg') !== false) $log->browser = 'Edge';
        else $log->browser = 'Other';

        $log->save();

        // Increment scan count
        $qr->incrementScan();

        return redirect($qr->target_url);
    }
}