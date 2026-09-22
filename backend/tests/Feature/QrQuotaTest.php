<?php

namespace Tests\Feature;

use App\Models\QrCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class QrQuotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_can_create_five_qr_codes_then_is_blocked(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        for ($i = 1; $i <= 5; $i++) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/qr-codes', ['title' => "QR {$i}", 'target_url' => 'https://example.com'])
                ->assertCreated();
        }

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/qr-codes', ['title' => 'QR 6', 'target_url' => 'https://example.com'])
            ->assertStatus(403)
            ->assertJsonPath('code', 'qr_limit_reached');

        $this->assertSame(5, QrCode::where('user_id', $user->id)->count());
    }

    public function test_paid_plan_has_no_qr_limit(): void
    {
        $tenant = $this->makeTenant(['plan' => 'business_pro', 'plan_expires_at' => Carbon::now()->addMonth()]);
        $user = $this->makeUser($tenant);

        for ($i = 1; $i <= 8; $i++) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/qr-codes', ['title' => "QR {$i}", 'target_url' => 'https://example.com'])
                ->assertCreated();
        }

        $this->assertSame(8, QrCode::where('user_id', $user->id)->count());
    }

    public function test_quota_is_counted_per_user_not_per_workspace(): void
    {
        $tenant = $this->makeTenant();
        $first = $this->makeUser($tenant);
        $second = $this->makeUser($tenant);

        for ($i = 1; $i <= 5; $i++) {
            $this->actingAs($first, 'sanctum')
                ->postJson('/api/qr-codes', ['title' => "QR {$i}", 'target_url' => 'https://example.com'])
                ->assertCreated();
        }

        // Rekan satu workspace tidak boleh "memakan" kuota milik user lain.
        $this->actingAs($second, 'sanctum')
            ->postJson('/api/qr-codes', ['title' => 'QR rekan', 'target_url' => 'https://example.com'])
            ->assertCreated();
    }

    public function test_a_user_cannot_read_another_users_qr_code(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeUser($tenant);
        $other = $this->makeUser($tenant);

        $qr = QrCode::create([
            'user_id' => $owner->id,
            'tenant_id' => $tenant->id,
            'title' => 'Punya owner',
            'target_url' => 'https://example.com',
            'short_code' => 'abc123',
        ]);

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/qr-codes/{$qr->id}")
            ->assertForbidden();
    }
}
