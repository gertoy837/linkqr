<?php

use App\Http\Controllers\Admin\AdminInvoiceController;
use App\Http\Controllers\Admin\AdminTenantController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\Api\V1\QrCodeApiController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentProofController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\QrCodeController;
use App\Http\Controllers\RedirectController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'linkqr-api', 'timestamp' => now()->toIso8601String()]);
});

// Public redirect (consumed by the Next.js /s/[shortCode] proxy)
Route::get('/s/{shortCode}', [RedirectController::class, 'redirect'])
    ->middleware('throttle:scan');

// Auth
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Aggregated analytics - must be declared before the qr-codes resource
    // so it is not swallowed by /qr-codes/{qrCode}.
    Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);

    // Plans & billing
    Route::get('/plan', [PlanController::class, 'show']);
    Route::post('/plan/select', [PlanController::class, 'select']);

    // Invoices (manual QRIS / future gateways)
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::post('/invoices/{invoice}/proof', [InvoiceController::class, 'uploadProof'])
        ->middleware('throttle:proof-upload');
    Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
    // Bukti transfer: file-nya privat, jadi harus lewat endpoint ber-auth.
    Route::get('/invoices/{invoice}/proof', [PaymentProofController::class, 'customer']);

    // Operator console
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/overview', [AdminInvoiceController::class, 'overview']);
        Route::get('/invoices', [AdminInvoiceController::class, 'index']);
        Route::get('/invoices/{invoice}', [AdminInvoiceController::class, 'show']);
        Route::post('/invoices/{invoice}/verify', [AdminInvoiceController::class, 'verify']);
        Route::post('/invoices/{invoice}/reject', [AdminInvoiceController::class, 'reject']);
        Route::get('/invoices/{invoice}/proof', [PaymentProofController::class, 'admin']);

        // Workspace management
        Route::get('/tenants', [AdminTenantController::class, 'index']);
        Route::get('/tenants/{tenant}', [AdminTenantController::class, 'show']);
        Route::get('/tenants/{tenant}/invoices', [AdminTenantController::class, 'invoices']);
        Route::post('/tenants/{tenant}/plan', [AdminTenantController::class, 'setPlan']);
        Route::post('/tenants/{tenant}/extend', [AdminTenantController::class, 'extend']);
        Route::post('/tenants/{tenant}/suspend', [AdminTenantController::class, 'suspend']);
        Route::post('/tenants/{tenant}/activate', [AdminTenantController::class, 'activate']);

        // Manajemen user
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::post('/users/{user}/role', [AdminUserController::class, 'updateRole']);
        Route::post('/users/{user}/password', [AdminUserController::class, 'resetPassword']);
        Route::post('/users/{user}/revoke-sessions', [AdminUserController::class, 'revokeSessions']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
    });

    // QR Codes
    Route::apiResource('qr-codes', QrCodeController::class)->except(['create', 'edit']);
    Route::get('/qr-codes/{qrCode}/stats', [QrCodeController::class, 'stats']);

    // Export laporan (paket Pro ke atas)
    Route::middleware('feature:export')->group(function () {
        Route::get('/export/analytics', [ExportController::class, 'analytics']);
        Route::get('/export/qr-codes', [ExportController::class, 'qrCodes']);
    });

    // API keys (paket Enterprise).
    //
    // index sengaja TIDAK digerbangi: halaman pengaturan memakainya untuk tahu
    // apakah fitur ini aktif, supaya bisa menampilkan ajakan upgrade, bukan
    // error. Yang digerbangi adalah semua operasi yang benar-benar mengubah
    // data — sebelumnya paket Starter bisa membuat API key (HTTP 201) walau
    // kuncinya tidak akan pernah bisa dipakai.
    Route::get('/api-keys', [ApiKeyController::class, 'index']);

    Route::middleware('feature:api_access')->group(function () {
        Route::post('/api-keys', [ApiKeyController::class, 'store']);
        Route::post('/api-keys/{apiKey}/toggle', [ApiKeyController::class, 'toggle']);
        Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'destroy']);
    });
});

/*
|--------------------------------------------------------------------------
| Public API v1 — autentikasi lewat X-API-Key (paket Enterprise)
|--------------------------------------------------------------------------
*/
Route::middleware(['api.key', 'throttle:api-key'])->prefix('v1')->group(function () {
    Route::get('/qr-codes', [QrCodeApiController::class, 'index']);
    Route::post('/qr-codes', [QrCodeApiController::class, 'store']);
    Route::get('/qr-codes/{shortCode}', [QrCodeApiController::class, 'show']);
    Route::get('/qr-codes/{shortCode}/stats', [QrCodeApiController::class, 'stats']);
    Route::get('/me', function (Request $request) {
        $key = $request->attributes->get('api_key');
        return response()->json([
            'workspace' => $key->tenant->only(['id', 'name', 'slug', 'plan']),
            'key_name' => $key->name,
            'last_used_at' => optional($key->last_used_at)->toIso8601String(),
        ]);
    });
});