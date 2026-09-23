<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pelacak pengingat masa aktif paket.
 *
 * `renewal_reminder_stage` menyimpan ambang pengingat yang TERAKHIR dikirim
 * (0 = belum ada, 7 = H-7, 3 = H-3, 1 = H-1). Tanpa kolom ini, command
 * pengingat yang jalan tiap hari akan mengirim email yang sama berulang kali
 * sampai pelanggan merasa di-spam — dan pengingat yang terasa spam justru
 * diabaikan, padahal isinya penting.
 *
 * Saat paket diperpanjang, nilainya direset ke 0 supaya siklus berikutnya
 * mendapat pengingat lagi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->unsignedTinyInteger('renewal_reminder_stage')
                ->default(0)
                ->after('plan_expires_at');

            $table->timestamp('renewal_reminder_sent_at')
                ->nullable()
                ->after('renewal_reminder_stage');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['renewal_reminder_stage', 'renewal_reminder_sent_at']);
        });
    }
};
