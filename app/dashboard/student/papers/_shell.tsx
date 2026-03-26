'use client'

import dynamic from 'next/dynamic'

const PapersClient = dynamic(() => import('./_client'), { ssr: false })

export default function PapersShell() {
  return <PapersClient />
}
