<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;

/**
 * Auto-downgrade tenant yang paket berbayarnya sudah lewat masa aktif.
 *
 * Tanpa ini, user yang bayar satu bulan dapat fitur Pro selamanya: tidak ada
 * satu pun tempat di aplikasi yang memeriksa plan_expires_at untuk menurunkan
 * paket. isExpired() hanya dipakai untuk menampilkan peringatan.
 *
 * Yang TIDAK dilakukan command ini: mematikan QR code. QR yang sudah dicetak
 * dan ditempel di meja harus tetap jalan — yang dicabut cuma hak istimewanya
 * (kuota QR jadi 5, scan jadi 1.000/bulan), bukan fungsi redirect-nya.
 */
class DowngradeExpiredPlans extends Command
{
    protected $signature = 'plans:downgrade-expired
                            {--dry-run : Tampilkan tenant yang akan diturunkan tanpa mengubah apa pun}';

    protected $description = 'Turunkan tenant yang paket berbayarnya sudah kedaluwarsa kembali ke Starter';

    public function handle(): int
    {
        $expired = Tenant::where('plan', '!=', 'starter')
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '<=', now())
            ->orderBy('plan_expires_at')
            ->get();

        if ($expired->isEmpty()) {
            $this->info('Tidak ada paket kedaluwarsa. Semua bersih.');
            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->warn("DRY RUN — {$expired->count()} tenant akan diturunkan:");
            foreach ($expired as $tenant) {
                $this->line(sprintf(
                    '  #%d %-30s %s -> starter (kedaluwarsa %s)',
                    $tenant->id,
                    $tenant->name,
                    $tenant->plan,
                    $tenant->plan_expires_at->toDateTimeString(),
                ));
            }

            return self::SUCCESS;
        }

        $count = 0;

        foreach ($expired as $tenant) {
            $previous = $tenant->plan;

            $tenant->plan = 'starter';
            $tenant->billing_cycle = 'monthly';
            $tenant->plan_expires_at = null;
            $tenant->save();

            $count++;

            $this->line(sprintf(
                '  #%d %-30s %s -> starter',
                $tenant->id,
                $tenant->name,
                $previous,
            ));
        }

        $this->info("Selesai. {$count} paket diturunkan ke Starter.");

        return self::SUCCESS;
    }
}