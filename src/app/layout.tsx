import './globals.css';

export const metadata = {
  title: 'Studyospace Muhasebe',
  description: 'Ortak kasa takip sistemi',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#1c1917',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kasa" />
      </head>
      <body>{children}</body>
    </html>
  );
}
