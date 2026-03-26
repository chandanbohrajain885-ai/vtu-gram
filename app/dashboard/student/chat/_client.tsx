'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Profile } from '@/lib/supabase'

type ConvoUser = Pick<Profile, 'id' | 'name' | 'usn' | 'avatar_url'>

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
    })
  }, [])

  async function loadConnections(uid: string) {
    setLoading(true)
    try {
      // People I follow AND who follow me back (mutual = connected)
      const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', uid),
        supabase.from('follows').select('follower_id').eq('following_id', uid),
      ])
      const iFollowSet = new Set((iFollow ?? []).map((r: { following_id: string }) => r.following_id))
      const theyFollowSet = new Set((theyFollow ?? []).map((r: { follower_id: string }) => r.follower_id))
      const mutualIds = [...iFollowSet].filter((id) => theyFollowSet.has(id))

      if (mutualIds.length === 0) { setConnections([]); return }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, usn, avatar_url')
        .in('id', mutualIds)

      setConnections((profiles ?? []) as ConvoUser[])
    } catch { setConnections([]) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="bg-[#13131a] border-b border-slate-800 px-4 py-4 sticky top-0 z-30">
        <p className="text-sm font-semibold text-slate-300">Messages</p>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">Loading...</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-slate-400 text-sm">No connections yet.</p>
            <p className="text-slate-600 text-xs mt-1">Follow someone and get a follow back to start chatting.</p>
            <Link href="/dashboard/student/search"
              className="inline-block mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl transition-colors">
              Find Students
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((user) => (
              <Link key={user.id} href={`/dashboard/student/chat/${user.id}`}
                className="flex items-center gap-3 bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl px-4 py-3 transition-all">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-violet-900/40 border border-slate-700 flex items-center justify-center shrink-0">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">👤</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.usn ?? ''}</p>
                </div>
                <span className="text-slate-600 text-lg">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
