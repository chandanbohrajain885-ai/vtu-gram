'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Profile } from '@/lib/supabase'

type ConvoUser = Pick<Profile, 'id' | 'name' | 'usn' | 'avatar_url'> & { unread: number }

export default function ChatClient() {
  const router = useRouter()
  const [myId, setMyId] = useState<string | null>(null)
  const [connections, setConnections] = useState<ConvoUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      loadConnections(user.id)

      // realtime: refresh list when new message arrives
      const channel = supabase
        .channel('chat-list')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, () => loadConnections(user.id))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  async function loadConnections(uid: string) {
    setLoading(true)
    try {
      const [{ data: iFollow }, { data: theyFollow }, { data: msgSenders }] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', uid),
        supabase.from('follows').select('follower_id').eq('following_id', uid),
        supabase.from('messages').select('sender_id').eq('receiver_id', uid).eq('deleted_for_receiver', false).eq('deleted_for_everyone', false),
      ])

      const iFollowSet = new Set((iFollow ?? []).map((r: { following_id: string }) => r.following_id))
      const theyFollowSet = new Set((theyFollow ?? []).map((r: { follower_id: string }) => r.follower_id))
      const senderSet = new Set((msgSenders ?? []).map((r: { sender_id: string }) => r.sender_id))
      const allIds = new Set([...[...iFollowSet].filter(id => theyFollowSet.has(id)), ...senderSet])
      allIds.delete(uid)

      if (allIds.size === 0) { setConnections([]); return }

      // Get unread counts per sender
      const { data: unreadRows } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', uid)
        .is('read_at', null)
        .eq('deleted_for_receiver', false)
        .eq('deleted_for_everyone', false)

      const unreadMap: Record<string, number> = {}
      for (const r of (unreadRows ?? [])) {
        unreadMap[r.sender_id] = (unreadMap[r.sender_id] ?? 0) + 1
      }

      const { data: profiles } = await supabase
        .from('profiles').select('id, name, usn, avatar_url').in('id', [...allIds])

      setConnections(
        (profiles ?? []).map((p: Pick<Profile, 'id' | 'name' | 'usn' | 'avatar_url'>) => ({
          ...p,
          unread: unreadMap[p.id] ?? 0,
        }))
      )
    } catch { setConnections([]) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grad-bg">
      <header className="glass border-b border-[#1e1e35] px-4 py-4 sticky top-0 z-30">
        <p className="text-sm font-semibold text-slate-300">Messages</p>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">Loading...</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-slate-400 text-sm">No messages yet.</p>
            <Link href="/dashboard/student/search"
              className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm rounded-xl">
              Find Students
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((user) => (
              <Link key={user.id} href={`/dashboard/student/chat/${user.id}`}
                className="flex items-center gap-3 glass hover:border-violet-500/40 rounded-2xl px-4 py-3 transition-all">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-violet-900/40 border border-violet-700/30 flex items-center justify-center">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-lg">👤</span>}
                  </div>
                  {user.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold badge-pulse">
                      {user.unread > 9 ? '9+' : user.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.usn ?? ''}</p>
                </div>
                {user.unread > 0
                  ? <span className="text-xs text-red-400 font-semibold">{user.unread} new</span>
                  : <span className="text-violet-600 text-lg">›</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
