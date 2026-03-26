'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Profile } from '@/lib/supabase'
import SubjectModal from './_components/SubjectModal'
import ProfileEditModal from './_components/ProfileEditModal'
import Link from 'next/link'

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error || !data) { router.push('/login'); return }
      if (data.role !== 'student') { router.push('/login'); return }
      setProfile(data as Profile)
      // load follow counts
      const [{ count: fc }, { count: ing }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      ])
      setFollowers(fc ?? 0)
      setFollowing(ing ?? 0)
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }
  if (!profile) return null

  const subjects: string[] = Array.isArray(profile.subjects) ? profile.subjects : []

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top bar */}
      <header className="bg-[#13131a] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <span className="text-base font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent sm:hidden">
          VTU GRAM
        </span>
        <span className="hidden sm:block text-sm font-semibold text-slate-300">Home</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowEditProfile(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-900/40 border border-slate-700 flex items-center justify-center shrink-0">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-sm">👤</span>}
            </div>
            <span className="text-sm text-slate-300 hidden sm:block">{profile.name}</span>
          </button>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile card — Instagram style */}
        <div className="bg-[#13131a] rounded-2xl border border-slate-800 p-5 mb-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <button onClick={() => setShowEditProfile(true)}
              className="w-20 h-20 rounded-full overflow-hidden bg-violet-900/40 border-2 border-violet-700 hover:border-violet-400 flex items-center justify-center shrink-0 transition-colors">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-4xl">👤</span>}
            </button>

            {/* Stats */}
            <div className="flex-1">
              <p className="text-base font-bold text-slate-100">{profile.name}</p>
              <p className="text-xs text-slate-500 mb-3">{profile.usn ?? ''} · {profile.department ?? ''} · Sem {profile.semester ?? '—'}</p>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-base font-bold text-slate-100">{subjects.length}</p>
                  <p className="text-xs text-slate-500">Subjects</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-slate-100">{followers}</p>
                  <p className="text-xs text-slate-500">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-slate-100">{following}</p>
                  <p className="text-xs text-slate-500">Following</p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => setShowEditProfile(true)}
            className="mt-4 w-full py-2 rounded-xl border border-slate-700 hover:border-violet-500 text-slate-300 hover:text-violet-300 text-sm font-medium transition-colors">
            Edit Profile
          </button>
        </div>

        {/* Quick access */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/dashboard/student/shorts"
            className="flex items-center gap-3 bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl p-4 transition-all group">
            <span className="text-2xl">🎬</span>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">Reels</p>
              <p className="text-xs text-slate-500">Learning shorts</p>
            </div>
          </Link>
          <Link href="/dashboard/student/papers"
            className="flex items-center gap-3 bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl p-4 transition-all group">
            <span className="text-2xl">📑</span>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">Papers</p>
              <p className="text-xs text-slate-500">Question papers</p>
            </div>
          </Link>
        </div>

        {/* My Subjects */}
        <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">My Subjects</h2>
        {subjects.length === 0 ? (
          <div className="bg-[#13131a] rounded-2xl border border-slate-800 p-6 text-slate-500 text-sm text-center">
            No subjects yet.{' '}
            <button onClick={() => setShowEditProfile(true)} className="text-violet-400 hover:text-violet-300">
              Edit profile
            </button>{' '}
            to add them.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <button key={subject} onClick={() => setSelectedSubject(subject)}
                className="bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl p-4 text-left transition-all group">
                <div className="w-8 h-8 rounded-lg bg-violet-900/40 flex items-center justify-center mb-2">
                  <span className="text-violet-400 text-sm font-bold">{subject.charAt(0)}</span>
                </div>
                <p className="text-xs font-medium text-slate-200 group-hover:text-violet-300 transition-colors leading-snug">
                  {subject}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSubject && (
        <SubjectModal subject={selectedSubject} profile={profile} onClose={() => setSelectedSubject(null)} />
      )}
      {showEditProfile && (
        <ProfileEditModal profile={profile} onClose={() => setShowEditProfile(false)}
          onSaved={(updated) => { setProfile(updated) }} />
      )}
    </div>
  )
}
