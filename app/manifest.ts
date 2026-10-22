import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Рядом — Севастополь',
    short_name: 'Рядом',
    description: 'Чаты домов и СНТ, заявки, карта города, специалисты и участковые',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f7fc',
    theme_color: '#4f46e5',
    lang: 'ru',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
