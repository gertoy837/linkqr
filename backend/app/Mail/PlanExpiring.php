<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Pengingat bahwa masa aktif paket akan berakhir.
 *
 * Dikirim bertahap H-7, H-3, dan H-1. Pelanggan yang masa aktifnya habis tanpa
 * peringatan akan kaget saat fitur Pro-nya tiba-tiba hilang, dan itu keluhan
 * yang paling tidak nyaman dijawab.
 *
 * Satu hal yang SELALU disebut di email ini: QR yang sudah dicetak tetap
 * berfungsi. Itu pertanyaan pertama yang muncul di kepala pelanggan begitu
 * membaca "paket berakhir", dan menjawabnya lebih awal mencegah kepanikan.
 */
class PlanExpiring extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, string>  $dampak  hal-hal yang berubah setelah turun paket
     */
    public function __construct(
        public string $nama,
        public string $namaWorkspace,
        public string $namaPaket,
        public int $hariTersisa,
        public string $berakhirPada,
        public string $link,
        public array $dampak = [],
        public bool $dapatDiperpanjang = true,
        public ?string $hargaPerBulan = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Paket {$this->namaPaket} berakhir dalam {$this->hariTersisa} hari",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.plan-expiring',
            with: [
                'nama' => $this->nama,
                'namaWorkspace' => $this->namaWorkspace,
                'namaPaket' => $this->namaPaket,
                'hariTersisa' => $this->hariTersisa,
                'berakhirPada' => $this->berakhirPada,
                'link' => $this->link,
                'dampak' => $this->dampak,
                'dapatDiperpanjang' => $this->dapatDiperpanjang,
                'hargaPerBulan' => $this->hargaPerBulan,
            ],
        );
    }
}
