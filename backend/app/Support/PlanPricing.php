<?php

namespace App\Support;

/**
 * Satu-satunya tempat menghitung nominal paket.
 *
 * Ambigu yang pernah terjadi di sini: config plans.php menyimpan
 * `price.yearly`, dan nilainya dibaca sebagai TOTAL SETAHUN oleh backend
 * (amount = 49000) sementara frontend menampilkannya sebagai harga PER BULAN
 * ("Rp 49.000/bulan"). Akibatnya pelanggan yang memilih siklus tahunan hanya
 * ditagih satu bulan, tetapi masa aktifnya diberi 12 bulan
 * (Invoice::activatePlan memakai addYear()).
 *
 * Aturan yang berlaku sekarang — jangan diubah tanpa mengubah komentar di
 * config/plans.php juga:
 *
 *   price.monthly = harga PER BULAN untuk siklus bulanan
 *   price.yearly  = harga PER BULAN untuk siklus tahunan (sudah termasuk diskon)
 *
 * Nominal yang benar-benar ditagih pada siklus tahunan = price.yearly * 12.
 * Gunakan chargeAmount() — jangan pernah membaca price[$cycle] mentah untuk
 * membuat invoice.
 */
class PlanPricing
{
    /** Jumlah bulan yang dibayar di muka pada satu invoice tahunan. */
    public const MONTHS_PER_YEAR = 12;

    /**
     * Harga per bulan untuk siklus tertentu.
     *
     * Mengembalikan 0 untuk paket gratis maupun paket yang hanya bisa
     * diaktifkan lewat tim sales (contact_only), supaya pemanggil tidak perlu
     * menangani null sendiri.
     */
    public static function monthlyRate(string $plan, string $cycle): int
    {
        $definition = config("plans.{$plan}");

        if (!is_array($definition) || !empty($definition['contact_only'])) {
            return 0;
        }

        $price = $definition['price'] ?? [];

        return (int) ($cycle === 'yearly'
            ? ($price['yearly'] ?? 0)
            : ($price['monthly'] ?? 0));
    }

    /**
     * Nominal yang ditagih pada satu invoice.
     *
     * Ini yang WAJIB dipakai saat membuat invoice. Siklus tahunan dikalikan 12
     * karena pelanggan membayar setahun penuh di muka.
     */
    public static function chargeAmount(string $plan, string $cycle): int
    {
        $rate = self::monthlyRate($plan, $cycle);

        return $rate * self::monthsCovered($cycle);
    }

    /** Berapa bulan yang dicakup satu invoice untuk siklus ini. */
    public static function monthsCovered(string $cycle): int
    {
        return $cycle === 'yearly' ? self::MONTHS_PER_YEAR : 1;
    }

    /**
     * Apakah paket ini perlu pembayaran.
     *
     * Dipakai untuk field `requires_payment` saat registrasi. Sebelumnya
     * dihitung dari price[$cycle] mentah — untuk paket tahunan itu kebetulan
     * memberi jawaban yang sama, tapi artinya berbeda dan mudah salah.
     */
    public static function requiresPayment(string $plan, string $cycle): bool
    {
        return self::chargeAmount($plan, $cycle) > 0;
    }

    /**
     * Harga per bulan dari nominal invoice yang sudah tersimpan.
     *
     * Dipakai laporan pendapatan admin untuk menyetarakan invoice tahunan
     * dengan invoice bulanan (MRR).
     */
    public static function monthlyRateFromAmount(int $amount, string $cycle): int
    {
        return (int) round($amount / self::monthsCovered($cycle));
    }
}
