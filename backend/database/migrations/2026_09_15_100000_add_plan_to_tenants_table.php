<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Which tier this workspace is on. Values come from config/plans.php.
            $table->string('plan')->default('starter')->after('is_active');
            $table->string('billing_cycle')->default('monthly')->after('plan');
            // Null for the free plan; set to now()+1 month/year when a paid
            // plan is activated. Payment gateways would refresh this on renew.
            $table->timestamp('plan_expires_at')->nullable()->after('billing_cycle');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['plan', 'billing_cycle', 'plan_expires_at']);
        });
    }
};