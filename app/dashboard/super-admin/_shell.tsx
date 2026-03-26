'use client'

import dynamic from 'next/dynamic'

const AdminClient = dynamic(() => import('./_client'), { ssr: false })

export default function AdminShell() {
  return <AdminClient />
}
