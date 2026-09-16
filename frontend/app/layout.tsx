import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

const BASE_URL = 'https://qr.gertoy.biz.id';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'LinkQR — Platform QR Code Dinamis & Analitik Pintar',
    template: '%s | LinkQR',
  },
  description:
    'Buat QR Code dinamis yang bisa diubah target URL-nya kapan saja tanpa perlu cetak ulang. Pantau analitik scan real-time dari satu dashboard.',
  keywords: [
    'qr code dinamis',
    'dynamic qr code',
    'short link',
    'analitik qr',
    'qr code generator',
    'link pendek',
    'qr analytics',
    'linkqr',
  ],
  authors: [{ name: 'Kovara Studio', url: 'https://kovarastudio.id' }],
  creator: 'Kovara Studio',
  publisher: 'Kovara Studio',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: BASE_URL,
    siteName: 'LinkQR',
    title: 'LinkQR — Platform QR Code Dinamis & Analitik Pintar',
    description:
      'QR Code dinamis, link pendek, dan analitik scan real-time. Ubah target URL kapan saja tanpa cetak ulang.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LinkQR — Platform QR Code Dinamis & Analitik Pintar',
    description:
      'QR Code dinamis, link pendek, dan analitik scan real-time dalam satu dashboard.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
};

// JSON-LD: membantu Google menampilkan hasil kaya (rich results). FAQPage
// mencerminkan FAQ yang benar-benar ada di landing page — bukan karangan,
// karena Google memvalidasi bahwa pertanyaannya terlihat di halaman.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'LinkQR',
      description:
        'Platform QR Code dinamis, link pendek, dan analitik scan real-time.',
      inLanguage: 'id-ID',
      publisher: { '@id': `${BASE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Kovara Studio',
      url: 'https://kovarastudio.id',
      founder: { '@type': 'Person', name: 'Mochammad Mahardika' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'LinkQR',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'QR Code dinamis dengan analitik scan real-time, link pendek, ekspor laporan, dan API developer.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '0',
          priceCurrency: 'IDR',
          description: '5 QR Code dinamis dan 1.000 scan per bulan, gratis.',
        },
        {
          '@type': 'Offer',
          name: 'Business Pro',
          price: '59000',
          priceCurrency: 'IDR',
          description:
            'QR Code dan scan tanpa batas, analitik lengkap, ekspor PDF & Excel.',
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}