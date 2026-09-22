<?php

namespace App\Providers;

use App\Support\RequestInspector;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Batas laju per jenis endpoint.
     *
     * Sebelumnya tidak ada satu pun throttle di aplikasi ini, jadi /login bisa
     * diserang brute force tanpa hambatan dan /s/{code} bisa dipakai untuk
     * membanjiri API eksternal (geo lookup) dari jalur publik.
     */
    private function configureRateLimiting(): void
    {
        // Login: dibatasi dua arah sekaligus — per IP (supaya satu IP tidak
        // menyapu banyak akun) dan per IP+email (supaya satu akun tidak
        // diserang berulang dari IP yang sama).
        RateLimiter::for('login', function (Request $request) {
            $email = mb_strtolower((string) $request->input('email'));

            return [
                Limit::perMinute(8)->by('login-ip:' . $request->ip()),
                Limit::perMinute(8)->by('login-pair:' . $request->ip() . '|' . $email),
            ];
        });

        // Pendaftaran akun: satu IP tidak perlu bikin 5 workspace per menit.
        RateLimiter::for('register', fn (Request $request) =>
            Limit::perMinute(5)->by('register:' . $request->ip())
        );

        // Redirect publik. Kuncinya IP PENGUNJUNG, bukan IP tunnel: API duduk di
        // belakang Cloudflare, jadi memakai $request->ip() akan menaruh semua
        // pengunjung di satu ember dan memblokir trafik yang sah. Batasnya
        // longgar karena satu venue ber-NAT bisa menghasilkan banyak scan asli.
        RateLimiter::for('scan', function (Request $request) {
            $ip = RequestInspector::clientIp($request) ?: $request->ip();

            return Limit::perMinute(120)->by('scan:' . $ip);
        });

        // API publik: per kunci kalau ada (hash-nya, jangan kunci mentahnya),
        // kalau tidak ada ya per IP.
        RateLimiter::for('api-key', function (Request $request) {
            $key = $request->header('X-API-Key') ?: $request->bearerToken();

            return Limit::perMinute(60)->by(
                'api-key:' . ($key ? hash('sha256', $key) : $request->ip())
            );
        });

        // Unggah bukti bayar: menulis file, jadi paling ketat.
        RateLimiter::for('proof-upload', fn (Request $request) =>
            Limit::perMinute(10)->by('proof:' . ($request->user()?->id ?? $request->ip()))
        );
    }
}
