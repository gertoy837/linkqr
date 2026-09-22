<?php

namespace App\Support;

/**
 * Validasi warna QR.
 *
 * Warna QR bukan sekadar hiasan: modul QR harus tetap terbedakan dari
 * latar putihnya. Warna yang terlalu pucat (mis. kuning #FFFF00) menghasilkan
 * QR yang "terbaca" oleh decoder toleran di kondisi ideal, tapi gagal di
 * kamera HP sungguhan — apalagi di ruangan redup seperti restoran.
 *
 * Karena kustomisasi warna adalah fitur berbayar, pelanggan yang membayar
 * tidak boleh bisa membuat QR yang tidak bisa discan. Karena itu kontras
 * minimum ditegakkan di server, bukan hanya disarankan di UI.
 */
class QrColor
{
    /**
     * Rasio kontras minimum terhadap putih (skala WCAG).
     *
     * 3.0 adalah ambang "komponen antarmuka non-teks" di WCAG 2.1. Di bawah
     * itu, modul QR mulai menyatu dengan latar pada pencahayaan normal.
     */
    public const MIN_CONTRAST = 3.0;

    /** Apakah string ini warna hex yang sah (#RRGGBB)? */
    public static function isValidHex(string $color): bool
    {
        return (bool) preg_match('/^#[0-9A-Fa-f]{6}$/', $color);
    }

    /**
     * Rasio kontras warna ini terhadap putih.
     *
     * Rumus luminance relatif dari WCAG 2.1.
     */
    public static function contrastWithWhite(string $color): float
    {
        if (!self::isValidHex($color)) {
            return 0.0;
        }

        $kanal = [];
        foreach ([1, 3, 5] as $i) {
            $v = hexdec(substr($color, $i, 2)) / 255;
            $kanal[] = $v <= 0.03928
                ? $v / 12.92
                : (($v + 0.055) / 1.055) ** 2.4;
        }

        $luminance = 0.2126 * $kanal[0] + 0.7152 * $kanal[1] + 0.0722 * $kanal[2];

        // (putih + 0.05) / (warna + 0.05)
        return 1.05 / ($luminance + 0.05);
    }

    /** Apakah warna ini cukup kontras untuk QR yang bisa discan? */
    public static function isScannable(string $color): bool
    {
        return self::contrastWithWhite($color) >= self::MIN_CONTRAST;
    }

    /** Pesan yang ditampilkan saat warnanya terlalu pucat. */
    public static function rejectionMessage(): string
    {
        return 'Warna itu terlalu muda untuk QR — modulnya bisa menyatu dengan latar '
            . 'sehingga sulit discan. Pilih warna yang lebih gelap.';
    }
}
