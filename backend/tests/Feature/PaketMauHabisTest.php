<?php

namespace Tests\Feature;

use App\Mail\PlanActivated;
use App\Mail\PlanExpiring;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Pengingat masa aktif paket (H-7 / H-3 / H-1).
 *
 * Yang dijaga di sini:
 *
 *  1. Pengingat terkirim di setiap ambang, dan TIDAK dobel. Command ini jalan
 *     tiap hari; tanpa penjagaan, pelanggan menerima email yang sama berulang
 *     kali dan pengingatnya justru diabaikan.
 *  2. Pelanggan yang sudah menerima H-7 TETAP menerima H-3 dan H-1. Ambangnya
 *     mengecil seiring waktu, jadi perbandingannya harus `<=` — versi pertama
 *     memakai `>=` dan pelanggan yang sudah dapat H-7 tidak pernah dapat H-3
 *     maupun H-1, padahal dua itu yang paling menentukan.
 *  3. Memperpanjang paket mereset pelacak, supaya periode berikutnya dapat
 *     pengingat lagi.
 *  4. Paket gratis dan workspace nonaktif tidak dikirimi.
 */
class PaketMauHabisTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Waktu dibekukan supaya perhitungan hari sisa deterministik.
     *
     * Tanpa ini, `Carbon::now()->addHours(144)` lalu `diffInHours()` bisa
     * menghasilkan 143,9999 karena selisih mikro-detik — dan `floor()`-nya
     * jadi 5 hari, bukan 6. Itu membuat test gagal karena ketidaktepatan
     * pengukuran, bukan karena perilaku aplikasinya salah.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-09-23 09:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Buat tenant berbayar yang kedaluwarsa dalam N hari. */
    private function berbayar(float $hari, array $atribut = []): Tenant
    {
        $tenant = $this->makeTenant(array_merge([
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'plan_expires_at' => Carbon::now()->addHours((int) round($hari * 24)),
            'renewal_reminder_stage' => 0,
            'is_active' => true,
        ], $atribut));

        $this->makeUser($tenant);

        return $tenant;
    }

    private function jalankan(): void
    {
        $this->artisan('plans:notify-expiring')->assertSuccessful();
    }

    // ---------- ambang ----------

    public function test_pengingat_h7_terkirim(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(6);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, fn (PlanExpiring $m) => $m->hariTersisa === 6);
        $this->assertSame(7, $tenant->fresh()->renewal_reminder_stage);
    }

    public function test_pengingat_h3_terkirim(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(3);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, fn (PlanExpiring $m) => $m->hariTersisa === 3);
        $this->assertSame(3, $tenant->fresh()->renewal_reminder_stage);
    }

    public function test_pengingat_h1_terkirim(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(1);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, fn (PlanExpiring $m) => $m->hariTersisa === 1);
        $this->assertSame(1, $tenant->fresh()->renewal_reminder_stage);
    }

    public function test_masih_lama_tidak_dikirimi(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(30);

        $this->jalankan();

        Mail::assertNothingSent();
        $this->assertSame(0, $tenant->fresh()->renewal_reminder_stage);
    }

    public function test_jalan_dua_kali_tidak_dobel(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(6);

        $this->jalankan();
        Mail::assertSentCount(1);

        $this->jalankan();
        // Hari yang sama, ambang yang sama — tidak boleh kirim lagi.
        Mail::assertSentCount(1);
        $this->assertSame(7, $tenant->fresh()->renewal_reminder_stage);
    }

    public function test_yang_sudah_h7_tetap_dapat_h3_dan_h1(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(6);

        $this->jalankan();
        $this->assertSame(7, $tenant->fresh()->renewal_reminder_stage);

        // Waktu berjalan: tinggal 2 hari. Pengingat H-3 harus tetap dikirim
        // walau H-7 sudah pernah dikirim.
        $tenant->refresh();
        $tenant->plan_expires_at = Carbon::now()->addHours(48);
        $tenant->save();

        $this->jalankan();
        $this->assertSame(3, $tenant->fresh()->renewal_reminder_stage);
        Mail::assertSent(PlanExpiring::class, fn (PlanExpiring $m) => $m->hariTersisa === 2);

        // Tinggal 20 jam -> dapat H-1.
        $tenant->refresh();
        $tenant->plan_expires_at = Carbon::now()->addHours(20);
        $tenant->save();

        $this->jalankan();
        $this->assertSame(1, $tenant->fresh()->renewal_reminder_stage);
        Mail::assertSent(PlanExpiring::class, fn (PlanExpiring $m) => $m->hariTersisa === 1);

        // Total 3 email sepanjang siklus, tidak lebih.
        Mail::assertSentCount(3);
    }

    public function test_scheduler_mati_lama_tetap_dapat_satu_pengingat(): void
    {
        // Kalau scheduler sempat mati dan baru jalan saat tinggal 1 hari,
        // pelanggan harus tetap dapat SATU pengingat paling relevan.
        Mail::fake();
        $tenant = $this->berbayar(0.5);

        $this->jalankan();

        Mail::assertSentCount(1);
        Mail::assertSent(PlanExpiring::class, fn (PlanExpiring $m) => $m->hariTersisa === 1);
        $this->assertSame(1, $tenant->fresh()->renewal_reminder_stage);
    }

    // ---------- pengecualian ----------

    public function test_paket_starter_tidak_dikirimi(): void
    {
        Mail::fake();
        $tenant = $this->makeTenant([
            'plan' => 'starter',
            'plan_expires_at' => null,
            'renewal_reminder_stage' => 0,
        ]);
        $this->makeUser($tenant);

        $this->jalankan();

        Mail::assertNothingSent();
    }

    public function test_workspace_nonaktif_tidak_dikirimi(): void
    {
        Mail::fake();
        $tenant = $this->berbayar(2, ['is_active' => false]);

        $this->jalankan();

        Mail::assertNothingSent();
        $this->assertSame(0, $tenant->fresh()->renewal_reminder_stage);
    }

    public function test_paket_sudah_lewat_tidak_dikirimi(): void
    {
        // Yang sudah lewat ditangani plans:downgrade-expired, bukan pengingat.
        Mail::fake();
        $tenant = $this->berbayar(-1);

        $this->jalankan();

        Mail::assertNothingSent();
    }

    // ---------- isi email ----------

    public function test_email_menyebut_qr_tetap_jalan(): void
    {
        Mail::fake();
        $this->berbayar(3);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, function (PlanExpiring $mail) {
            $html = $mail->render();

            // Pertanyaan pertama pelanggan begitu baca "paket berakhir" adalah
            // apakah QR-nya mati. Jawabannya harus ada di email.
            return str_contains($html, 'QR code kamu tetap jalan')
                && str_contains($html, 'tetap bisa dipindai');
        });
    }

    public function test_email_memuat_dampak_dan_harga(): void
    {
        Mail::fake();
        $this->berbayar(3);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, function (PlanExpiring $mail) {
            // Business Pro -> Starter: kuota QR kembali dibatasi dan fitur
            // kustomisasi logo dicabut. Keduanya harus disebut.
            return !empty($mail->dampak)
                && collect($mail->dampak)->contains(fn ($d) => str_contains($d, 'Kuota QR'))
                && collect($mail->dampak)->contains(fn ($d) => str_contains($d, 'logo'))
                && $mail->hargaPerBulan === 'Rp 59.000'
                && $mail->dapatDiperpanjang === true;
        });
    }

    public function test_tautan_menunjuk_ke_halaman_tagihan(): void
    {
        Mail::fake();
        $this->berbayar(3);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, function (PlanExpiring $mail) {
            return str_contains($mail->link, '/dashboard/billing')
                && str_starts_with($mail->link, config('app.frontend_url'));
        });
    }

    public function test_enterprise_tidak_ditawari_perpanjang_online(): void
    {
        // Enterprise itu contact_only: tidak ada harga publik, jadi jangan
        // menampilkan harga atau tombol perpanjang yang menyesatkan.
        Mail::fake();
        $this->berbayar(3, ['plan' => 'enterprise']);

        $this->jalankan();

        Mail::assertSent(PlanExpiring::class, function (PlanExpiring $mail) {
            return $mail->dapatDiperpanjang === false && $mail->hargaPerBulan === null;
        });
    }

    // ---------- perpanjangan mereset ----------

    public function test_perpanjang_lewat_pembayaran_mereset_pengingat(): void
    {
        Mail::fake();

        [$tenant, $user] = [null, null];
        $tenant = $this->berbayar(3);
        $user = $tenant->users()->first();

        $this->jalankan();
        $this->assertSame(3, $tenant->fresh()->renewal_reminder_stage);

        // Pelanggan memperpanjang: invoice bulanan dibayar & diverifikasi.
        $invoice = Invoice::create([
            'number' => 'INV-UJI-' . uniqid(),
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 7,
            'total_amount' => 59007,
            'status' => Invoice::STATUS_PENDING,
            'driver' => 'qris',
            'expires_at' => Carbon::now()->addHours(6),
        ]);

        $admin = $this->makeUser($this->makeTenant(), ['is_admin' => true]);
        $invoice->markPaid($admin->id);

        // Pelacak direset supaya periode berikutnya dapat pengingat lagi.
        $segar = $tenant->fresh();
        $this->assertSame(0, $segar->renewal_reminder_stage);
        $this->assertNull($segar->renewal_reminder_sent_at);

        // Dan pengingat periode baru benar-benar jalan lagi.
        $segar->plan_expires_at = Carbon::now()->addHours(20);
        $segar->save();

        $this->jalankan();
        $this->assertSame(1, $segar->fresh()->renewal_reminder_stage);
    }

    public function test_perpanjang_tidak_menghapus_masa_aktif_yang_tersisa(): void
    {
        // Perpanjangan menambah dari tanggal kedaluwarsa lama, bukan dari hari
        // ini — kalau tidak, pelanggan yang bayar lebih awal kehilangan sisa
        // harinya.
        Mail::fake();
        $tenant = $this->berbayar(3);
        $user = $tenant->users()->first();

        $sebelum = $tenant->fresh()->plan_expires_at->copy();

        $invoice = Invoice::create([
            'number' => 'INV-UJI-' . uniqid(),
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 9,
            'total_amount' => 59009,
            'status' => Invoice::STATUS_PENDING,
            'driver' => 'qris',
            'expires_at' => Carbon::now()->addHours(6),
        ]);

        $invoice->markPaid($this->makeUser($this->makeTenant(), ['is_admin' => true])->id);

        $sesudah = $tenant->fresh()->plan_expires_at;

        $this->assertTrue(
            $sesudah->greaterThan($sebelum),
            'Masa aktif harus bertambah, bukan mundur.'
        );

        // Selisihnya sekitar satu bulan dari tanggal lama.
        $this->assertSame(
            $sebelum->copy()->addMonth()->toDateString(),
            $sesudah->toDateString(),
        );
    }
}
