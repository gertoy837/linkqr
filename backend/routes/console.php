<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled billing jobs
|--------------------------------------------------------------------------
|
| Dijalankan oleh `php artisan schedule:work` (proses PM2 `linkqr-scheduler`),
| karena host ini tidak punya cron/systemd yang aktif.
|
| Setiap jam, bukan harian: paket yang kedaluwarsa jam 09:00 harus berhenti
| memberi fitur Pro paling lambat jam 10:00, bukan baru keesokan harinya.
| Kedua command idempoten, jadi jalan dua kali tidak berefek ganda.
|
*/

// Cabut hak istimewa paket yang sudah lewat masa aktif.
Schedule::command('plans:downgrade-expired')->hourly();

// Rapikan invoice basi supaya antrian admin tidak penuh dengan yang tak terbayar.
Schedule::command('invoices:expire-stale')->hourly();