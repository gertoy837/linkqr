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

/*
| Ingatkan pelanggan sebelum masa aktifnya habis (H-7, H-3, H-1).
|
| Dijalankan pagi hari, bukan tengah malam: email yang masuk jam 09:00 dibaca
| saat orang sudah bangun, sedangkan yang masuk jam 03:00 tertimbun notifikasi
| lain dan justru tidak terbaca. Sekali sehari sudah cukup karena command-nya
| sendiri yang menjamin tidak ada pengingat dobel (lihat renewal_reminder_stage).
*/
Schedule::command('plans:notify-expiring')->dailyAt('09:00')->timezone('Asia/Jakarta');