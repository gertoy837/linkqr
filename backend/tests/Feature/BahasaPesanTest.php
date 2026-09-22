<?php

namespace Tests\Feature;

use App\Models\QrCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Seluruh antarmuka berbahasa Indonesia, jadi pesan dari API pun harus ikut.
 * Sebelum ini APP_LOCALE bernilai "en" dan folder lang/ belum pernah dibuat,
 * sehingga pengguna melihat "The email field is required." di tengah UI
 * berbahasa Indonesia.
 */
class BahasaPesanTest extends TestCase
{
    use RefreshDatabase;

    // ---------------------------------------------------------------- validasi

    public function test_kredensial_salah_memakai_bahasa_indonesia(): void
    {
        $tenant = $this->makeTenant();
        $this->makeUser($tenant, ['email' => 'ada@example.com']);

        $res = $this->postJson('/api/login', [
            'email' => 'ada@example.com',
            'password' => 'password-salah',
        ]);

        $res->assertStatus(422);
        $pesan = $res->json('errors.email.0') ?? $res->json('message');

        $this->assertStringContainsString('salah', strtolower((string) $pesan));
        $this->assertStringNotContainsString('incorrect', (string) $pesan);
        $this->assertStringNotContainsString('credentials', (string) $pesan);
    }

    public function test_validasi_registrasi_memakai_bahasa_indonesia(): void
    {
        $res = $this->postJson('/api/register', []);

        $res->assertStatus(422);
        $errors = $res->json('errors');

        // kunci wajib: nama, email, password
        foreach (['name', 'email', 'password'] as $field) {
            $this->assertArrayHasKey($field, $errors, "field {$field} tidak divalidasi");
        }

        $semua = strtolower(implode(' ', array_map(
            fn ($v) => is_array($v) ? implode(' ', $v) : (string) $v,
            $errors
        )));

        $this->assertStringContainsString('wajib diisi', $semua);
        // tidak boleh ada sisa pesan bawaan Laravel
        foreach (['required', 'the ', 'field', 'must be'] as $inggris) {
            $this->assertStringNotContainsString($inggris, $semua);
        }
    }

    public function test_email_duplikat_memakai_bahasa_indonesia(): void
    {
        $tenant = $this->makeTenant();
        $this->makeUser($tenant, ['email' => 'dipakai@example.com']);

        $res = $this->postJson('/api/register', [
            'name' => 'Pendaftar Baru',
            'email' => 'dipakai@example.com',
            'password' => 'rahasia12345',
            'password_confirmation' => 'rahasia12345',
        ]);

        $res->assertStatus(422);
        $pesan = strtolower((string) ($res->json('errors.email.0') ?? ''));

        $this->assertStringContainsString('sudah terdaftar', $pesan);
        $this->assertStringNotContainsString('taken', $pesan);
    }

    public function test_password_terlalu_pendek_memakai_bahasa_indonesia(): void
    {
        $res = $this->postJson('/api/register', [
            'name' => 'Pendaftar',
            'email' => 'pendek@example.com',
            'password' => 'abc',
            'password_confirmation' => 'abc',
        ]);

        $res->assertStatus(422);
        $pesan = strtolower((string) ($res->json('errors.password.0') ?? ''));

        $this->assertStringContainsString('minimal', $pesan);
        $this->assertStringContainsString('karakter', $pesan);
        $this->assertStringNotContainsString('least', $pesan);
    }

    public function test_konfirmasi_password_tidak_cocok(): void
    {
        $res = $this->postJson('/api/register', [
            'name' => 'Pendaftar',
            'email' => 'cocok@example.com',
            'password' => 'rahasia12345',
            'password_confirmation' => 'beda12345',
        ]);

        $res->assertStatus(422);
        $pesan = strtolower((string) ($res->json('errors.password.0') ?? ''));

        $this->assertStringContainsString('konfirmasi', $pesan);
        $this->assertStringNotContainsString('confirmation does not match', $pesan);
    }

    // ------------------------------------------------- pesan hardcoded lain

    public function test_link_tidak_ditemukan_memakai_bahasa_indonesia(): void
    {
        $res = $this->get('/api/s/tidakada');

        $res->assertStatus(404);
        $body = strtolower($res->getContent());

        $this->assertStringContainsString('tidak ditemukan', $body);
        $this->assertStringNotContainsString('link not found', $body);
    }

    public function test_logout_memakai_bahasa_indonesia(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        // actingAs() menempelkan Sanctum TransientToken yang tidak punya
        // delete(), sedangkan logout() memanggil currentAccessToken()->delete().
        // Jadi tes ini harus memakai token sungguhan.
        $token = $user->createToken('tes-logout')->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $res->assertStatus(200);
        $pesan = strtolower((string) $res->json('message'));

        $this->assertStringContainsString('keluar', $pesan);
        $this->assertStringNotContainsString('logged out', $pesan);
    }

    public function test_hapus_qr_memakai_bahasa_indonesia(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        $qr = QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'QR',
            'target_url' => 'https://tujuan.example.com',
            'short_code' => 'hapusme',
            'is_active' => true,
        ]);

        $res = $this->actingAs($user)->deleteJson("/api/qr-codes/{$qr->id}");

        $res->assertStatus(200);
        $pesan = strtolower((string) $res->json('message'));

        $this->assertStringContainsString('dihapus', $pesan);
        $this->assertStringNotContainsString('deleted', $pesan);
    }

    public function test_akses_admin_ditolak_memakai_bahasa_indonesia(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant); // bukan admin

        $res = $this->actingAs($user)->getJson('/api/admin/users');

        $res->assertStatus(403);
        $pesan = strtolower((string) $res->json('message'));

        $this->assertStringContainsString('ditolak', $pesan);
        $this->assertStringNotContainsString('forbidden', $pesan);
    }

    public function test_kuota_qr_habis_memakai_bahasa_indonesia(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        // paket starter hanya boleh 5 QR
        for ($i = 0; $i < 5; $i++) {
            QrCode::create([
                'user_id' => $user->id,
                'tenant_id' => $tenant->id,
                'title' => "QR {$i}",
                'target_url' => 'https://tujuan.example.com',
                'short_code' => "kuota{$i}",
                'is_active' => true,
            ]);
        }

        $res = $this->actingAs($user)->postJson('/api/qr-codes', [
            'title' => 'QR ke-6',
            'target_url' => 'https://tujuan.example.com',
        ]);

        // Kuota yang habis dibalas 403 (bukan 422): permintaannya sah, tapi
        // paketnya tidak mengizinkan. Lihat QrCodeController::store().
        $res->assertStatus(403);
        $pesan = strtolower((string) $res->json('message'));

        $this->assertStringContainsString('kuota', $pesan);
        $this->assertStringContainsString('habis', $pesan);
    }

    public function test_locale_aplikasi_adalah_indonesia(): void
    {
        $this->assertSame('id', config('app.locale'));
        $this->assertFileExists(base_path('lang/id/validation.php'));
    }
}
