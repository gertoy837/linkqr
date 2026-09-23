<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Pembungkus pengiriman email.
 *
 * Alasannya sederhana: email adalah efek samping, bukan inti transaksi. Kalau
 * SMTP sedang mati atau kredensialnya salah, pembuatan invoice dan verifikasi
 * pembayaran TETAP harus berhasil — kalau tidak, kegagalan email ikut
 * menggagalkan alur uang, dan pelanggan yang sudah transfer malah tidak bisa
 * diaktifkan paketnya.
 *
 * Karena itu setiap kiriman dibungkus try/catch dan kegagalannya dicatat ke log
 * supaya operator tetap bisa menelusuri dan mengirim ulang secara manual.
 */
class Notifier
{
    /**
     * Kirim email, jangan pernah melempar exception ke pemanggil.
     *
     * @return bool true kalau terkirim
     */
    public static function send(string $to, object $mailable, array $konteks = []): bool
    {
        try {
            Mail::to($to)->send($mailable);

            return true;
        } catch (\Throwable $e) {
            Log::error('Gagal mengirim email: ' . $e->getMessage(), $konteks + [
                'mailable' => get_class($mailable),
                'to' => $to,
            ]);

            return false;
        }
    }
}
