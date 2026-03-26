'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Profile } from '@/lib/supabase'

type SearchProfile = Pick<Profile, 'id' | 'name' | 'usn' | 'department' | 'semester' | 'avatar_url'>

export default function SearchClient() {
  const router = useRouter()
  const [myId, setMyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProfile[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      loadFollowing(user.id)
    })
  }, [])

  async function loadFollowing(uid: string) {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', uid)
    setFollowing(new Set((data ?? []).map((r: { following_id: string }) => r.following_id)))
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, usn, department, semester, avatar_url')
        .eq('role', 'student')
        .neq('id', myId ?? '')
        .or(`name.ilike.%${query.trim()}%,usn.ilike.%${query.trim()}%`)
        .limit(20)
      setResults((data ?? []) as SearchProfile[])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  async function toggleFollow(targetId: string) {
    if (!myId) return
    setToggling(targetId)
    try {
      if (following.has(targetId)) {
        await supabase.from('follows').delete()
          .eq('follower_id', myId).eq('following_id', targetId)
        setFollowing((prev) => { const s = new Set(prev); s.delete(targetId); return s })
      } else {
        await supabase.from('follows').insert({ follower_id: myId, following_id: targetId })
        setFollowing((prev) => new Set(prev).add(targetId))
      }
    } catch { /* silent */ }
    finally { setToggling(null) }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="bg-[#13131a] border-b border-slate-800 px-4 py-3 sticky top-0 z-30">
        <p className="text-sm font-semibold text-slate-300 mb-3">Search Students</p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or USN..."
            className="flex-1 bg-[#0a0a0f] border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
          />
          <button type="submit" disabled={loading}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-colors">
            {loading ? '...' : 'Search'}
          </button>
        </form>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {results.length === 0 && !loading && query && (
          <p className="text-slate-500 text-sm text-center py-10">No students found.</p>
        )}
        {results.map((student) => (
          <div key={student.id} className="bg-[#13131a] border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-violet-900/40 border border-slate-700 flex items-center justify-center shrink-0">
              {student.avatar_url
                ? <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg">👤</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{student.name}</p>
              <p className="text-xs text-slate-500">{student.usn ?? ''} · {student.department ?? ''} Sem {student.semester ?? ''}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {following.has(student.id) && (
                <Link href={`/dashboard/student/chat/${student.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                  Message
                </Link>
              )}
              <button onClick={() => toggleFollow(student.id)} disabled={toggling === student.id}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  following.has(student.id)
                    ? 'bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}>
                {toggling === student.id ? '...' : following.has(student.id) ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
