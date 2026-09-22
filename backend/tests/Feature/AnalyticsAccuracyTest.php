<?php

namespace Tests\Feature;

use App\Models\QrCode;
use App\Models\QrScanLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Angka yang ditampilkan ke pelanggan harus jujur.
 */
class AnalyticsAccuracyTest extends TestCase
{
    use RefreshDatabase;

    private function makeQr($user, $tenant, string $code, bool $active = true): QrCode
    {
        return QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'QR ' . $code,
            'target_url' => 'https://example.com',
            'short_code' => $code,
            'is_active' => $active,
        ]);
    }

    public function test_active_qr_counts_only_active_codes(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        $this->makeQr($user, $tenant, 'aktif1');
        $this->makeQr($user, $tenant, 'aktif2');
        $this->makeQr($user, $tenant, 'mati1', false);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/analytics/summary')
            ->assertOk()
            ->assertJsonPath('active_qr', 2);
    }

    public function test_recent_logs_returns_the_newest_scans_first(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);
        $qr = $this->makeQr($user, $tenant, 'scan1');

        foreach ([30, 20, 10, 0] as $minutesAgo) {
            QrScanLog::create([
                'qr_code_id' => $qr->id,
                'ip_address' => '8.8.8.8',
                'device_type' => 'desktop',
                'scanned_at' => Carbon::now()->subMinutes($minutesAgo),
            ]);
        }

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/qr-codes/{$qr->id}/stats")
            ->assertOk();

        $logs = $response->json('recent_logs');
        $this->assertCount(4, $logs);

        // Sebelumnya tanpa orderBy, jadi yang keluar justru scan paling lama.
        $this->assertTrue(
            Carbon::parse($logs[0]['scanned_at'])->greaterThan(Carbon::parse($logs[3]['scanned_at'])),
            'recent_logs harus terbaru dulu.'
        );
    }

    public function test_stats_are_aggregated_per_day(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);
        $qr = $this->makeQr($user, $tenant, 'agg1');

        QrScanLog::create(['qr_code_id' => $qr->id, 'device_type' => 'mobile', 'country' => 'ID', 'scanned_at' => Carbon::now()]);
        QrScanLog::create(['qr_code_id' => $qr->id, 'device_type' => 'mobile', 'country' => 'ID', 'scanned_at' => Carbon::now()]);
        QrScanLog::create(['qr_code_id' => $qr->id, 'device_type' => 'desktop', 'country' => 'SG', 'scanned_at' => Carbon::now()]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/qr-codes/{$qr->id}/stats")
            ->assertOk();

        $this->assertSame(2, $response->json('devices.mobile'));
        $this->assertSame(1, $response->json('devices.desktop'));
        $this->assertSame(2, $response->json('countries.ID'));
        // Ketiga log dibuat hari ini, jadi seri hariannya harus berisi 3.
        $this->assertSame(3, $response->json('last_30_days.' . Carbon::now()->toDateString()));
    }
}
