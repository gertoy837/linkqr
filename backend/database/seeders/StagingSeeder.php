<?php

namespace Database\Seeders;

use App\Models\QrCode;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Data uji untuk STAGING.
 *
 * Sengaja TIDAK memuat data klien asli: staging dipakai untuk membuktikan
 * perubahan sebelum menyentuh produksi, dan menyalin data pelanggan ke sana
 * berarti menggandakan data pribadi tanpa alasan.
 *
 * Pengaman: seeder ini menolak berjalan kalau APP_ENV=production, supaya tidak
 * ada cara tidak sengaja membuat akun percobaan di server klien.
 */
class StagingSeeder extends Seeder
{
    /** Kata sandi semua akun uji. Hanya untuk staging. */
    public const SANDI = 'password123';

    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command->error('DITOLAK: StagingSeeder tidak boleh dijalankan di produksi.');
            return;
        }

        $this->command->info('Membuat data uji staging...');

        // --- Admin ---
        $admin = $this->buatAkun(
            'Admin Uji',
            'admin@linkqr.test',
            'Admin Workspace',
            'admin-workspace',
            'business_pro',
            true,
            now()->addYears(5),
        );
        $this->command->info("  admin   : admin@linkqr.test / " . self::SANDI);

        // --- Paket berbayar: untuk menguji logo & warna ---
        $pro = $this->buatAkun(
            'Pro Uji',
            'pro@linkqr.test',
            'Pro Workspace',
            'pro-workspace',
            'business_pro',
            false,
            now()->addMonth(),
        );
        $this->command->info("  pro     : pro@linkqr.test / " . self::SANDI);

        // --- Paket gratis: untuk menguji gating fitur berbayar ---
        $starter = $this->buatAkun(
            'Starter Uji',
            'starter@linkqr.test',
            'Starter Workspace',
            'starter-workspace',
            'starter',
            false,
            null,
        );
        $this->command->info("  starter : starter@linkqr.test / " . self::SANDI);

        // --- QR contoh ---
        $this->buatQr($pro, 'QR Pro — logo & warna', 'https://example.com/pro', '#dc2626', $this->logoContoh());
        $this->buatQr($pro, 'QR Pro — polos', 'https://example.com/polos', '#2563EB', null);
        $this->buatQr($starter, 'QR Starter — bawaan', 'https://example.com/starter', '#2563EB', null);

        // --- Satu tenant berbayar yang AKAN HABIS, untuk menguji pengingat ---
        $akanHabis = $this->buatAkun(
            'Segera Habis',
            'expiring@linkqr.test',
            'Expiring Workspace',
            'expiring-workspace',
            'business_pro',
            false,
            now()->addDays(3),
        );
        $this->buatQr($akanHabis, 'QR akan habis', 'https://example.com/expiring', '#2563EB', null);
        $this->command->info("  habis   : expiring@linkqr.test / " . self::SANDI . " (berakhir 3 hari lagi)");

        $this->command->info('Selesai.');
    }

    private function buatAkun(
        string $nama,
        string $email,
        string $namaTenant,
        string $slug,
        string $paket,
        bool $admin,
        $kedaluwarsa,
    ): User {
        $tenant = Tenant::firstOrCreate(
            ['slug' => $slug],
            [
                'name' => $namaTenant,
                'is_active' => true,
                'plan' => $paket,
                'billing_cycle' => 'monthly',
                'plan_expires_at' => $kedaluwarsa,
                'renewal_reminder_stage' => 0,
            ],
        );

        // Hash ditulis lewat query builder: model User punya cast
        // 'password' => 'hashed', jadi menulis hash yang sudah jadi lewat model
        // akan membuatnya ter-hash dua kali.
        //
        // Kolom password wajib diisi (NOT NULL), jadi nilai sementara ikut
        // disertakan saat pembuatan lalu ditimpa tepat di bawah.
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $nama,
                'password' => Hash::make(self::SANDI),
                'tenant_id' => $tenant->id,
                'is_admin' => $admin,
                'email_verified_at' => now(),
            ],
        );

        DB::table('users')->where('id', $user->id)->update([
            'password' => Hash::make(self::SANDI),
        ]);

        return $user->refresh();
    }

    private function buatQr(User $user, string $judul, string $target, string $warna, ?string $logo): QrCode
    {
        return QrCode::firstOrCreate(
            ['short_code' => substr(md5($judul), 0, 6)],
            [
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id,
                'title' => $judul,
                'target_url' => $target,
                'color' => $warna,
                'logo' => $logo,
                'is_active' => true,
            ],
        );
    }

    /** Logo kotak kecil sebagai data URL — cukup untuk menguji tampilan. */
    private function logoContoh(): string
    {
        $img = imagecreatetruecolor(64, 64);
        imagefill($img, 0, 0, imagecolorallocate($img, 220, 38, 38));
        $putih = imagecolorallocate($img, 255, 255, 255);
        imagefilledellipse($img, 32, 32, 34, 34, $putih);

        ob_start();
        imagepng($img);
        $png = ob_get_clean();
        imagedestroy($img);

        return 'data:image/png;base64,' . base64_encode($png);
    }
}
