'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Profile } from '@/lib/supabase'
import SubjectModal from './_components/SubjectModal'
import ProfileEditModal from './_components/ProfileEditModal'

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error || !data) { router.push('/login'); return }
      if (data.role !== 'student') { router.push('/login'); return }
      setProfile(data as Profile)
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
      <header className="bg-[#13131a] border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <span className="text-lg font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          VTU GRAM
        </span>
        <div className="flex items-center gap-3">
          {/* Avatar + name */}
          <button
            onClick={() => setShowEditProfile(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Edit profile"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-900/40 border border-slate-700 flex items-center justify-center shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">👤</span>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-200 leading-none">{profile.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{profile.usn ?? 'N/A'}</p>
            </div>
          </button>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-400 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Student info strip */}
        <div className="bg-[#13131a] rounded-2xl border border-slate-800 p-4 mb-6 flex flex-wrap gap-4 items-center">
          {/* Avatar large */}
          <div
            onClick={() => setShowEditProfile(true)}
            className="w-14 h-14 rounded-full overflow-hidden bg-violet-900/40 border-2 border-slate-700 hover:border-violet-500 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Edit profile"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">👤</span>
            )}
          </div>
          <div className="flex flex-wrap gap-6 items-center flex-1">
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p className="text-sm font-semibold text-slate-200">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">USN</p>
              <p className="text-sm font-semibold text-slate-200">{profile.usn ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Department</p>
              <p className="text-sm font-semibold text-violet-300">{profile.department ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Semester</p>
              <p className="text-sm font-semibold text-violet-300">{profile.semester ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Year</p>
              <p className="text-sm font-semibold text-violet-300">{profile.year ?? '—'}</p>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="text-xs text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: My Subjects */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-slate-300 mb-3">My Subjects</h2>
            {subjects.length === 0 ? (
              <div className="bg-[#13131a] rounded-2xl border border-slate-800 p-6 text-slate-500 text-sm text-center">
                No subjects assigned.{' '}
                <button onClick={() => setShowEditProfile(true)} className="text-violet-400 hover:text-violet-300">
                  Edit your profile
                </button>{' '}
                to add subjects.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjects.map((subject) => (
                  <button key={subject} onClick={() => setSelectedSubject(subject)}
                    className="bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl p-4 text-left transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-violet-900/40 flex items-center justify-center mb-3">
                      <span className="text-violet-400 text-sm font-bold">{subject.charAt(0)}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors leading-snug">
                      {subject}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Quick Access */}
          <div>
            <h2 className="text-base font-semibold text-slate-300 mb-3">Quick Access</h2>
            <div className="space-y-3">
              <Link href="/dashboard/student/shorts"
                className="flex items-center gap-3 bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl p-4 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-pink-900/40 flex items-center justify-center text-xl">🎬</div>
                <div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">Learning Shorts</p>
                  <p className="text-xs text-slate-500">Reel-style videos</p>
                </div>
              </Link>
              <Link href="/dashboard/student/papers"
                className="flex items-center gap-3 bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl p-4 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-cyan-900/40 flex items-center justify-center text-xl">📑</div>
                <div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">Question Papers</p>
                  <p className="text-xs text-slate-500">Past exam papers</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {selectedSubject && (
        <SubjectModal subject={selectedSubject} profile={profile} onClose={() => setSelectedSubject(null)} />
      )}

      {showEditProfile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </div>
  )
}
