'use client'

import dynamic from 'next/dynamic'

const AdminLoginClient = dynamic(() => import('./_client'), { ssr: false })

export default function AdminLoginShell() {
  return <AdminLoginClient />
}
