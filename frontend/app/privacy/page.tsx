import type { Metadata } from 'next';
import Link from 'next/link';
import { QrCode } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Bagaimana LinkQR mengumpulkan, menggunakan, dan melindungi data pengguna serta data pemindai QR.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
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
          Kebijakan Privasi
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Terakhir diperbarui: {updated}</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-lg font-bold text-neutral-900">1. Data yang Kami Kumpulkan</h2>

            <h3 className="mt-4 font-semibold text-neutral-900">a. Data Akun</h3>
            <p className="mt-2">
              Nama, alamat email, dan password (tersimpan dalam bentuk hash) saat kamu mendaftar.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">b. Data QR Code</h3>
            <p className="mt-2">
              Judul, target URL, warna, dan pengaturan QR code yang kamu buat di dashboard.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">c. Data Scan (Analitik)</h3>
            <p className="mt-2">
              Saat seseorang memindai QR code milikmu, kami mencatat:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>Waktu pemindaian</li>
              <li>Alamat IP (digunakan untuk menghitung pengunjung unik)</li>
              <li>Negara/kota perkiraan (dari layanan geolokasi)</li>
              <li>Jenis perangkat, sistem operasi, dan browser (dari User-Agent)</li>
            </ul>
            <p className="mt-3">
              Data ini dipakai untuk menampilkan statistik kepada pemilik QR code — bukan untuk
              mengidentifikasi individu.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">2. Bagaimana Kami Menggunakan Data</h2>
            <ul className="mt-3 list-disc pl-5 space-y-1.5">
              <li>Menyediakan dan memelihara layanan QR code dinamis</li>
              <li>Menampilkan analitik pemindaian kepada pemilik akun</li>
              <li>Menegakkan kuota paket dan mencegah penyalahgunaan</li>
              <li>Memproses pembayaran dan mengaktifkan paket</li>
              <li>Mengirim pemberitahuan penting terkait akun atau layanan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">3. Berbagi Data dengan Pihak Ketiga</h2>
            <p className="mt-3">
              Kami tidak menjual data pengguna. Kami hanya membagikan data terbatas kepada pihak
              ketiga yang diperlukan untuk menjalankan layanan:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Cloudflare</strong> — CDN dan keamanan; menyediakan data negara
                pengunjung lewat header <code className="text-xs">CF-IPCountry</code>
              </li>
              <li>
                <strong>ip-api.com</strong> — geolokasi perkiraan ketika data Cloudflare tidak
                tersedia
              </li>
              <li>
                <strong>Penyedia pembayaran</strong> — untuk memproses pembayaran paket berbayar
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">4. Cookie &amp; Penyimpanan Lokal</h2>
            <p className="mt-3">
              Kami menggunakan cookie dan penyimpanan lokal browser untuk menjaga sesi login.
              Cookie <code className="text-xs">token</code> menyimpan token autentikasi, dan{' '}
              <code className="text-xs">role</code> menyimpan peran akun agar navigasi tepat.
              Keduanya bukan cookie pelacak iklan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">5. Keamanan Data</h2>
            <p className="mt-3">
              Password disimpan dalam bentuk hash. API key disimpan sebagai hash SHA-256 dan
              kunci aslinya hanya ditampilkan sekali saat dibuat. Akses ke data antar workspace
              dibatasi secara ketat di sisi server.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">6. Retensi Data</h2>
            <p className="mt-3">
              Data scan disimpan selama akun aktif untuk keperluan analitik historis. Jika kamu
              menghapus QR code, data scan terkait juga terhapus. Jika kamu menghapus akun,
              seluruh data akan dihapus dalam waktu 30 hari.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">7. Hak Kamu</h2>
            <ul className="mt-3 list-disc pl-5 space-y-1.5">
              <li>Mengakses dan memperbarui data akunmu</li>
              <li>Mengekspor data QR dan analitik (paket Business Pro ke atas)</li>
              <li>Menghapus akun beserta seluruh datanya</li>
              <li>Mengajukan pertanyaan tentang data yang kami simpan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">8. Anak di Bawah Umur</h2>
            <p className="mt-3">
              Layanan ini tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak dengan sengaja
              mengumpulkan data dari anak di bawah usia tersebut.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">9. Perubahan Kebijakan</h2>
            <p className="mt-3">
              Kami dapat memperbarui kebijakan ini sewaktu-waktu. Perubahan material akan
              diberitahukan melalui email atau notifikasi di dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-neutral-900">10. Kontak</h2>
            <p className="mt-3">
              Pertanyaan mengenai privasi data dapat dikirim ke{' '}
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
          <Link href="/terms" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Syarat &amp; Ketentuan
          </Link>
          <Link href="/" className="text-neutral-500 hover:text-neutral-700">
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    </div>
  );
}