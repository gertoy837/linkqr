<?php

namespace App\Mail;

use App\Models\Invoice;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Pembayaran terverifikasi dan paket sudah aktif.
 *
 * Ini email yang paling ditunggu pelanggan: bukti bahwa uangnya masuk dan
 * paketnya benar-benar menyala. Tanpa ini, pelanggan harus menebak-nebak
 * apakah transfernya sudah diproses.
 */
class PlanActivated extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, string>  $fitur  daftar fitur paket, untuk ditampilkan
     */
    public function __construct(
        public Invoice $invoice,
        public string $nama,
        public string $link,
        public ?CarbonInterface $berlakuSampai,
        public array $fitur = [],
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Paket {$this->invoice->planName()} kamu sudah aktif",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.plan-activated',
            with: [
                'invoice' => $this->invoice,
                'nama' => $this->nama,
                'link' => $this->link,
                'berlakuSampai' => $this->berlakuSampai,
                'fitur' => $this->fitur,
            ],
        );
    }
}
