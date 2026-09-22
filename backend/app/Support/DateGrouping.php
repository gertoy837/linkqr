<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Ekspresi SQL untuk mengelompokkan baris per tanggal.
 *
 * Kode analitik sebelumnya memakai strftime('%Y-%m-%d', ...) yang hanya ada di
 * SQLite. Selama databasenya SQLite itu jalan, tapi begitu pindah ke
 * MariaDB/MySQL seluruh laporan langsung error — padahal itu arah yang wajar
 * begitu jumlah workspace bertambah.
 *
 * $column selalu literal yang ditulis di kode kita sendiri (bukan input user),
 * jadi tidak ada jalur injeksi di sini.
 */
class DateGrouping
{
    public static function dayExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            'mysql', 'mariadb' => "DATE_FORMAT({$column}, '%Y-%m-%d')",
            'pgsql' => "to_char({$column}, 'YYYY-MM-DD')",
            'sqlsrv' => "CONVERT(varchar(10), {$column}, 23)",
            default => "DATE({$column})",
        };
    }
}
