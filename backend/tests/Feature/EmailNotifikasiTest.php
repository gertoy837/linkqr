<?php

namespace Tests\Feature;

use App\Mail\InvoiceCreated;
use App\Mail\InvoiceRejected;
use App\Mail\PlanActivated;
use App\Mail\ResetPassword;
use App\Models\Invoice;
use App\Models\QrCode;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * Email notifikasi & alur lupa password.
 *
 * Dua hal yang dijaga di sini:
 *
 *  1. Email benar-benar dikirim di setiap titik penting. Sebelumnya tidak ada
 *     satu pun email: pelanggan yang memilih paket berbayar hanya melihat layar
 *     sekali, lalu tidak punya pengingat apa pun — padahal pembayarannya QRIS
 *     manual, jadi setiap pelanggan akan bertanya lewat WhatsApp.
 *
 *  2. Kegagalan kirim email TIDAK BOLEH menggagalkan alur uang. Kalau SMTP mati,
 *     invoice tetap harus dibuat dan pembayaran tetap harus bisa diverifikasi.
 */
class EmailNotifikasiTest extends TestCase
{
    use RefreshDatabase;

    private function paket(array $atribut = []): array
    {
        $tenant = $this->makeTenant(array_merge(['plan' => 'starter'], $atribut));
        $user = $this->makeUser($tenant);

        return [$tenant, $user];
    }

    // ---------- invoice dibuat ----------

    public function test_email_terkirim_saat_invoice_dibuat(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', [
                'plan' => 'business_pro',
                'billing_cycle' => 'monthly',
            ])
            ->assertCreated();

        Mail::assertSent(InvoiceCreated::class, function (InvoiceCreated $mail) use ($user) {
            return $mail->hasTo($user->email)
                && $mail->invoice->total_amount === 59000 + $mail->invoice->unique_code;
        });
    }

    public function test_email_invoice_memuat_nominal_dan_batas_waktu(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'business_pro', 'billing_cycle' => 'yearly'])
            ->assertCreated();

        Mail::assertSent(InvoiceCreated::class, function (InvoiceCreated $mail) {
            // Nominal tahunan harus setahun penuh, dan tautannya menunjuk ke
            // frontend (bukan domain API).
            return $mail->invoice->amount === 566400
                && str_contains($mail->link, '/dashboard/billing')
                && !str_contains($mail->link, 'qr-api.');
        });
    }

    public function test_invoice_tetap_dibuat_walau_email_gagal(): void
    {
        // SMTP mati tidak boleh menggagalkan pembuatan invoice: pelanggan yang
        // ingin membayar jangan sampai terhalang karena masalah email.
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP mati'));

        [, $user] = $this->paket();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'business_pro'])
            ->assertCreated();

        $this->assertSame(1, Invoice::where('user_id', $user->id)->count());
    }

    public function test_paket_gratis_tidak_mengirim_email(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'starter'])
            ->assertOk();

        Mail::assertNothingSent();
    }

    // ---------- verifikasi & penolakan ----------

    public function test_email_terkirim_saat_pembayaran_diverifikasi(): void
    {
        Mail::fake();
        [, $user] = $this->paket();
        $admin = $this->makeUser($this->makeTenant(), ['is_admin' => true]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'business_pro', 'billing_cycle' => 'yearly'])
            ->assertCreated();

        $invoice = Invoice::where('user_id', $user->id)->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/invoices/{$invoice->id}/verify")
            ->assertOk();

        Mail::assertSent(PlanActivated::class, function (PlanActivated $mail) use ($user) {
            return $mail->hasTo($user->email)
                && $mail->berlakuSampai !== null
                && !empty($mail->fitur);
        });
    }

    public function test_email_terkirim_saat_bukti_ditolak(): void
    {
        Mail::fake();
        [, $user] = $this->paket();
        $admin = $this->makeUser($this->makeTenant(), ['is_admin' => true]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'business_pro'])
            ->assertCreated();

        $invoice = Invoice::where('user_id', $user->id)->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/invoices/{$invoice->id}/reject", [
                'note' => 'Nominal tidak sesuai.',
            ])
            ->assertOk();

        Mail::assertSent(InvoiceRejected::class, function (InvoiceRejected $mail) use ($user) {
            return $mail->hasTo($user->email)
                && $mail->catatan === 'Nominal tidak sesuai.';
        });
    }

    public function test_verifikasi_tetap_berhasil_walau_email_gagal(): void
    {
        // Ini yang paling penting: pelanggan sudah transfer, jadi paketnya HARUS
        // tetap aktif walau email konfirmasinya gagal terkirim.
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP mati'));

        [$tenant, $user] = $this->paket();
        $admin = $this->makeUser($this->makeTenant(), ['is_admin' => true]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/invoices', ['plan' => 'business_pro'])
            ->assertCreated();

        $invoice = Invoice::where('user_id', $user->id)->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/invoices/{$invoice->id}/verify")
            ->assertOk();

        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame('business_pro', $tenant->fresh()->plan);
    }

    // ---------- lupa password ----------

    public function test_permintaan_reset_mengirim_email(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk();

        Mail::assertSent(ResetPassword::class, function (ResetPassword $mail) use ($user) {
            return $mail->hasTo($user->email)
                && str_contains($mail->link, '/reset-password?token=')
                && $mail->berlakuMenit === 60;
        });
    }

    public function test_email_tidak_terdaftar_tetap_menjawab_sukses(): void
    {
        // Menjawab "email tidak ditemukan" akan membuat endpoint ini bisa
        // dipakai menebak email mana yang punya akun.
        Mail::fake();

        $this->postJson('/api/forgot-password', ['email' => 'tidak.ada@example.com'])
            ->assertOk()
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Kalau email itu terdaftar'));

        Mail::assertNothingSent();
    }

    public function test_reset_password_mengganti_password(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'passwordBaru123',
            'password_confirmation' => 'passwordBaru123',
        ])->assertOk();

        // Password lama tidak berlaku lagi, password baru berlaku.
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(422);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'passwordBaru123',
        ])->assertOk();
    }

    public function test_reset_mencabut_semua_sesi_lama(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        // Sesi lama yang aktif (mis. penyerang yang menguasai akun).
        $user->createToken('lama');
        $this->assertSame(1, $user->tokens()->count());

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'passwordBaru123',
            'password_confirmation' => 'passwordBaru123',
        ])->assertOk();

        // Kalau password diganti karena akun diduga diambil orang, sesi lama
        // harus ikut mati — kalau tidak, penyerang tetap punya akses.
        $this->assertSame(0, $user->fresh()->tokens()->count());
    }

    public function test_token_palsu_ditolak(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $this->postJson('/api/reset-password', [
            'token' => 'token-palsu',
            'email' => $user->email,
            'password' => 'passwordBaru123',
            'password_confirmation' => 'passwordBaru123',
        ])->assertStatus(422);
    }

    public function test_token_tidak_bisa_dipakai_dua_kali(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'passwordBaru123',
            'password_confirmation' => 'passwordBaru123',
        ])->assertOk();

        // Token sekali pakai: percobaan kedua harus gagal.
        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'passwordLain123',
            'password_confirmation' => 'passwordLain123',
        ])->assertStatus(422);
    }

    public function test_password_baru_terlalu_pendek_ditolak(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'pendek',
            'password_confirmation' => 'pendek',
        ])->assertStatus(422);
    }

    public function test_konfirmasi_tidak_cocok_ditolak(): void
    {
        Mail::fake();
        [, $user] = $this->paket();

        $token = Password::broker()->createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'passwordBaru123',
            'password_confirmation' => 'bedaSekali123',
        ])->assertStatus(422);
    }

    public function test_token_tidak_bisa_dipakai_untuk_email_lain(): void
    {
        Mail::fake();
        [, $userA] = $this->paket();
        [, $userB] = $this->paket();

        $token = Password::broker()->createToken($userA);

        // Token milik A tidak boleh mengganti password B.
        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $userB->email,
            'password' => 'passwordBaru123',
            'password_confirmation' => 'passwordBaru123',
        ])->assertStatus(422);
    }

    // ---------- tautan email ----------

    public function test_tautan_email_menunjuk_ke_frontend_bukan_api(): void
    {
        config(['app.frontend_url' => 'https://qr.kovarastudio.id']);

        Mail::fake();
        [, $user] = $this->paket();

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        Mail::assertSent(ResetPassword::class, function (ResetPassword $mail) {
            // Tautan yang menunjuk ke domain API akan membingungkan pelanggan:
            // halaman reset ada di frontend.
            return str_starts_with($mail->link, 'https://qr.kovarastudio.id/')
                && !str_contains($mail->link, 'qr-api.');
        });
    }
}
