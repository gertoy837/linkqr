<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
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

    // QR Codes
    Route::apiResource('qr-codes', QrCodeController::class)->except(['create', 'edit']);
    Route::get('/qr-codes/{qrCode}/stats', [QrCodeController::class, 'stats']);
});