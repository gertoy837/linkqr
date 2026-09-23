@extends('emails.layout')

@section('title', 'Paket ' . $namaPaket . ' segera berakhir')
@section('preheader', 'Paket ' . $namaPaket . ' berakhir dalam ' . $hariTersisa . ' hari. Perpanjang sekarang supaya tidak ada yang terputus.')

@section('content')

<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#171717;letter-spacing:-0.01em;">
  Paket {{ $namaPaket }} segera berakhir
</h1>
<p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#525252;">
  Halo {{ $nama }}, paket <strong>{{ $namaPaket }}</strong> untuk workspace
  <strong>{{ $namaWorkspace }}</strong> akan berakhir dalam
  <strong>{{ $hariTersisa }} hari</strong>.
</p>

{{-- Kotak sorotan: satu angka besar yang langsung terbaca --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#4338ca;">
        Masa aktif berakhir
      </p>
      <p style="margin:0;font-size:19px;font-weight:800;color:#1e1b4b;">
        {{ $berakhirPada }}
      </p>
      <p style="margin:5px 0 0;font-size:12px;color:#4338ca;">
        Tinggal {{ $hariTersisa }} hari lagi
      </p>
    </td>
  </tr>
</table>

<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#525252;">
  Kalau tidak diperpanjang, setelah tanggal itu workspace kembali ke paket
  Starter. Ini yang berubah:
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
  @foreach ($dampak as $baris)
  <tr>
    <td width="18" valign="top" style="padding:0 0 8px;font-size:13px;color:#dc2626;line-height:1.55;">&minus;</td>
    <td style="padding:0 0 8px;font-size:13px;color:#404040;line-height:1.55;">{{ $baris }}</td>
  </tr>
  @endforeach
</table>

{{-- Ini yang paling sering ditanyakan pelanggan: apakah QR-nya mati? --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
  <tr>
    <td style="padding:15px 18px;">
      <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#166534;">
        QR code kamu tetap jalan
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#15803d;">
        QR yang sudah dicetak dan ditempel tidak akan mati — tetap bisa dipindai
        seperti biasa. Yang berkurang hanya hak istimewanya: kuota QR baru dan
        batas pemindaian per bulan.
      </p>
    </td>
  </tr>
</table>

@include('emails.partials.tombol', [
  'link' => $link,
  'teks' => 'Perpanjang paket sekarang',
])

@if ($dapatDiperpanjang)
<p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#737373;">
  Harga paket {{ $namaPaket }}: <strong style="color:#404040;">{{ $hargaPerBulan }}</strong> per bulan.
  Kalau ambil siklus tahunan, otomatis hemat 20%.
</p>
@endif

<hr style="border:0;border-top:1px solid #e5e5e5;margin:0 0 18px;">

<p style="margin:0;font-size:13px;line-height:1.6;color:#737373;">
  Sudah memperpanjang? Abaikan email ini — masa aktifmu akan otomatis
  diperbarui begitu pembayaran diverifikasi.
</p>

@endsection
