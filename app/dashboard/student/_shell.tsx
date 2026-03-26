'use client'

import dynamic from 'next/dynamic'

const StudentClient = dynamic(() => import('./_client'), { ssr: false })

export default function StudentShell() {
  return <StudentClient />
}
