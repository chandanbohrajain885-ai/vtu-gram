'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Profile } from '@/lib/supabase'
import SubjectModal from './_components/SubjectModal'
import ProfileEditModal from './_components/ProfileEditModal'
import FollowListModal from './_components/FollowListModal'
import Link from 'next/link'

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null)

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
    <div className="min-h-screen grad-bg">
      {/* Top bar */}
      <header className="glass border-b border-[#1e1e35] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
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
        <div className="glass rounded-2xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-600/5 pointer-events-none" />
          <div className="flex items-center gap-5 relative">
            <button onClick={() => setShowEditProfile(true)}
              className="w-20 h-20 rounded-full overflow-hidden avatar-glow flex items-center justify-center shrink-0 transition-all hover:scale-105">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-4xl bg-violet-900/60 w-full h-full flex items-center justify-center">👤</span>}
            </button>
            <div className="flex-1">
              <p className="text-base font-bold text-slate-100">{profile.name}</p>
              <p className="text-xs text-slate-500 mb-3">{profile.usn ?? ''} · {profile.department ?? ''} · Sem {profile.semester ?? '—'}</p>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-base font-bold text-slate-100">{subjects.length}</p>
                  <p className="text-xs text-slate-500">Subjects</p>
                </div>
                <button className="text-center" onClick={() => setFollowModal('followers')}>
                  <p className="text-base font-bold text-slate-100">{followers}</p>
                  <p className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Followers</p>
                </button>
                <button className="text-center" onClick={() => setFollowModal('following')}>
                  <p className="text-base font-bold text-slate-100">{following}</p>
                  <p className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Following</p>
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setShowEditProfile(true)}
            className="mt-4 w-full py-2 rounded-xl border border-[#1e1e35] hover:border-violet-500/50 text-slate-400 hover:text-violet-300 text-sm font-medium transition-all">
            Edit Profile
          </button>
        </div>

        {/* Quick access */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/dashboard/student/shorts"
            className="flex items-center gap-3 glass hover:border-violet-500/50 rounded-2xl p-4 transition-all group">
            <span className="text-2xl">🎬</span>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">Reels</p>
              <p className="text-xs text-slate-500">Learning shorts</p>
            </div>
          </Link>
          <Link href="/dashboard/student/papers"
            className="flex items-center gap-3 glass hover:border-violet-500/50 rounded-2xl p-4 transition-all group">
            <span className="text-2xl">📑</span>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">Papers</p>
              <p className="text-xs text-slate-500">Question papers</p>
            </div>
          </Link>
        </div>

        {/* My Subjects */}
        <h2 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-widest">My Subjects</h2>
        {subjects.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-slate-500 text-sm text-center">
            No subjects yet.{' '}
            <button onClick={() => setShowEditProfile(true)} className="text-violet-400 hover:text-violet-300">Edit profile</button>{' '}
            to add them.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <button key={subject} onClick={() => setSelectedSubject(subject)}
                className="glass hover:border-violet-500/50 rounded-2xl p-4 text-left transition-all group hover:bg-violet-600/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-fuchsia-600/20 flex items-center justify-center mb-2">
                  <span className="text-violet-300 text-sm font-bold">{subject.charAt(0)}</span>
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
      {followModal && (
        <FollowListModal myId={profile.id} mode={followModal} onClose={() => setFollowModal(null)} />
      )}
    </div>
  )
}
