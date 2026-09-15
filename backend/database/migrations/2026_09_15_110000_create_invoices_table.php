<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();

            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('plan');
            $table->string('billing_cycle', 16)->default('monthly');

            // `amount` is the clean plan price; `unique_code` is a 1-99 rupiah
            // suffix so the admin can match an incoming QRIS/bank transfer to
            // exactly one invoice when two customers pay the same plan.
            $table->unsignedBigInteger('amount');
            $table->unsignedSmallInteger('unique_code')->default(0);
            $table->unsignedBigInteger('total_amount');

            $table->string('status', 32)->default('pending');
            $table->string('driver', 32)->default('manual_qris');

            $table->string('proof_path')->nullable();
            $table->string('payer_note', 500)->nullable();
            $table->string('admin_note', 500)->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};