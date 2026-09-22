<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Bukti transfer bukan aset publik: file-nya harus berada di disk privat dan
 * hanya bisa diambil lewat endpoint ber-autentikasi.
 */
class PaymentProofAccessTest extends TestCase
{
    use RefreshDatabase;

    private function invoiceWithProof(Tenant $tenant, int $userId): Invoice
    {
        Storage::disk('local')->put('payment-proofs/bukti-uji.png', 'isi-gambar');

        return Invoice::create([
            'tenant_id' => $tenant->id,
            'user_id' => $userId,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 3,
            'total_amount' => 59003,
            'status' => Invoice::STATUS_AWAITING,
            'driver' => 'manual_qris',
            'proof_path' => 'payment-proofs/bukti-uji.png',
            'expires_at' => Carbon::now()->addDay(),
        ]);
    }

    public function test_uploading_a_proof_never_touches_the_public_disk(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan' => 'business_pro',
            'billing_cycle' => 'monthly',
            'amount' => 59000,
            'unique_code' => 4,
            'total_amount' => 59004,
            'status' => Invoice::STATUS_PENDING,
            'driver' => 'manual_qris',
            'expires_at' => Carbon::now()->addDay(),
        ]);

        Storage::fake('local');
        Storage::fake('public');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/invoices/{$invoice->id}/proof", [
                'proof' => UploadedFile::fake()->image('transfer.png'),
            ])
            ->assertOk();

        $path = $invoice->fresh()->proof_path;
        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_guests_cannot_download_a_proof(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);
        $invoice = $this->invoiceWithProof($tenant, $user->id);

        $this->getJson("/api/invoices/{$invoice->id}/proof")->assertUnauthorized();
    }

    public function test_the_owner_can_download_their_own_proof(): void
    {
        $tenant = $this->makeTenant();
        $user = $this->makeUser($tenant);
        $invoice = $this->invoiceWithProof($tenant, $user->id);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/invoices/{$invoice->id}/proof")
            ->assertOk();
    }

    public function test_another_customer_cannot_download_someone_elses_proof(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeUser($tenant);
        $stranger = $this->makeUser($tenant);
        $invoice = $this->invoiceWithProof($tenant, $owner->id);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/invoices/{$invoice->id}/proof")
            ->assertForbidden();
    }

    public function test_only_admins_can_use_the_console_route(): void
    {
        $tenant = $this->makeTenant();
        $owner = $this->makeUser($tenant);
        $invoice = $this->invoiceWithProof($tenant, $owner->id);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/admin/invoices/{$invoice->id}/proof")
            ->assertForbidden();

        $admin = $this->makeUser($tenant, ['is_admin' => true]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/invoices/{$invoice->id}/proof")
            ->assertOk();
    }
}
