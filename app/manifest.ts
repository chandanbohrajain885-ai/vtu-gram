import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VTU GRAM',
    short_name: 'VTU GRAM',
    description: 'VTU Digital Academic Platform — Subjects, Reels, Notes, Chat',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#07070f',
    theme_color: '#7c3aed',
    categories: ['education', 'social'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/icons/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
      },
    ],
  }
}
