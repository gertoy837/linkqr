<?php

namespace Tests\Feature;

use App\Models\QrCode;
use App\Models\QrScanLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RedirectAndThrottleTest extends TestCase
{
    use RefreshDatabase;

    private function makeQr(string $code, bool $active = true): QrCode
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        return QrCode::create([
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
            'title' => 'QR',
            'target_url' => 'https://tujuan.example.com',
            'short_code' => $code,
            'is_active' => $active,
        ]);
    }

    public function test_a_scan_redirects_and_is_recorded(): void
    {
        $qr = $this->makeQr('scanok');

        $this->get('/api/s/scanok')->assertRedirect('https://tujuan.example.com');

        $this->assertSame(1, QrScanLog::where('qr_code_id', $qr->id)->count());
        $this->assertSame(1, $qr->fresh()->scan_count);
    }

    public function test_an_unknown_code_returns_404(): void
    {
        $this->get('/api/s/tidakada')->assertNotFound();
    }

    public function test_a_suspended_workspace_returns_410(): void
    {
        $qr = $this->makeQr('suspend1');
        $qr->tenant->update(['is_active' => false]);

        $this->get('/api/s/suspend1')->assertStatus(410);
    }

    public function test_duplicate_scans_within_two_seconds_are_not_double_counted(): void
    {
        $qr = $this->makeQr('dupe1');

        $this->get('/api/s/dupe1');
        $this->get('/api/s/dupe1');

        $this->assertSame(1, QrScanLog::where('qr_code_id', $qr->id)->count());
    }

    public function test_geo_lookup_is_skipped_for_a_duplicate_scan(): void
    {
        Http::fake([
            'ip-api.com/*' => Http::response([
                'status' => 'success',
                'country' => 'Indonesia',
                'countryCode' => 'ID',
                'city' => 'Jakarta',
            ], 200),
        ]);

        $this->makeQr('geo1');

        $headers = ['X-Visitor-IP' => '8.8.8.8'];

        $this->withHeaders($headers)->get('/api/s/geo1');
        Http::assertSentCount(1);

        // Request kedua dalam 2 detik adalah duplikat (prefetch browser). Geo
        // tidak boleh dipanggil lagi — inilah perbaikan urutannya.
        $this->withHeaders($headers)->get('/api/s/geo1');
        Http::assertSentCount(1);
    }

    public function test_login_is_rate_limited(): void
    {
        $statuses = [];

        for ($i = 0; $i < 12; $i++) {
            $statuses[] = $this->postJson('/api/login', [
                'email' => 'tidak-ada@example.com',
                'password' => 'salah',
            ])->getStatusCode();
        }

        $this->assertContains(429, $statuses, 'Login harus dibatasi setelah beberapa percobaan gagal.');
    }
}
