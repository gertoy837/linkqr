<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom `logo` sebelumnya `string` (255 karakter) karena rencananya diisi path
 * file. Sekarang isinya data URL, yang jauh lebih panjang.
 *
 * `mediumText`, bukan `text`: MySQL/MariaDB membatasi TEXT di 65.535 BYTE,
 * sementara QrLogo mengizinkan data URL sampai 280.000 karakter. Memakai TEXT
 * berarti logo di atas ~48 KB gagal disimpan di MySQL — justru di database yang
 * migrasi ini ingin amankan. mediumText menampung 16 MB, jadi ada ruang lega.
 *
 * Catatan: SQLite tidak menegakkan batas panjang, jadi data URL panjang sudah
 * tersimpan baik sebelum migrasi ini. Migrasi ini tetap perlu supaya skemanya
 * jujur dan tidak pecah kalau database dipindah ke MySQL/MariaDB.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qr_codes', function (Blueprint $table) {
            $table->mediumText('logo')->nullable()->change();
        });
    }

    /**
     * Sengaja TIDAK menurunkan tipe kolom kembali.
     *
     * `down()` yang mengembalikan kolom ke string(255) akan MEMOTONG data URL
     * yang sudah tersimpan — data pelanggan hilang hanya karena rollback.
     * Membiarkannya sebagai mediumText aman untuk skema lama.
     */
    public function down(): void
    {
        // no-op: mengecilkan kolom akan memotong data yang sudah ada.
    }
};
