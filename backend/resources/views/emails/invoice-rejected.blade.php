@extends('emails.layout')

@section('title', 'Bukti pembayaran perlu diperbaiki')
@section('preheader', 'Bukti pembayaran untuk ' . $invoice->number . ' belum bisa kami terima.')

@section('content')

<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">
  Bukti pembayaran belum bisa kami terima
</h1>
<p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
  Halo {{ $nama }}, terima kasih sudah mengirim bukti pembayaran untuk invoice
  <span style="font-family:ui-monospace,Menlo,monospace;color:#0f172a;">{{ $invoice->number }}</span>.
  Sayangnya bukti itu belum bisa kami verifikasi.
</p>

@if (!empty($catatan))
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:22px;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.04em;">
        Catatan dari kami
      </p>
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">{{ $catatan }}</p>
    </td>
  </tr>
</table>
@endif

<p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#0f172a;">Yang bisa kamu lakukan</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#475569;line-height:1.9;">
  <li>Unggah ulang bukti transfer yang lebih jelas (nominal & tanggal terlihat).</li>
  <li>Pastikan nominalnya sesuai, termasuk angka unik di belakangnya.</li>
  <li>Kalau kamu yakin sudah benar, balas email ini — kami periksa manual.</li>
</ul>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:22px;">
  <tr>
    <td style="padding:16px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#64748b;">Nominal yang seharusnya</td>
          <td align="right" style="font-size:15px;font-weight:700;color:#0f172a;">
            Rp {{ number_format((int) $invoice->total_amount, 0, ',', '.') }}
          </td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#64748b;padding-top:6px;">Batas pembayaran</td>
          <td align="right" style="font-size:12px;font-weight:600;color:#0f172a;padding-top:6px;">
            {{ optional($invoice->expires_at)->translatedFormat('d F Y, H:i') }} WIB
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:#4f46e5;border-radius:10px;">
      <a href="{{ $link }}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
        Unggah ulang bukti
      </a>
    </td>
  </tr>
</table>

@endsection
