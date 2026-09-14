<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'linkqr-web', 'timestamp' => now()->toIso8601String()]);
});

Route::prefix('api')->group(function () {
    Route::get('/health', function () {
        return response()->json(['status' => 'ok', 'service' => 'linkqr-api', 'timestamp' => now()->toIso8601String()]);
    });
});