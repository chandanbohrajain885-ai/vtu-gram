import type { Metadata, Viewport } from 'next'
import './globals.css'
import RegisterSW from './_components/RegisterSW'
import InstallBanner from './_components/InstallBanner'
import PushSetup from './_components/PushSetup'

export const metadata: Metadata = {
  title: 'VTU GRAM',
  description: 'VTU Digital Academic Platform — Subjects, Reels, Notes, Chat',
  applicationName: 'VTU GRAM',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VTU GRAM',
  },
  formatDetection: { telephone: false },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[#07070f] text-slate-200 min-h-screen overscroll-none">
        <RegisterSW />
        <PushSetup />
        <InstallBanner />
        {children}
      </body>
    </html>
  )
}
