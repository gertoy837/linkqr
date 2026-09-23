{{--
    Tombol aksi email.

    Dibuat sebagai partial karena polanya berulang di beberapa email, dan
    tombol yang tidak konsisten (ukuran/warna berbeda) membuat email terlihat
    tidak profesional.

    Dipanggil dengan: @include('emails.partials.tombol', ['link' => ..., 'teks' => ...])

    Tabel dipakai, bukan <a> dengan display:block, karena Outlook tidak
    menghormati padding pada elemen inline.
--}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:10px;background:#4f46e5;">
      <a href="{{ $link }}"
         style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
        {{ $teks }}
      </a>
    </td>
  </tr>
</table>

{{-- Tautan cadangan: sebagian klien email memblokir tombol, dan tautan teks
     memastikan pelanggan tetap bisa melanjutkan. --}}
<p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#a3a3a3;word-break:break-all;">
  Tombolnya tidak berfungsi? Salin tautan ini ke browser:<br>
  <a href="{{ $link }}" style="color:#6366f1;text-decoration:underline;">{{ $link }}</a>
</p>
