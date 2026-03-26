import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VTU GRAM',
  description: 'VTU Digital Academic Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-slate-200 min-h-screen">
        {children}
      </body>
    </html>
  )
}
