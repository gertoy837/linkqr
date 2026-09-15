<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class RequestInspector
{
    /**
     * Parse a User-Agent string into device_type / os / browser.
     * Tablets are checked before mobile because most tablet UAs also
     * contain the word "Mobile".
     */
    public static function parse(?string $ua): array
    {
        $ua = (string) $ua;
        $out = ['device_type' => 'unknown', 'os' => null, 'browser' => null];

        if ($ua === '') {
            return $out;
        }

        $lower = strtolower($ua);

        // ---- Device type -------------------------------------------------
        $isTablet = str_contains($lower, 'ipad')
            || (str_contains($lower, 'android') && !str_contains($lower, 'mobile'))
            || str_contains($lower, 'tablet')
            || str_contains($lower, 'kindle')
            || str_contains($lower, 'silk')
            || str_contains($lower, 'playbook');

        $isMobile = str_contains($lower, 'iphone')
            || str_contains($lower, 'ipod')
            || str_contains($lower, 'windows phone')
            || (str_contains($lower, 'android') && str_contains($lower, 'mobile'))
            || (str_contains($lower, 'mobile') && !$isTablet);

        if ($isTablet) {
            $out['device_type'] = 'tablet';
        } elseif ($isMobile) {
            $out['device_type'] = 'mobile';
        } elseif (str_contains($lower, 'bot') || str_contains($lower, 'crawler') || str_contains($lower, 'spider')) {
            $out['device_type'] = 'bot';
        } else {
            $out['device_type'] = 'desktop';
        }

        // ---- Operating system -------------------------------------------
        $out['os'] = match (true) {
            str_contains($lower, 'windows phone') => 'Windows Phone',
            str_contains($lower, 'windows') => 'Windows',
            str_contains($lower, 'iphone'), str_contains($lower, 'ipad'), str_contains($lower, 'ipod') => 'iOS',
            str_contains($lower, 'mac os x'), str_contains($lower, 'macintosh') => 'macOS',
            str_contains($lower, 'android') => 'Android',
            str_contains($lower, 'cros') => 'ChromeOS',
            str_contains($lower, 'ubuntu') => 'Ubuntu',
            str_contains($lower, 'linux') => 'Linux',
            default => null,
        };

        // ---- Browser -----------------------------------------------------
        $out['browser'] = match (true) {
            str_contains($lower, 'edg/'), str_contains($lower, 'edga/'), str_contains($lower, 'edgios/') => 'Edge',
            str_contains($lower, 'opr/'), str_contains($lower, 'opera') => 'Opera',
            str_contains($lower, 'samsungbrowser') => 'Samsung Internet',
            str_contains($lower, 'ucbrowser') => 'UC Browser',
            str_contains($lower, 'instagram') => 'Instagram',
            str_contains($lower, 'fban'), str_contains($lower, 'fbav') => 'Facebook',
            str_contains($lower, 'micromessenger') => 'WeChat',
            str_contains($lower, 'chrome/'), str_contains($lower, 'crios/') => 'Chrome',
            str_contains($lower, 'firefox/'), str_contains($lower, 'fxios/') => 'Firefox',
            str_contains($lower, 'safari/') => 'Safari',
            str_contains($lower, 'curl/') => 'cURL',
            default => 'Other',
        };

        return $out;
    }

    /**
     * Resolve the real visitor IP.
     *
     * X-Visitor-IP is set by our own Next.js /s/[code] proxy: the API sits
     * behind Cloudflare too, so CF-Connecting-IP would otherwise describe the
     * tunnel, not the visitor.
     */
    public static function clientIp(Request $request): ?string
    {
        foreach (['X-Visitor-IP', 'CF-Connecting-IP', 'X-Real-IP'] as $header) {
            $value = $request->header($header);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        $forwarded = $request->header('X-Forwarded-For');
        if (is_string($forwarded) && $forwarded !== '') {
            return trim(explode(',', $forwarded)[0]);
        }

        return $request->ip();
    }

    /**
     * Resolve country/city for a request.
     *
     * 1. X-Visitor-Country is forwarded by our proxy from Cloudflare's
     *    CF-IPCountry - free and instant.
     * 2. Otherwise fall back to ip-api.com (no key needed, ~45 req/min).
     *    Private/reserved IPs are skipped.
     *
     * Geo is strictly best-effort: a failure must never break the redirect.
     */
    public static function geo(Request $request, ?string $ip): array
    {
        $country = $request->header('X-Visitor-Country') ?: $request->header('CF-IPCountry');

        if (is_string($country) && $country !== '' && !in_array(strtoupper($country), ['XX', 'T1'], true)) {
            return ['country' => strtoupper($country), 'city' => null];
        }

        if (!$ip || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return ['country' => null, 'city' => null];
        }

        try {
            $response = Http::timeout(3)
                ->retry(1, 150)
                ->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'status,country,countryCode,city',
                ]);

            if ($response->ok() && $response->json('status') === 'success') {
                return [
                    'country' => $response->json('countryCode') ?: $response->json('country'),
                    'city' => $response->json('city'),
                ];
            }
        } catch (\Throwable $e) {
            // Swallow: geo is a nice-to-have.
        }

        return ['country' => null, 'city' => null];
    }
}