import type { Metadata } from 'next';
import Link from 'next/link';
import { QrCode } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description:
    'Syarat dan ketentuan penggunaan layanan LinkQR — platform QR Code dinamis dan analitik.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  const updated = '15 September 2026';

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-4 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <QrCode className="h-4 w-4" />
            </div>
            <span className="font-bold text-neutral-900">LinkQR</span>
          </Link>
          <Link
            href="/register"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Daftar Gratis
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Syarat &amp; Ketentuan
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Terakhir diperbarui: {updated}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-lg font-bold text-neutral-900">1. Penerimaan Syarat</h2>
            <p className="mt-3">
              Dengan membuat akun atau menggunakan layanan LinkQR, kamu menyetujui syarat dan
              ketentuan ini. Jika tidak setuju, mohon jangan menggunakan layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">2. Akun Pengguna</h2>
            <p className="mt-3">
              Kamu bertanggung jawab menjaga kerahasiaan kredensial akunmu. Semua aktivitas yang
              terjadi di bawah akunmu menjadi tanggung jawabmu. Beri tahu kami segera jika
              mencurigai adanya akses tidak sah.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">3. Penggunaan yang Dilarang</h2>
            <p className="mt-3">Kamu tidak diperbolehkan menggunakan LinkQR untuk:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5">
              <li>Menyebarkan malware, phishing, atau konten penipuan</li>
              <li>Mengarahkan QR code ke konten ilegal atau melanggar hukum</li>
              <li>Melanggar hak kekayaan intelektual pihak lain</li>
              <li>Melakukan spam atau penyalahgunaan kuota secara otomatis</li>
              <li>Mencoba mengakses data pengguna atau workspace lain</li>
            </ul>
            <p className="mt-3">
              Kami berhak menonaktifkan QR code atau workspace yang melanggar aturan ini tanpa
              pemberitahuan sebelumnya.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">4. Paket &amp; Pembayaran</h2>
            <p className="mt-3">
              Layanan tersedia dalam paket Starter (gratis), Business Pro, dan Enterprise. Paket
              berbayar ditagih di muka sesuai siklus yang dipilih. Masa aktif paket tidak
              diperpanjang otomatis kecuali kamu melakukan pembayaran baru.
            </p>
            <p className="mt-3">
              Jika masa aktif berakhir, akunmu kembali ke paket Starter. <strong>QR code yang
              sudah dibuat tidak dihapus</strong> dan tetap dapat dipindai — hanya batas kuota
              yang berlaku kembali. Ini kami lakukan agar QR yang sudah dicetak dan dipasang
              tidak pernah mati begitu saja.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">5. Pembayaran &amp; Verifikasi</h2>
            <p className="mt-3">
              Pembayaran paket berbayar dilakukan melalui QRIS atau transfer bank. Paket
              diaktifkan setelah pembayaran diverifikasi. Setiap invoice memiliki nominal unik
              untuk memudahkan pencocokan. Bukti pembayaran yang tidak valid dapat ditolak.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">6. Ketersediaan Layanan</h2>
            <p className="mt-3">
              Kami berupaya menjaga layanan tetap tersedia, namun tidak menjamin layanan bebas
              gangguan sepenuhnya. Pemeliharaan terjadwal atau gangguan teknis di luar kendali
              kami dapat terjadi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">7. Batasan Tanggung Jawab</h2>
            <p className="mt-3">
              LinkQR disediakan &ldquo;sebagaimana adanya&rdquo;. Kami tidak bertanggung jawab atas
              kerugian tidak langsung, kehilangan keuntungan, atau kerusakan yang timbul dari
              penggunaan layanan ini.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">8. Perubahan Syarat</h2>
            <p className="mt-3">
              Kami dapat memperbarui syarat ini sewaktu-waktu. Perubahan material akan
              diberitahukan melalui email atau notifikasi di dashboard. Penggunaan layanan
              setelah perubahan berarti kamu menyetujui versi terbaru.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">9. Kontak</h2>
            <p className="mt-3">
              Pertanyaan mengenai syarat ini dapat dikirim ke{' '}
              <a
                href="mailto:support@kovarastudio.id"
                className="font-semibold text-indigo-600 hover:text-indigo-700"
              >
                support@kovarastudio.id
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 flex flex-wrap gap-4 text-xs">
          <Link href="/privacy" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Kebijakan Privasi
          </Link>
          <Link href="/" className="text-neutral-500 hover:text-neutral-700">
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    </div>
  );
}