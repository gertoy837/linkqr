<?php

namespace Tests\Feature;

use App\Models\QrCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Perbaikan dari tinjauan independen.
 *
 * Tiga hal yang dijaga di sini:
 *  1. Paket Starter boleh MENGEMBALIKAN warna ke bawaan (mengurangi), sama
 *     seperti kebijakan menghapus logo. Sebelumnya ini 403 dengan pesan
 *     menyesatkan, dan `color => null` juga ikut ditolak.
 *  2. Daftar API v1 tidak mengirim data URL logo (bisa ratusan kilobyte per
 *     item, 25 item per halaman).
 *  3. Detail API v1 tetap mengirimnya.
 */
class QrCustomizationReviewTest extends TestCase
{
    use RefreshDatabase;

    private function userPaket(string $plan): array
    {
        $tenant = $this->makeTenant(['plan' => $plan]);
        $user = $this->makeUser($tenant);

        return [$tenant, $user];
    }

    private function buatQr(array $tenantUser, array $attributes = []): QrCode
    {
        [$tenant, $user] = $tenantUser;

        return QrCode::create(array_merge([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'r' . substr(md5(uniqid('', true)), 0, 5),
            'is_active' => true,
            'color' => '#dc2626',
            'logo' => null,
        ], $attributes));
    }

    // ---------- Starter boleh mengurangi ----------

    public function test_starter_bisa_reset_warna_ke_bawaan(): void
    {
        $paket = $this->userPaket('starter');
        $qr = $this->buatQr($paket, ['color' => '#dc2626']);

        $this->actingAs($paket[1], 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => QrCode::DEFAULT_COLOR])
            ->assertOk();

        $this->assertSame(QrCode::DEFAULT_COLOR, $qr->fresh()->color);
    }

    public function test_starter_bisa_reset_warna_dengan_null(): void
    {
        $paket = $this->userPaket('starter');
        $qr = $this->buatQr($paket, ['color' => '#dc2626']);

        // null diperlakukan sebagai "kembalikan ke bawaan", bukan 403.
        $this->actingAs($paket[1], 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => null])
            ->assertOk();

        $this->assertSame(QrCode::DEFAULT_COLOR, $qr->fresh()->color);
    }

    public function test_starter_bisa_hapus_logo(): void
    {
        $paket = $this->userPaket('starter');

        $png = 'data:image/png;base64,' . base64_encode(hex2bin(
            '89504e470d0a1a0a0000000d4948445200000001000000010806000000'
            . '1f15c4890000000d4944415478da63f8ffff3f0005fe02fea72d5c1f0000000049454e44ae426082'
        ));

        // QR lama yang sudah punya logo (dibuat saat masih Pro).
        $qr = $this->buatQr($paket, ['logo' => $png]);

        $this->actingAs($paket[1], 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['logo' => null])
            ->assertOk();

        $this->assertNull($qr->fresh()->logo);
    }

    public function test_starter_tetap_tidak_bisa_pindah_ke_warna_kustom(): void
    {
        $paket = $this->userPaket('starter');
        $qr = $this->buatQr($paket, ['color' => QrCode::DEFAULT_COLOR]);

        // Menambah kustomisasi tetap dilarang.
        $this->actingAs($paket[1], 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => '#dc2626'])
            ->assertStatus(403);
    }

    public function test_starter_tidak_bisa_pindah_dari_satu_warna_kustom_ke_yang_lain(): void
    {
        $paket = $this->userPaket('starter');
        $qr = $this->buatQr($paket, ['color' => '#dc2626']);

        $this->actingAs($paket[1], 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => '#059669'])
            ->assertStatus(403);

        $this->assertSame('#dc2626', $qr->fresh()->color);
    }

    // ---------- API v1 ----------

    private function kunciApi(array $paket): string
    {
        [$tenant, $user] = $paket;

        // Kunci asli hanya ada saat dibuat; yang tersimpan cuma hash-nya.
        $asli = 'lqr_' . bin2hex(random_bytes(20));

        $user->apiKeys()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Uji',
            'key_prefix' => substr($asli, 0, 12),
            'key_hash' => hash('sha256', $asli),
            'is_active' => true,
        ]);

        return $asli;
    }

    public function test_api_v1_daftar_tidak_membawa_logo(): void
    {
        $paket = $this->userPaket('enterprise');
        $png = 'data:image/png;base64,' . base64_encode(hex2bin(
            '89504e470d0a1a0a0000000d4948445200000001000000010806000000'
            . '1f15c4890000000d4944415478da63f8ffff3f0005fe02fea72d5c1f0000000049454e44ae426082'
        ));

        $this->buatQr($paket, ['logo' => $png, 'short_code' => 'apiv01']);
        $key = $this->kunciApi($paket);

        $res = $this->withHeaders(['X-API-Key' => $key])
            ->getJson('/api/v1/qr-codes')
            ->assertOk();

        $item = $res->json('data.0');
        $this->assertNotNull($item);
        $this->assertArrayNotHasKey('logo', $item);
    }

    public function test_api_v1_detail_tetap_membawa_logo(): void
    {
        $paket = $this->userPaket('enterprise');
        $png = 'data:image/png;base64,' . base64_encode(hex2bin(
            '89504e470d0a1a0a0000000d4948445200000001000000010806000000'
            . '1f15c4890000000d4944415478da63f8ffff3f0005fe02fea72d5c1f0000000049454e44ae426082'
        ));

        $this->buatQr($paket, ['logo' => $png, 'short_code' => 'apiv02']);
        $key = $this->kunciApi($paket);

        $this->withHeaders(['X-API-Key' => $key])
            ->getJson('/api/v1/qr-codes/apiv02')
            ->assertOk()
            ->assertJsonPath('data.logo', $png);
    }
}
