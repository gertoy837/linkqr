<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tautan atur ulang password.
 *
 * Ini satu-satunya jalan pelanggan memulihkan akunnya sendiri. Sebelumnya
 * tidak ada alur lupa password sama sekali, jadi setiap pelanggan yang lupa
 * password harus menghubungi operator untuk direset manual — tidak bisa
 * dilayani saat operator tidur, dan jadi beban tetap begitu pelanggan bertambah.
 */
class ResetPassword extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nama,
        public string $link,
        public int $berlakuMenit,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Atur ulang password LinkQR kamu',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reset-password',
            with: [
                'nama' => $this->nama,
                'link' => $this->link,
                'berlakuMenit' => $this->berlakuMenit,
            ],
        );
    }
}
