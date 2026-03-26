'use client'

import dynamic from 'next/dynamic'

const BottomNav = dynamic(() => import('./BottomNav'), { ssr: false })

export default function BottomNavShell() {
  return <BottomNav />
}
