'use client'

import dynamic from 'next/dynamic'

const LoginClient = dynamic(() => import('./_client'), { ssr: false })

export default function LoginShell() {
  return <LoginClient />
}
