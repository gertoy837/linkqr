<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index untuk query yang benar-benar dijalankan aplikasi.
 *
 * Yang paling penting: `qr_scan_logs` sebelumnya tidak punya index sama sekali,
 * padahal tabel itu dibaca di jalur hot — setiap scan menjalankan query
 * deduplikasi ke tabel ini, dan halaman analitik menggerusnya berulang kali.
 * Dengan data kecil efeknya belum terasa; begitu log menumpuk, setiap scan
 * berubah jadi full table scan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qr_scan_logs', function (Blueprint $table) {
            // Halaman analitik: filter per QR lalu rentang waktu.
            $table->index(['qr_code_id', 'scanned_at'], 'qr_scan_logs_qr_time_idx');

            // Query deduplikasi di RedirectController:
            // qr_code_id + ip_address + device_type + scanned_at >= now-2s
            $table->index(
                ['qr_code_id', 'ip_address', 'device_type', 'scanned_at'],
                'qr_scan_logs_dedup_idx'
            );

            // Hitungan global (mis. total scan di overview admin).
            $table->index('scanned_at', 'qr_scan_logs_scanned_at_idx');
        });

        Schema::table('qr_codes', function (Blueprint $table) {
            // $user->qrCodes() dan kuota per user.
            $table->index('user_id', 'qr_codes_user_id_idx');
            $table->index('tenant_id', 'qr_codes_tenant_id_idx');
        });

        Schema::table('invoices', function (Blueprint $table) {
            // $user->invoices() dan pencarian invoice yang masih bisa dibayar.
            $table->index(['user_id', 'status'], 'invoices_user_status_idx');
            // Pencarian unique_code yang belum terpakai (plan + siklus sama).
            $table->index(['plan', 'billing_cycle', 'status'], 'invoices_plan_cycle_status_idx');
        });

        Schema::table('api_keys', function (Blueprint $table) {
            $table->index('user_id', 'api_keys_user_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('qr_scan_logs', function (Blueprint $table) {
            $table->dropIndex('qr_scan_logs_qr_time_idx');
            $table->dropIndex('qr_scan_logs_dedup_idx');
            $table->dropIndex('qr_scan_logs_scanned_at_idx');
        });

        Schema::table('qr_codes', function (Blueprint $table) {
            $table->dropIndex('qr_codes_user_id_idx');
            $table->dropIndex('qr_codes_tenant_id_idx');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_user_status_idx');
            $table->dropIndex('invoices_plan_cycle_status_idx');
        });

        Schema::table('api_keys', function (Blueprint $table) {
            $table->dropIndex('api_keys_user_id_idx');
        });
    }
};
