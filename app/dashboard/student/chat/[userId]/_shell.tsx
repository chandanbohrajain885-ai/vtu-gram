'use client'
import dynamic from 'next/dynamic'
const ConvoClient = dynamic(() => import('./_client'), { ssr: false })
export default function ConvoShell() { return <ConvoClient /> }
