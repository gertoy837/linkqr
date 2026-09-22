<?php

namespace Tests\Feature;

use App\Models\QrCode;
use App\Support\QrLogo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Kustomisasi tampilan QR (warna + logo) adalah fitur Business Pro.
 *
 * Dua hal yang dijaga di sini:
 *
 *  1. Fitur yang DIJUAL benar-benar bisa dipakai pembeli Pro — halaman harga
 *     mengiklankan "Kustomisasi Logo & Warna", jadi harus ada jalan untuk
 *     memakainya.
 *  2. Fitur yang dijual TIDAK bisa dipakai gratis. Sebelumnya warna bebas
 *     diganti paket Starter, jadi keunggulan yang dibayar pembeli Pro bisa
 *     didapat siapa saja tanpa bayar.
 */
class QrCustomizationTest extends TestCase
{
    use RefreshDatabase;

    /** PNG 1x1 asli, dipakai sebagai logo sah. */
    private function pngDataUrl(): string
    {
        return 'data:image/png;base64,' . base64_encode(hex2bin(
            '89504e470d0a1a0a0000000d4948445200000001000000010806000000'
            . '1f15c4890000000d4944415478da63f8ffff3f0005fe02fea72d5c1f0000000049454e44ae426082'
        ));
    }

    private function userDenganPaket(string $plan): array
    {
        $tenant = $this->makeTenant(['plan' => $plan]);
        $user = $this->makeUser($tenant);

        return [$tenant, $user];
    }

    // ---------- paket gratis: tidak boleh kustom ----------

    public function test_starter_tidak_boleh_pakai_warna_kustom(): void
    {
        [$tenant, $user] = $this->userDenganPaket('starter');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'color' => '#dc2626',
            ])
            ->assertStatus(403)
            ->assertJsonPath('code', 'plan_upgrade_required');
    }

    public function test_starter_tidak_boleh_pakai_logo(): void
    {
        [$tenant, $user] = $this->userDenganPaket('starter');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'logo' => $this->pngDataUrl(),
            ])
            ->assertStatus(403)
            ->assertJsonPath('feature', 'logo_branding');
    }

    public function test_starter_tetap_bisa_buat_qr_biasa(): void
    {
        [$tenant, $user] = $this->userDenganPaket('starter');

        // Tanpa warna & logo: pembuatan QR yang sah tidak boleh ikut terblokir.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
            ])
            ->assertCreated();

        // Warna bawaan juga harus lolos — bukan "kustomisasi".
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu 2',
                'target_url' => 'https://example.com',
                'color' => QrCode::DEFAULT_COLOR,
            ])
            ->assertCreated();
    }

    public function test_starter_tidak_bisa_menambah_logo_lewat_edit(): void
    {
        [$tenant, $user] = $this->userDenganPaket('starter');

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'abc123',
            'is_active' => true,
            'color' => QrCode::DEFAULT_COLOR,
            'logo' => null,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['logo' => $this->pngDataUrl()])
            ->assertStatus(403);

        $this->assertNull($qr->fresh()->logo);
    }

    /**
     * QR lama yang sudah berwarna kustom (dibuat sebelum fitur ini dipagari)
     * harus tetap bisa diedit. Kalau tidak, mengubah judul saja akan diam-diam
     * mereset warna yang mungkin sudah tercetak di meja restoran.
     */
    public function test_starter_boleh_menyimpan_warna_lama_saat_edit(): void
    {
        [$tenant, $user] = $this->userDenganPaket('starter');

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'lama01',
            'is_active' => true,
            'color' => '#dc2626',
            'logo' => null,
        ]);

        // Kirim ulang warna yang sama, plus perubahan judul.
        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", [
                'title' => 'Menu Baru',
                'color' => '#dc2626',
            ])
            ->assertOk();

        $this->assertSame('Menu Baru', $qr->fresh()->title);
        $this->assertSame('#dc2626', $qr->fresh()->color);
    }

    public function test_starter_tidak_bisa_mengganti_warna_saat_edit(): void
    {
        [$tenant, $user] = $this->userDenganPaket('starter');

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'lama02',
            'is_active' => true,
            'color' => QrCode::DEFAULT_COLOR,
            'logo' => null,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => '#dc2626'])
            ->assertStatus(403);

        $this->assertSame(QrCode::DEFAULT_COLOR, $qr->fresh()->color);
    }

    // ---------- paket Pro: fitur yang dibayar benar-benar jalan ----------

    public function test_pro_bisa_pakai_warna_dan_logo(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu Pro',
                'target_url' => 'https://example.com',
                'color' => '#dc2626',
                'logo' => $this->pngDataUrl(),
            ])
            ->assertCreated();

        $this->assertSame('#dc2626', $res->json('color'));
        $this->assertSame($this->pngDataUrl(), $res->json('logo'));
    }

    public function test_pro_bisa_mengganti_warna_saat_edit(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'pro001',
            'is_active' => true,
            'color' => QrCode::DEFAULT_COLOR,
            'logo' => null,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => '#059669'])
            ->assertOk();

        $this->assertSame('#059669', $qr->fresh()->color);
    }

    // ---------- validasi isi logo ----------

    public function test_logo_svg_ditolak(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'logo' => 'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'invalid_logo');
    }

    public function test_logo_bukan_gambar_ditolak(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'logo' => 'data:image/png;base64,' . base64_encode('ini bukan gambar'),
            ])
            ->assertStatus(422);
    }

    public function test_logo_mime_palsu_ditolak(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        // Isinya GIF, tapi header data URL mengaku PNG.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'logo' => 'data:image/png;base64,' . base64_encode('GIF89a' . str_repeat("\x00", 30)),
            ])
            ->assertStatus(422);
    }

    public function test_url_logo_biasa_ditolak(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'logo' => 'https://example.com/logo.png',
            ])
            ->assertStatus(422);
    }

    public function test_logo_terlalu_besar_ditolak(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'logo' => 'data:image/png;base64,' . base64_encode(str_repeat('A', 400_000)),
            ])
            ->assertStatus(422);
    }

    // ---------- daftar QR tidak ikut mengirim logo ----------

    public function test_daftar_qr_tidak_membawa_logo(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'big001',
            'is_active' => true,
            'color' => '#dc2626',
            'logo' => $this->pngDataUrl(),
        ]);

        $res = $this->actingAs($user, 'sanctum')
            ->getJson('/api/qr-codes')
            ->assertOk();

        // Data URL bisa ratusan kilobyte; halaman daftar tidak merender QR,
        // jadi mengirimnya hanya membengkakkan respons.
        $this->assertArrayNotHasKey('logo', $res->json('0'));
    }

    public function test_detail_qr_tetap_membawa_logo(): void
    {
        [$tenant, $user] = $this->userDenganPaket('business_pro');

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'det001',
            'is_active' => true,
            'color' => '#dc2626',
            'logo' => $this->pngDataUrl(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/qr-codes/{$qr->id}")
            ->assertOk()
            ->assertJsonPath('logo', $this->pngDataUrl());
    }

    // ---------- admin tidak terkunci fitur ----------

    public function test_admin_boleh_kustomisasi_walau_paketnya_starter(): void
    {
        $tenant = $this->makeTenant(['plan' => 'starter']);
        $admin = $this->makeUser($tenant, ['is_admin' => true]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu Admin',
                'target_url' => 'https://example.com',
                'color' => '#dc2626',
                'logo' => $this->pngDataUrl(),
            ])
            ->assertCreated();
    }

    // ---------- QrLogo langsung ----------

    public function test_qr_logo_menolak_yang_bukan_data_url(): void
    {
        $this->assertFalse(QrLogo::isValid(''));
        $this->assertFalse(QrLogo::isValid('https://example.com/a.png'));
        $this->assertFalse(QrLogo::isValid('data:image/png;base64,!!!'));
        $this->assertTrue(QrLogo::isValid($this->pngDataUrl()));
    }
}
