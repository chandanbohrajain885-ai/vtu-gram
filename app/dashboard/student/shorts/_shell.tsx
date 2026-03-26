'use client'

import dynamic from 'next/dynamic'

const ShortsClient = dynamic(() => import('./_client'), { ssr: false })

export default function ShortsShell() {
  return <ShortsClient />
}
