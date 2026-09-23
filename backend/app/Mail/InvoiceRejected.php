<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Bukti pembayaran ditolak — pelanggan perlu tahu alasannya.
 *
 * Sebelumnya penolakan hanya berubah status di dashboard. Pelanggan yang sudah
 * transfer lalu tidak melihat apa-apa akan mengira uangnya hilang.
 */
class InvoiceRejected extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Invoice $invoice,
        public string $nama,
        public string $link,
        public ?string $catatan = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Bukti pembayaran {$this->invoice->number} perlu diperbaiki",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-rejected',
            with: [
                'invoice' => $this->invoice,
                'nama' => $this->nama,
                'link' => $this->link,
                'catatan' => $this->catatan,
            ],
        );
    }
}
