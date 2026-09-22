<?php

namespace App\Support;

/**
 * Validasi + normalisasi logo QR.
 *
 * Logo disimpan sebagai **data URL** di kolom `qr_codes.logo`, bukan file di
 * disk. Alasannya bukan malas: QR di-render di browser oleh qrcode.react dan
 * diunduh lewat canvas.toDataURL() (tombol "Download PNG"). Frontend
 * (qr.gertoy.biz.id) dan API (qr-api.gertoy.biz.id) beda origin, jadi logo
 * yang diambil dari URL API akan mengotori canvas — toDataURL() melempar
 * SecurityError dan tombol download rusak. Data URL tidak pernah meninggalkan
 * dokumen, jadi tidak ada masalah CORS sama sekali.
 *
 * Hanya raster yang diterima. SVG sengaja ditolak: isinya dokumen XML yang
 * bisa membawa <script>, dan tidak ada kebutuhan nyata menyematkan SVG di
 * tengah QR.
 */
class QrLogo
{
    /** Batas panjang data URL (karakter) — kira-kira 200 KB gambar. */
    public const MAX_DATA_URL_LENGTH = 280_000;

    /** Batas ukuran gambar setelah base64 didekode. */
    public const MAX_BYTES = 200_000;

    /** Batas sisi terpanjang, piksel. Logo QR tidak pernah butuh lebih. */
    public const MAX_DIMENSION = 1024;

    /** Mime yang diterima. */
    public const ALLOWED_MIME = [
        'image/png' => true,
        'image/jpeg' => true,
        'image/webp' => true,
    ];

    /**
     * Apakah data URL ini logo yang sah?
     */
    public static function isValid(string $dataUrl): bool
    {
        return self::inspect($dataUrl) !== null;
    }

    /**
     * Periksa data URL dan kembalikan metadata kalau sah.
     *
     * Divalidasi berlapis supaya tidak ada yang bisa menyelundupkan payload:
     * bentuk data URL, mime yang diizinkan, isi base64 yang benar-benar
     * terdekode, gambar yang benar-benar bisa dibaca GD, dan mime hasil
     * deteksi isi yang cocok dengan mime yang diklaim.
     *
     * @return array{mime: string, bytes: int, width: int, height: int}|null
     */
    public static function inspect(string $dataUrl): ?array
    {
        if ($dataUrl === '' || strlen($dataUrl) > self::MAX_DATA_URL_LENGTH) {
            return null;
        }

        // Bentuknya harus persis `data:image/<tipe>;base64,<isi>`.
        if (!preg_match('#^data:(image/[a-z]+);base64,([A-Za-z0-9+/]+={0,2})$#', $dataUrl, $m)) {
            return null;
        }

        $claimedMime = $m[1];

        if (!isset(self::ALLOWED_MIME[$claimedMime])) {
            return null;
        }

        // strict mode: base64 rusak harus gagal, bukan ditebak-tebak.
        $binary = base64_decode($m[2], true);

        if ($binary === false || $binary === '') {
            return null;
        }

        if (strlen($binary) > self::MAX_BYTES) {
            return null;
        }

        $info = @getimagesizefromstring($binary);

        if ($info === false) {
            return null;
        }

        $width = (int) ($info[0] ?? 0);
        $height = (int) ($info[1] ?? 0);
        $actualMime = (string) ($info['mime'] ?? '');

        if ($width < 1 || $height < 1) {
            return null;
        }

        if ($width > self::MAX_DIMENSION || $height > self::MAX_DIMENSION) {
            return null;
        }

        // Isi file harus benar-benar sesuai tipe yang diklaim. Tanpa cek ini,
        // PNG berisi apa pun bisa lolos selama header data URL-nya rapi.
        if ($actualMime !== $claimedMime) {
            return null;
        }

        return [
            'mime' => $actualMime,
            'bytes' => strlen($binary),
            'width' => $width,
            'height' => $height,
        ];
    }

    /** Pesan yang ditampilkan ke pengguna saat logonya ditolak. */
    public static function rejectionMessage(): string
    {
        return 'Logo harus berupa gambar PNG, JPG, atau WEBP (maksimal 200 KB, sisi terjauh 1024 px).';
    }
}
