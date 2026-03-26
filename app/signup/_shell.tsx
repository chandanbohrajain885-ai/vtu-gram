'use client'

import dynamic from 'next/dynamic'

const SignupClient = dynamic(() => import('./_client'), { ssr: false })

export default function SignupShell() {
  return <SignupClient />
}
