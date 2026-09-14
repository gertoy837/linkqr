<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\QrCodeController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'linkqr-api', 'timestamp' => now()->toIso8601String()]);
});

// Public redirect
Route::get('/s/{shortCode}', [App\Http\Controllers\RedirectController::class, 'redirect']);

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // QR Codes
    Route::apiResource('qr-codes', QrCodeController::class)->except(['create', 'edit']);
    Route::get('/qr-codes/{qrCode}/stats', [QrCodeController::class, 'stats']);
});