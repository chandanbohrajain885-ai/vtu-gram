'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard/student', label: 'Home', icon: HomeIcon },
  { href: '/dashboard/student/shorts', label: 'Reels', icon: ReelsIcon },
  { href: '/dashboard/student/search', label: 'Search', icon: SearchIcon },
  { href: '/dashboard/student/chat', label: 'Chat', icon: ChatIcon },
]

export default function BottomNav() {
  const path = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let myId: string | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      myId = user.id
      loadUnread(user.id)

      // realtime: new message arrives → bump badge
      const channel = supabase
        .channel('nav-unread')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, () => {
          setUnread((n) => n + 1)
          // Play sound from nav level (works on any page)
          const audio = new Audio('/notify.wav')
          audio.volume = 1.0
          audio.play().catch(() => {})
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })

    async function loadUnread(uid: string) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', uid)
        .is('read_at', null)
        .eq('deleted_for_receiver', false)
        .eq('deleted_for_everyone', false)
      setUnread(count ?? 0)
    }
  }, [])

  // Clear badge when on chat page
  useEffect(() => {
    if (path.startsWith('/dashboard/student/chat')) setUnread(0)
  }, [path])

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-[#1e1e35] flex sm:hidden">
        {NAV.map((item) => {
          const active = path === item.href || (item.href !== '/dashboard/student' && path.startsWith(item.href))
          const isChat = item.href === '/dashboard/student/chat'
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative ${active ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
              <div className="relative">
                <item.icon active={active} />
                {isChat && unread > 0 && (
                  <span className="badge-pulse absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Desktop left sidebar */}
      <nav className="hidden sm:flex fixed left-0 top-0 bottom-0 z-40 w-56 glass border-r border-[#1e1e35] flex-col pt-6 pb-6 px-3 gap-1">
        <div className="px-3 mb-6">
          <span className="text-xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            VTU GRAM
          </span>
        </div>
        {NAV.map((item) => {
          const active = path === item.href || (item.href !== '/dashboard/student' && path.startsWith(item.href))
          const isChat = item.href === '/dashboard/student/chat'
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${active ? 'bg-violet-600/20 text-violet-300 border border-violet-700/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <div className="relative">
                <item.icon active={active} />
                {isChat && unread > 0 && (
                  <span className="badge-pulse absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function ReelsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  )
}
function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  )
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
