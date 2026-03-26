'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Profile, type Content } from '@/lib/supabase'

export default function PapersPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [papers, setPapers] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (!profileData || profileData.role !== 'student') {
        router.push('/login')
        return
      }

      setProfile(profileData as Profile)

      const subjects: string[] = Array.isArray(profileData.subjects) ? profileData.subjects : []

      const { data: papersData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'question_paper')
        .eq('department', profileData.department ?? '')
        .eq('semester', profileData.semester ?? 0)
        .in('subject', subjects.length > 0 ? subjects : ['__none__'])
        .eq('status', 'approved')

      setPapers(papersData ?? [])
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="bg-[#13131a] border-b border-slate-800 px-4 py-4 flex items-center gap-3">
        <Link
          href="/dashboard/student"
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-slate-200">Question Papers</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {profile && (
          <p className="text-xs text-slate-500 mb-4">
            {profile.department} · Semester {profile.semester}
          </p>
        )}

        {papers.length === 0 ? (
          <div className="bg-[#13131a] rounded-2xl border border-slate-800 p-10 text-center">
            <p className="text-3xl mb-3">📑</p>
            <p className="text-slate-400 text-sm">No question papers available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <a
                key={paper.id}
                href={paper.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-[#13131a] border border-slate-800 hover:border-violet-500 rounded-2xl px-5 py-4 transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors">
                    {paper.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {paper.subject} · {paper.chapter}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
                    Download
                  </span>
                  <span className="text-slate-500 group-hover:text-violet-400 text-lg">↓</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
