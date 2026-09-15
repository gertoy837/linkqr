<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use Illuminate\Console\Command;

/**
 * Tandai invoice yang lewat batas waktu sebagai kedaluwarsa.
 *
 * Invoice::isActionable() sudah melakukan ini secara lazy saat invoice dibuka,
 * tapi invoice yang tidak pernah dibuka lagi akan tetap berstatus "Menunggu
 * Pembayaran" di daftar admin selamanya — bikin antrian kelihatan penuh padahal
 * sudah tidak ada yang bisa dibayar.
 */
class ExpireStaleInvoices extends Command
{
    protected $signature = 'invoices:expire-stale
                            {--dry-run : Tampilkan invoice yang akan ditandai tanpa mengubah apa pun}';

    protected $description = 'Tandai invoice yang belum dibayar dan sudah lewat batas waktu sebagai kedaluwarsa';

    public function handle(): int
    {
        $stale = Invoice::whereIn('status', [
                Invoice::STATUS_PENDING,
                Invoice::STATUS_REJECTED,
            ])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('expires_at')
            ->get();

        if ($stale->isEmpty()) {
            $this->info('Tidak ada invoice kedaluwarsa.');
            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->warn("DRY RUN — {$stale->count()} invoice akan ditandai kedaluwarsa:");
            foreach ($stale as $invoice) {
                $this->line(sprintf(
                    '  %s | %-22s | lewat %s',
                    $invoice->number,
                    $invoice->status_label,
                    $invoice->expires_at->toDateTimeString(),
                ));
            }

            return self::SUCCESS;
        }

        $count = 0;

        foreach ($stale as $invoice) {
            $invoice->status = Invoice::STATUS_EXPIRED;
            $invoice->save();
            $count++;
        }

        $this->info("Selesai. {$count} invoice ditandai kedaluwarsa.");

        return self::SUCCESS;
    }
}