<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Manajemen user dari console operator.
 *
 * Yang paling penting diuji di sini bukan fitur barunya, tapi pagarnya: panel
 * admin yang bisa menurunkan atau menghapus admin terakhir adalah cara paling
 * cepat mengunci diri sendiri dari sistem.
 */
class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function adminAndTarget(): array
    {
        $tenant = $this->makeTenant();
        $admin = $this->makeUser($tenant, ['is_admin' => true]);
        $target = $this->makeUser($tenant);

        return [$admin, $target];
    }

    private function makeInvoice(User $user, string $status): Invoice
    {
        return Invoice::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 5,
            'total_amount' => 59005,
            'status' => $status,
            'driver' => 'manual_qris',
            'expires_at' => Carbon::now()->addDay(),
        ]);
    }

    // ---------------------------------------------------------------- akses

    public function test_only_admins_can_reach_the_user_list(): void
    {
        [$admin, $target] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users')->assertOk();

        $this->actingAs($target, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_guests_cannot_reach_the_user_list(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    // ---------------------------------------------------------------- daftar

    public function test_the_list_reports_counts_and_pagination(): void
    {
        [$admin] = $this->adminAndTarget();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?per_page=5')
            ->assertOk();

        $this->assertSame(2, $response->json('counts.total'));
        $this->assertSame(1, $response->json('counts.admins'));
        $this->assertSame(5, $response->json('meta.per_page'));
    }

    public function test_the_list_can_be_searched_by_name_and_email(): void
    {
        $tenant = $this->makeTenant();
        $admin = $this->makeUser($tenant, ['is_admin' => true, 'name' => 'Operator']);
        $this->makeUser($tenant, ['name' => 'Budi Santoso', 'email' => 'budi@tokosaya.id']);
        $this->makeUser($tenant, ['name' => 'Siti Aminah', 'email' => 'siti@warung.id']);

        $byName = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?q=Budi')
            ->assertOk();
        $this->assertCount(1, $byName->json('data'));
        $this->assertSame('Budi Santoso', $byName->json('data.0.name'));

        $byEmail = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?q=warung')
            ->assertOk();
        $this->assertCount(1, $byEmail->json('data'));
        $this->assertSame('Siti Aminah', $byEmail->json('data.0.name'));
    }

    public function test_the_list_can_be_filtered_by_role(): void
    {
        $tenant = $this->makeTenant();
        $this->makeUser($tenant, ['is_admin' => true]);
        $this->makeUser($tenant, ['is_admin' => true]);
        $this->makeUser($tenant);

        $admins = $this->actingAs($this->makeUser($tenant, ['is_admin' => true]), 'sanctum')
            ->getJson('/api/admin/users?role=admin')
            ->assertOk();
        $this->assertSame(3, $admins->json('meta.total'));

        $plain = $this->actingAs(User::where('is_admin', true)->first(), 'sanctum')
            ->getJson('/api/admin/users?role=user')
            ->assertOk();
        $this->assertSame(1, $plain->json('meta.total'));
    }

    // ---------------------------------------------------------------- peran

    public function test_an_admin_can_promote_a_user(): void
    {
        [$admin, $target] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$target->id}/role", ['is_admin' => true])
            ->assertOk();

        $this->assertTrue($target->fresh()->is_admin);
    }

    public function test_an_admin_can_demote_another_admin(): void
    {
        $tenant = $this->makeTenant();
        $admin = $this->makeUser($tenant, ['is_admin' => true]);
        $second = $this->makeUser($tenant, ['is_admin' => true]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$second->id}/role", ['is_admin' => false])
            ->assertOk();

        $this->assertFalse($second->fresh()->is_admin);
        // Admin yang bertindak harus tetap admin — sistem tidak boleh kehabisan admin.
        $this->assertTrue($admin->fresh()->is_admin);
    }

    public function test_an_admin_cannot_change_their_own_role(): void
    {
        [$admin] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$admin->id}/role", ['is_admin' => false])
            ->assertStatus(422)
            ->assertJsonPath('code', 'cannot_change_own_role');

        $this->assertTrue($admin->fresh()->is_admin);
    }

    public function test_the_system_can_never_end_up_without_an_admin(): void
    {
        // Satu-satunya admin mencoba menurunkan dirinya sendiri.
        $tenant = $this->makeTenant();
        $admin = $this->makeUser($tenant, ['is_admin' => true]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$admin->id}/role", ['is_admin' => false])
            ->assertStatus(422);

        $this->assertSame(1, User::where('is_admin', true)->count());
    }

    // ---------------------------------------------------------------- password

    public function test_an_admin_can_reset_a_password_and_sessions_are_revoked(): void
    {
        [$admin, $target] = $this->adminAndTarget();

        $target->createToken('sesi-lama');
        $this->assertSame(1, $target->tokens()->count());

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$target->id}/password", [
                'password' => 'password-baru-123',
                'password_confirmation' => 'password-baru-123',
            ])
            ->assertOk()
            ->assertJsonPath('revoked_sessions', 1);

        $this->assertTrue(Hash::check('password-baru-123', $target->fresh()->password));
        $this->assertSame(0, $target->tokens()->count(), 'Sesi lama harus mati setelah password diganti.');
    }

    public function test_a_password_reset_requires_a_confirmed_minimum_length(): void
    {
        [$admin, $target] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$target->id}/password", [
                'password' => 'pendek',
                'password_confirmation' => 'pendek',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$target->id}/password", [
                'password' => 'password-baru-123',
                'password_confirmation' => 'beda-sama-sekali',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    // ---------------------------------------------------------------- sesi

    public function test_an_admin_can_revoke_another_users_sessions(): void
    {
        [$admin, $target] = $this->adminAndTarget();
        $target->createToken('sesi-1');
        $target->createToken('sesi-2');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$target->id}/revoke-sessions")
            ->assertOk()
            ->assertJsonPath('revoked_sessions', 2);

        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_an_admin_cannot_revoke_their_own_sessions_by_accident(): void
    {
        [$admin] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$admin->id}/revoke-sessions")
            ->assertStatus(422)
            ->assertJsonPath('code', 'cannot_revoke_self');
    }

    // ---------------------------------------------------------------- hapus

    public function test_an_admin_can_delete_a_regular_user(): void
    {
        [$admin, $target] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$target->id}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_an_admin_cannot_delete_themselves(): void
    {
        [$admin] = $this->adminAndTarget();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422)
            ->assertJsonPath('code', 'user_not_deletable');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_a_user_with_paid_invoices_cannot_be_deleted(): void
    {
        [$admin, $target] = $this->adminAndTarget();
        $this->makeInvoice($target, Invoice::STATUS_PAID);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$target->id}")
            ->assertStatus(422)
            ->assertJsonPath('code', 'user_not_deletable');

        // Catatan keuangan tidak boleh hilang bersama akunnya.
        $this->assertDatabaseHas('users', ['id' => $target->id]);
        $this->assertDatabaseHas('invoices', ['user_id' => $target->id, 'status' => Invoice::STATUS_PAID]);
    }

    public function test_a_user_with_only_unpaid_invoices_can_still_be_deleted(): void
    {
        [$admin, $target] = $this->adminAndTarget();
        $this->makeInvoice($target, Invoice::STATUS_EXPIRED);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$target->id}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    // ---------------------------------------------------------------- detail

    public function test_the_detail_payload_flags_self_and_deletability(): void
    {
        [$admin, $target] = $this->adminAndTarget();

        $own = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/users/{$admin->id}")
            ->assertOk();
        $this->assertTrue($own->json('user.is_self'));
        $this->assertFalse($own->json('user.can_delete'));
        $this->assertNotNull($own->json('user.delete_blocked_reason'));

        $other = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/users/{$target->id}")
            ->assertOk();
        $this->assertFalse($other->json('user.is_self'));
        $this->assertTrue($other->json('user.can_delete'));
        $this->assertNull($other->json('user.delete_blocked_reason'));
    }

    public function test_the_detail_includes_workspace_and_recent_activity(): void
    {
        [$admin, $target] = $this->adminAndTarget();
        $this->makeInvoice($target, Invoice::STATUS_PAID);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/users/{$target->id}")
            ->assertOk();

        $this->assertNotNull($response->json('user.tenant'));
        $this->assertSame(1, $response->json('user.paid_invoices_count'));
        $this->assertIsArray($response->json('user.qr_codes'));
        $this->assertIsArray($response->json('user.invoices'));
    }
}
