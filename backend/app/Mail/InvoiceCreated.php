<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invoice baru dibuat — pelanggan perlu tahu nominal & batas waktunya.
 *
 * Tanpa email ini, pelanggan yang memilih paket berbayar hanya melihat layar
 * "invoice dibuat" sekali, lalu tidak punya pengingat apa pun. Untuk pembayaran
 * QRIS manual, itu berarti setiap pelanggan akan bertanya lewat WhatsApp.
 */
class InvoiceCreated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Invoice $invoice,
        public string $nama,
        public string $link,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Invoice {$this->invoice->number} — {$this->invoice->planName()}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-created',
            with: [
                'invoice' => $this->invoice,
                'nama' => $this->nama,
                'link' => $this->link,
            ],
        );
    }
}
