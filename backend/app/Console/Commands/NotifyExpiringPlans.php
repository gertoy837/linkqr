<?php

namespace App\Console\Commands;

use App\Mail\PlanExpiring;
use App\Models\Tenant;
use App\Support\Notifier;
use App\Support\PlanPricing;
use Illuminate\Console\Command;

/**
 * Ingatkan pelanggan bahwa masa aktif paketnya akan berakhir (H-7, H-3, H-1).
 *
 * Kenapa perlu: `plans:downgrade-expired` mencabut hak istimewa paket begitu
 * masa aktifnya lewat — dan pelanggan yang tidak diberi tahu sebelumnya akan
 * kaget saat fitur Pro-nya hilang. Email ini memberi kesempatan memperpanjang
 * lebih dulu.
 *
 * Cara kerja tahapannya:
 *
 *   Kolom `renewal_reminder_stage` menyimpan ambang terakhir yang sudah
 *   dikirim (0/7/3/1). Command ini jalan tiap hari, jadi tanpa kolom itu
 *   pelanggan akan menerima email yang sama berulang kali — dan pengingat yang
 *   terasa spam justru diabaikan, padahal isinya penting.
 *
 *   Ambangnya diperiksa dari yang paling mendesak, dan syaratnya
 *   `<=` bukan `==`. Kalau scheduler sempat mati beberapa hari, pelanggan tetap
 *   menerima SATU pengingat paling relevan (bukan tidak sama sekali), dan tetap
 *   tidak dobel.
 */
class NotifyExpiringPlans extends Command
{
    protected $signature = 'plans:notify-expiring
                            {--dry-run : Tampilkan siapa yang akan dikirimi tanpa mengirim}';

    protected $description = 'Kirim email pengingat ke pelanggan yang paketnya akan berakhir (H-7/H-3/H-1)';

    /** Ambang pengingat, dari paling mendesak. */
    private const AMBANG = [1, 3, 7];

    public function handle(): int
    {
        $kandidat = Tenant::where('plan', '!=', 'starter')
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '>', now())
            ->where('is_active', true)
            ->orderBy('plan_expires_at')
            ->get();

        if ($kandidat->isEmpty()) {
            $this->info('Tidak ada paket yang mendekati kedaluwarsa.');
            return self::SUCCESS;
        }

        $dry = (bool) $this->option('dry-run');
        $terkirim = 0;
        $dilewati = 0;

        foreach ($kandidat as $tenant) {
            $jamTersisa = now()->diffInHours($tenant->plan_expires_at, false);
            $hariMentah = $jamTersisa / 24;

            // Ambang mana yang berlaku sekarang? Diperiksa dari yang paling
            // mendesak supaya satu tenant hanya dapat satu email per jalan.
            $ambang = null;

            foreach (self::AMBANG as $a) {
                if ($hariMentah <= $a) {
                    $ambang = $a;
                    break;
                }
            }

            if ($ambang === null) {
                $dilewati++;
                continue; // masih lebih dari 7 hari
            }

            // Sudah pernah dikirimi pengingat yang sama atau lebih mendesak?
            //
            // Ambangnya mengecil seiring waktu (7 -> 3 -> 1), jadi yang lebih
            // mendesak justru bernilai LEBIH KECIL. Perbandingannya harus `<=`:
            // kalau H-7 sudah terkirim (stage=7) dan sekarang waktunya H-3
            // (ambang=3), pengingat H-3 HARUS tetap dikirim.
            //
            // Versi pertama memakai `>=` dan akibatnya pelanggan yang sudah
            // menerima H-7 tidak pernah menerima H-3 maupun H-1 — padahal dua
            // pengingat terakhir itu yang paling menentukan.
            if ($tenant->renewal_reminder_stage !== 0
                && (int) $tenant->renewal_reminder_stage <= $ambang) {
                $dilewati++;
                continue;
            }

            $hariTampil = max(1, (int) floor($hariMentah));

            $penerima = $tenant->users()->orderBy('id')->get();

            if ($penerima->isEmpty()) {
                $this->warn("  #{$tenant->id} {$tenant->name} — tidak ada user, dilewati.");
                $dilewati++;
                continue;
            }

            if ($dry) {
                $this->line(sprintf(
                    '  [DRY] #%d %-28s H-%d (%s) -> %d penerima: %s',
                    $tenant->id,
                    $tenant->name,
                    $ambang,
                    $tenant->plan_expires_at->toDateString(),
                    $penerima->count(),
                    $penerima->pluck('email')->implode(', '),
                ));
                $terkirim++;
                continue;
            }

            $definisi = $tenant->planDefinition();
            $contactOnly = !empty($definisi['contact_only']);

            foreach ($penerima as $user) {
                Notifier::send($user->email, new PlanExpiring(
                    nama: $user->name,
                    namaWorkspace: $tenant->name,
                    namaPaket: $tenant->planName(),
                    hariTersisa: $hariTampil,
                    berakhirPada: $tenant->plan_expires_at
                        ->timezone('Asia/Jakarta')
                        ->translatedFormat('d F Y'),
                    link: $this->tautan($contactOnly),
                    dampak: $this->dampak($tenant),
                    dapatDiperpanjang: !$contactOnly,
                    hargaPerBulan: $contactOnly
                        ? null
                        : $this->hargaPerBulan($tenant),
                ), [
                    'tenant' => $tenant->id,
                    'ambang' => $ambang,
                    'jenis' => 'plan_expiring',
                ]);
            }

            $tenant->renewal_reminder_stage = $ambang;
            $tenant->renewal_reminder_sent_at = now();
            $tenant->save();

            $terkirim++;

            $this->line(sprintf(
                '  #%d %-28s H-%d -> %d email',
                $tenant->id,
                $tenant->name,
                $ambang,
                $penerima->count(),
            ));
        }

        if ($dry) {
            $this->warn("DRY RUN — {$terkirim} tenant akan dikirimi, {$dilewati} dilewati.");
            return self::SUCCESS;
        }

        $this->info("Selesai. {$terkirim} tenant dikirimi, {$dilewati} dilewati.");

        return self::SUCCESS;
    }

    private function tautan(bool $contactOnly): string
    {
        return rtrim(config('app.frontend_url'), '/') . '/dashboard/billing';
    }

    /** Harga per bulan paket tenant, untuk ditampilkan di email. */
    private function hargaPerBulan(Tenant $tenant): ?string
    {
        $cycle = $tenant->billing_cycle === 'yearly' ? 'yearly' : 'monthly';
        $rate = PlanPricing::monthlyRate($tenant->plan, $cycle);

        if ($rate <= 0) {
            return null;
        }

        return 'Rp ' . number_format($rate, 0, ',', '.');
    }

    /**
     * Apa saja yang berubah kalau paketnya turun ke Starter.
     *
     * Dihitung dari perbandingan paket sekarang dengan Starter, bukan ditulis
     * tetap — supaya kalau suatu saat batas Starter diubah, isi emailnya ikut
     * benar dengan sendirinya.
     *
     * @return array<int, string>
     */
    private function dampak(Tenant $tenant): array
    {
        $starter = config('plans.starter', []);
        $sekarang = $tenant->planDefinition();

        $dampak = [];

        $kuotaSekarang = $tenant->qrLimit();
        $kuotaStarter = $starter['limits']['qr_codes'] ?? null;

        if ($kuotaSekarang === null && $kuotaStarter !== null) {
            $dampak[] = "Kuota QR Code kembali dibatasi {$kuotaStarter} (sekarang tanpa batas)";
        } elseif ($kuotaSekarang !== null && $kuotaStarter !== null && $kuotaSekarang > $kuotaStarter) {
            $dampak[] = "Kuota QR Code kembali ke {$kuotaStarter} (sekarang {$kuotaSekarang})";
        }

        $scanSekarang = $sekarang['limits']['scans_per_month'] ?? null;
        $scanStarter = $starter['limits']['scans_per_month'] ?? null;

        if ($scanSekarang === null && $scanStarter !== null) {
            $dampak[] = 'Batas pemindaian kembali '
                . number_format($scanStarter, 0, ',', '.') . ' per bulan (sekarang tanpa batas)';
        }

        $label = [
            'logo_branding' => 'Kustomisasi logo & warna pada QR dinonaktifkan',
            'export' => 'Ekspor laporan PDF & Excel dinonaktifkan',
            'api_access' => 'Akses API developer dinonaktifkan',
            'custom_domain' => 'Custom domain dinonaktifkan',
        ];

        foreach ($label as $fitur => $teks) {
            $punyaSekarang = (bool) ($sekarang['features_enabled'][$fitur] ?? false);
            $punyaStarter = (bool) ($starter['features_enabled'][$fitur] ?? false);

            if ($punyaSekarang && !$punyaStarter) {
                $dampak[] = $teks;
            }
        }

        if (empty($dampak)) {
            $dampak[] = 'Workspace kembali ke paket Starter';
        }

        return $dampak;
    }
}
