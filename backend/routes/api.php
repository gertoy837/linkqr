<?php

use App\Http\Controllers\Admin\AdminInvoiceController;
use App\Http\Controllers\Admin\AdminTenantController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\QrCodeController;
use App\Http\Controllers\RedirectController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'linkqr-api', 'timestamp' => now()->toIso8601String()]);
});

// Public redirect (consumed by the Next.js /s/[shortCode] proxy)
Route::get('/s/{shortCode}', [RedirectController::class, 'redirect']);

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

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
    Route::post('/invoices/{invoice}/proof', [InvoiceController::class, 'uploadProof']);
    Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);

    // Operator console
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/overview', [AdminInvoiceController::class, 'overview']);
        Route::get('/invoices', [AdminInvoiceController::class, 'index']);
        Route::get('/invoices/{invoice}', [AdminInvoiceController::class, 'show']);
        Route::post('/invoices/{invoice}/verify', [AdminInvoiceController::class, 'verify']);
        Route::post('/invoices/{invoice}/reject', [AdminInvoiceController::class, 'reject']);

        // Workspace management
        Route::get('/tenants', [AdminTenantController::class, 'index']);
        Route::get('/tenants/{tenant}', [AdminTenantController::class, 'show']);
        Route::get('/tenants/{tenant}/invoices', [AdminTenantController::class, 'invoices']);
        Route::post('/tenants/{tenant}/plan', [AdminTenantController::class, 'setPlan']);
        Route::post('/tenants/{tenant}/extend', [AdminTenantController::class, 'extend']);
        Route::post('/tenants/{tenant}/suspend', [AdminTenantController::class, 'suspend']);
        Route::post('/tenants/{tenant}/activate', [AdminTenantController::class, 'activate']);
    });

    // QR Codes
    Route::apiResource('qr-codes', QrCodeController::class)->except(['create', 'edit']);
    Route::get('/qr-codes/{qrCode}/stats', [QrCodeController::class, 'stats']);
});