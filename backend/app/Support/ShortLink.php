<?php

namespace App\Support;

/**
 * Tautan pendek QR (/s/{kode}).
 *
 * Route /s/ dilayani oleh FRONTEND, bukan API — jadi tautannya harus disusun
 * dari `app.frontend_url`, bukan dari `url()`/APP_URL.
 *
 * Ini pernah salah: API v1 mengembalikan `url("/s/{kode}")` yang memakai
 * APP_URL (domain API), sehingga tautan yang diterima developer menunjuk ke
 * halaman 404. Sama halnya dengan kolom link di CSV export. Dijadikan satu
 * helper supaya tidak ada dua tempat yang bisa berbeda lagi.
 */
class ShortLink
{
    public static function for(string $kode): string
    {
        return rtrim(config('app.frontend_url'), '/') . '/s/' . $kode;
    }
}
