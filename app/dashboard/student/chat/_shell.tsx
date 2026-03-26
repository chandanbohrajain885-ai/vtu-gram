'use client'
import dynamic from 'next/dynamic'
const ChatClient = dynamic(() => import('./_client'), { ssr: false })
export default function ChatShell() { return <ChatClient /> }
