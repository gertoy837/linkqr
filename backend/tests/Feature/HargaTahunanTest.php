<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Support\PlanPricing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Harga siklus tahunan harus ditagih 12x.
 *
 * Bug yang dijaga di sini: config plans.php menyimpan `price.yearly` dan
 * nilainya dibaca sebagai TOTAL SETAHUN oleh backend, padahal frontend
 * menampilkannya sebagai harga PER BULAN. Pelanggan yang memilih tahunan
 * hanya ditagih Rp 49.000 (satu bulan) tetapi masa aktifnya diberi 12 bulan
 * oleh Invoice::activatePlan (addYear()).
 *
 * Perbaikan: price.yearly adalah HARGA PER BULAN, dan nominal invoice
 * dihitung PlanPricing::chargeAmount() = harga per bulan x 12.
 */
class HargaTahunanTest extends TestCase
{
    use RefreshDatabase;

    private function starterUser(): array
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        return [$tenant, $user];
    }

    // ---------- helper harga ----------

    public function test_harga_tahunan_adalah_harga_per_bulan(): void
    {
        $this->assertSame(59000, PlanPricing::monthlyRate('business_pro', 'monthly'));
        $this->assertSame(47200, PlanPricing::monthlyRate('business_pro', 'yearly'));
    }

    public function test_nominal_tahunan_adalah_harga_per_bulan_dikali_dua_belas(): void
    {
        $this->assertSame(59000, PlanPricing::chargeAmount('business_pro', 'monthly'));
        $this->assertSame(
            566400,
            PlanPricing::chargeAmount('business_pro', 'yearly'),
            'Invoice tahunan harus 47200 x 12 = 566400, bukan 47200.'
        );
    }

    public function test_tahunan_benar_benar_dua_puluh_persen_lebih_murah(): void
    {
        $bulanan = PlanPricing::chargeAmount('business_pro', 'monthly') * 12;
        $tahunan = PlanPricing::chargeAmount('business_pro', 'yearly');

        // 566400 / 708000 = 0.8 tepat.
        $this->assertSame(
            $bulanan,
            (int) round($tahunan / 0.8),
            'Diskon tahunan harus tepat 20% dari harga bulanan x 12.'
        );
    }

    public function test_paket_gratis_dan_enterprise_tidak_meminta_bayar(): void
    {
        $this->assertSame(0, PlanPricing::chargeAmount('starter', 'yearly'));
        $this->assertFalse(PlanPricing::requiresPayment('starter', 'yearly'));

        // Enterprise contact_only: harganya null, tidak boleh jadi invoice 0.
        $this->assertSame(0, PlanPricing::chargeAmount('enterprise', 'yearly'));
    }

    public function test_mrr_invoice_tahunan_kembali_ke_harga_per_bulan(): void
    {
        $this->assertSame(
            47200,
            PlanPricing::monthlyRateFromAmount(566400, 'yearly'),
            'Laporan MRR tahunan harus kembali ke 47200/bulan.'
        );
        $this->assertSame(59000, PlanPricing::monthlyRateFromAmount(59000, 'monthly'));
    }

    // ---------- lewat endpoint nyata ----------

    public function test_invoice_tahunan_ditagih_setahun_penuh(): void
    {
        [$tenant, $user] = $this->starterUser();

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', [
                'plan' => 'business_pro',
                'billing_cycle' => 'yearly',
            ])
            ->assertCreated()
            ->assertJsonPath('requires_payment', true);

        $this->assertSame(
            566400,
            (int) $res->json('invoice.amount'),
            'Nominal invoice tahunan harus 566400.'
        );

        $this->assertSame(
            566400,
            (int) Invoice::where('billing_cycle', 'yearly')->firstOrFail()->amount
        );
    }

    public function test_invoice_bulanan_tetap_satu_bulan(): void
    {
        [$tenant, $user] = $this->starterUser();

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', [
                'plan' => 'business_pro',
                'billing_cycle' => 'monthly',
            ])
            ->assertCreated();

        $this->assertSame(59000, (int) $res->json('invoice.amount'));
    }

    /**
     * Inti bug: uang yang masuk harus sepadan dengan masa aktif yang diberikan.
     */
    public function test_invoice_tahunan_lunas_memberi_tepat_satu_tahun(): void
    {
        [$tenant, $user] = $this->starterUser();

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', [
                'plan' => 'business_pro',
                'billing_cycle' => 'yearly',
            ])
            ->assertCreated();

        $invoice = Invoice::findOrFail($res->json('invoice.id'));

        $sebelum = Carbon::now();
        $invoice->markPaid();

        $tenant->refresh();

        $this->assertSame('business_pro', $tenant->plan);
        $this->assertSame('yearly', $tenant->billing_cycle);
        $this->assertNotNull($tenant->plan_expires_at);

        // Masa aktif harus ~12 bulan dari sekarang, bukan 1 bulan.
        //
        // Dibandingkan dengan rentang, bukan diffInMonths(): diffInMonths()
        // memotong ke bawah, jadi selisih 11 bulan 30 hari terbaca "11" dan
        // membuat tes gagal padahal tanggalnya benar.
        $this->assertTrue(
            $tenant->plan_expires_at->between(
                $sebelum->copy()->addYear()->subMinute(),
                $sebelum->copy()->addYear()->addMinute(),
            ),
            'Masa aktif tahunan harus berakhir sekitar satu tahun dari sekarang, '
            . 'bukan satu bulan. Aktual: ' . $tenant->plan_expires_at
        );

        // Jarak dalam hari juga dipastikan mendekati 365, bukan ~30.
        $hari = $sebelum->diffInDays($tenant->plan_expires_at);
        $this->assertGreaterThan(
            360,
            $hari,
            "Masa aktif hanya {$hari} hari — seharusnya setahun penuh."
        );
    }

    public function test_registrasi_melaporkan_kebutuhan_bayar_untuk_tahunan(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Budi',
            'email' => 'budi.tahunan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'plan' => 'business_pro',
            'billing_cycle' => 'yearly',
        ])
            ->assertCreated()
            ->assertJsonPath('requires_payment', true)
            ->assertJsonPath('requested_billing_cycle', 'yearly');
    }
}
