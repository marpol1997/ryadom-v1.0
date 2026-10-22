import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import '@/styles/screens.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: 'Рядом — Севастополь',
  description:
    'Рядом — приложение для жителей Севастополя: чаты домов и СНТ, заявки, карта города, проверенные специалисты.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/favicon.svg',
    apple: '/icons/icon-192.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Рядом'
  }
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
