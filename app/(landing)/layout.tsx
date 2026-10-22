import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/landing.css';

export const metadata: Metadata = {
  title: 'Рядом — Севастополь. Чаты домов, заявки и помощь соседей',
  description:
    'Рядом — городское приложение для жителей Севастополя: чаты домов и СНТ, заявки с фото и статусом, карта города, проверенные специалисты и участковые.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    title: 'Рядом — Севастополь',
    description: 'Чаты домов и СНТ, заявки с фото, карта города и специалисты рядом.',
    locale: 'ru_RU'
  },
  icons: {
    icon: '/icons/favicon.svg',
    apple: '/icons/icon-192.png'
  }
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
