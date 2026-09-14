<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QrCode extends Model
{
    protected $fillable = [
        'user_id',
        'tenant_id',
        'title',
        'target_url',
        'short_code',
        'is_active',
        'color',
        'logo',
        'scan_count',
        'last_scanned_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'scan_count' => 'integer',
        'last_scanned_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scanLogs(): HasMany
    {
        return $this->hasMany(QrScanLog::class);
    }

    // Helper: increment scan count
    public function incrementScan(): void
    {
        $this->increment('scan_count');
        $this->last_scanned_at = now();
        $this->save();
    }
}