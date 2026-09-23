import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Halaman dashboard, admin, dan redirect short link tidak perlu
        // diindeks: isinya privat dan /s/* sengaja tidak menghasilkan konten
        // yang berguna bagi mesin pencari.
        disallow: ['/dashboard/', '/admin/', '/s/', '/api/'],
      },
    ],
    sitemap: 'https://qr.kovarastudio.id/sitemap.xml',
  };
}