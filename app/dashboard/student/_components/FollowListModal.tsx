'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, type Profile } from '@/lib/supabase'

type ListUser = Pick<Profile, 'id' | 'name' | 'usn' | 'department' | 'avatar_url'>

interface Props {
  myId: string
  mode: 'followers' | 'following'
  onClose: () => void
}

export default function FollowListModal({ myId, mode, onClose }: Props) {
  const [users, setUsers] = useState<ListUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadList() }, [mode])

  async function loadList() {
    setLoading(true)
    try {
      let ids: string[] = []
      if (mode === 'followers') {
        const { data } = await supabase
          .from('follows').select('follower_id').eq('following_id', myId)
        ids = (data ?? []).map((r: { follower_id: string }) => r.follower_id)
      } else {
        const { data } = await supabase
          .from('follows').select('following_id').eq('follower_id', myId)
        ids = (data ?? []).map((r: { following_id: string }) => r.following_id)
      }

      if (ids.length === 0) { setUsers([]); return }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, usn, department, avatar_url')
        .in('id', ids)

      setUsers((profiles ?? []) as ListUser[])
    } catch { setUsers([]) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
      <div className="w-full sm:max-w-sm bg-[#13131a] rounded-t-3xl sm:rounded-2xl border border-slate-800 max-h-[80dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
          <h2 className="font-semibold text-slate-200 text-base capitalize">{mode}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-slate-500 text-sm text-center py-8">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            users.map((user) => (
              <Link key={user.id} href={`/dashboard/student/chat/${user.id}`} onClick={onClose}
                className="flex items-center gap-3 bg-[#0a0a0f] border border-slate-800 hover:border-violet-500 rounded-xl px-3 py-2.5 transition-all">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-900/40 border border-slate-700 flex items-center justify-center shrink-0">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">👤</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.usn ?? ''} · {user.department ?? ''}</p>
                </div>
                <span className="text-xs text-violet-400">Message →</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
