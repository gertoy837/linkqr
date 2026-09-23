@extends('emails.layout')

@section('title', 'Invoice ' . $invoice->number)
@section('preheader', 'Selesaikan pembayaran ' . $invoice->number . ' untuk mengaktifkan paket ' . $invoice->planName() . '.')

@section('content')

<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">
  Invoice kamu sudah dibuat
</h1>
<p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
  Halo {{ $nama }}, terima kasih sudah memilih paket
  <strong style="color:#0f172a;">{{ $invoice->planName() }}</strong>.
  Selesaikan pembayaran berikut supaya paketnya langsung aktif.
</p>

<!-- Ringkasan nominal -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
  <tr>
    <td style="padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#64748b;padding-bottom:6px;">Nomor invoice</td>
          <td align="right" style="font-size:12px;font-family:ui-monospace,Menlo,monospace;color:#0f172a;font-weight:600;padding-bottom:6px;">{{ $invoice->number }}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#64748b;padding-bottom:6px;">Paket</td>
          <td align="right" style="font-size:12px;color:#0f172a;font-weight:600;padding-bottom:6px;">
            {{ $invoice->planName() }} &middot; {{ $invoice->billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan' }}
          </td>
        </tr>
        @if ($invoice->billing_cycle === 'yearly')
        <tr>
          <td style="font-size:12px;color:#64748b;padding-bottom:6px;">Masa aktif</td>
          <td align="right" style="font-size:12px;color:#0f172a;font-weight:600;padding-bottom:6px;">12 bulan</td>
        </tr>
        @endif
        <tr>
          <td style="font-size:12px;color:#64748b;">Batas pembayaran</td>
          <td align="right" style="font-size:12px;color:#0f172a;font-weight:600;">
            {{ optional($invoice->expires_at)->translatedFormat('d F Y, H:i') }} WIB
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #e2e8f0;">
        <tr>
          <td style="padding-top:14px;font-size:13px;color:#334155;font-weight:600;">Total yang harus dibayar</td>
          <td align="right" style="padding-top:14px;font-size:22px;font-weight:800;color:#4f46e5;letter-spacing:-0.02em;">
            Rp {{ number_format((int) $invoice->total_amount, 0, ',', '.') }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Cara bayar -->
<h2 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;">Cara pembayaran</h2>
<ol style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#475569;line-height:1.9;">
  <li>Scan QRIS di halaman invoice, atau transfer ke rekening yang tertera.</li>
  <li>
    <strong>Bayar tepat sampai angka terakhir</strong> —
    <span style="font-family:ui-monospace,Menlo,monospace;color:#0f172a;">Rp {{ number_format((int) $invoice->total_amount, 0, ',', '.') }}</span>.
    Angka unik di belakang nominal dipakai sistem untuk mengenali pembayaranmu.
  </li>
  <li>Unggah bukti transfer di halaman invoice.</li>
  <li>Kami verifikasi, lalu paket langsung aktif — kamu akan dapat email konfirmasi.</li>
</ol>

<!-- Tombol -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
  <tr>
    <td style="background:#4f46e5;border-radius:10px;">
      <a href="{{ $link }}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        Buka halaman pembayaran
      </a>
    </td>
  </tr>
</table>

<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
  Kalau tombolnya tidak bisa diklik, salin tautan ini ke browser:<br>
  <span style="color:#64748b;word-break:break-all;">{{ $link }}</span>
</p>

@endsection
