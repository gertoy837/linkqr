<?php

namespace Tests\Feature;

use App\Models\QrCode;
use App\Support\QrColor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Warna QR harus tetap bisa discan.
 *
 * Kustomisasi warna adalah fitur berbayar. Kalau warnanya terlalu pucat, modul
 * QR menyatu dengan latar putih dan QR gagal discan di kamera HP sungguhan —
 * pelanggan membayar untuk fitur yang merusak QR-nya. Karena itu kontras
 * minimum ditegakkan di server, bukan sekadar disarankan di UI.
 */
class QrColorTest extends TestCase
{
    use RefreshDatabase;

    private function userPro(): array
    {
        $tenant = $this->makeTenant(['plan' => 'business_pro']);
        $user = $this->makeUser($tenant);

        return [$tenant, $user];
    }

    // ---------- hitungan kontras ----------

    public function test_warna_preset_semuanya_cukup_kontras(): void
    {
        // Warna persis dari PRESET_COLORS di frontend. Semuanya harus lolos,
        // karena inilah yang ditawarkan tombol — menawarkan warna yang ditolak
        // server berarti tombolnya bohong.
        foreach ([
            '#4f46e5', '#0f172a', '#059669', '#dc2626', '#d97706', '#7c3aed',
        ] as $hex) {
            $this->assertTrue(
                QrColor::isScannable($hex),
                "Warna preset {$hex} harus lolos validasi kontras "
                . '(kontras ' . round(QrColor::contrastWithWhite($hex), 2) . ').',
            );
        }
    }

    public function test_warna_bawaan_lolos(): void
    {
        $this->assertTrue(QrColor::isScannable(QrCode::DEFAULT_COLOR));
    }

    public function test_warna_pucat_ditolak(): void
    {
        // Kontras rendah: QR "terbaca" oleh decoder toleran, tapi gagal di
        // kamera HP sungguhan.
        foreach (['#FFFF00', '#FFFF99', '#CCCCCC', '#FFFFFF', '#E0E0E0'] as $hex) {
            $this->assertFalse(
                QrColor::isScannable($hex),
                "Warna pucat {$hex} seharusnya ditolak.",
            );
        }
    }

    public function test_kontras_dihitung_benar(): void
    {
        // Putih di atas putih = 1.0 (tidak ada kontras sama sekali).
        $this->assertEqualsWithDelta(1.0, QrColor::contrastWithWhite('#FFFFFF'), 0.01);
        // Hitam = 21.0 (maksimum).
        $this->assertEqualsWithDelta(21.0, QrColor::contrastWithWhite('#000000'), 0.01);
    }

    public function test_hex_tidak_sah_kontras_nol(): void
    {
        $this->assertSame(0.0, QrColor::contrastWithWhite('bukan-warna'));
        $this->assertFalse(QrColor::isScannable('bukan-warna'));
        $this->assertFalse(QrColor::isValidHex('#FFF'));
        $this->assertTrue(QrColor::isValidHex('#ffffff'));
    }

    // ---------- lewat endpoint nyata ----------

    public function test_pro_tidak_bisa_membuat_qr_warna_pucat(): void
    {
        [$tenant, $user] = $this->userPro();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'color' => '#FFFF00',
            ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'color_too_light');
    }

    public function test_pro_tidak_bisa_mengubah_ke_warna_pucat(): void
    {
        [$tenant, $user] = $this->userPro();

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'warna1',
            'is_active' => true,
            'color' => '#4f46e5',
            'logo' => null,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['color' => '#FFFF99'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'color_too_light');

        $this->assertSame('#4f46e5', $qr->fresh()->color);
    }

    public function test_pro_tetap_bisa_warna_gelap(): void
    {
        [$tenant, $user] = $this->userPro();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', [
                'title' => 'Menu',
                'target_url' => 'https://example.com',
                'color' => '#059669',
            ])
            ->assertCreated();
    }

    /**
     * QR lama harus tetap bisa diedit walau warnanya (secara teori) pucat —
     * mis. kalau aturan kontras diperketat di kemudian hari. Yang dilarang
     * adalah BERPINDAH ke warna pucat, bukan mempertahankan yang sudah ada.
     */
    public function test_qr_lama_dengan_warna_pucat_masih_bisa_diedit(): void
    {
        [$tenant, $user] = $this->userPro();

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'Menu',
            'target_url' => 'https://example.com',
            'short_code' => 'warna2',
            'is_active' => true,
            'color' => '#FFFF00',
            'logo' => null,
        ]);

        // Ganti judul saja, tanpa menyentuh warna.
        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/qr-codes/{$qr->id}", ['title' => 'Menu Baru'])
            ->assertOk();

        $this->assertSame('Menu Baru', $qr->fresh()->title);
        $this->assertSame('#FFFF00', $qr->fresh()->color);
    }
}
