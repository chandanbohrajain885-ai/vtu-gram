'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Profile, type Content } from '@/lib/supabase'

export default function ShortsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shorts, setShorts] = useState<Content[]>([])
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

      const { data: shortsData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'short')
        .eq('department', profileData.department ?? '')
        .eq('semester', profileData.semester ?? 0)
        .eq('status', 'approved')

      setShorts(shortsData ?? [])
    } catch {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-black min-h-screen">
      {/* Back button overlay */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/dashboard/student"
          className="flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-full border border-white/20"
        >
          ← Back
        </Link>
      </div>

      {shorts.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-slate-400 text-sm">No shorts available yet.</p>
            <p className="text-slate-600 text-xs mt-1">
              {profile?.department} · Sem {profile?.semester}
            </p>
          </div>
        </div>
      ) : (
        <div className="shorts-container">
          {shorts.map((short, index) => (
            <ShortItem key={short.id} short={short} index={index} total={shorts.length} />
          ))}
        </div>
      )}
    </div>
  )
}

function ShortItem({ short, index, total }: { short: Content; index: number; total: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current
        if (!video) return
        if (entry.isIntersecting) {
          video.play().catch(() => {/* autoplay blocked — user must tap */})
        } else {
          video.pause()
        }
      },
      { threshold: 0.7 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  return (
    <div ref={containerRef} className="short-item relative flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={short.file_url}
        loop
        playsInline
        muted={false}
        onClick={togglePlay}
        className="h-full w-full object-contain max-h-[100dvh]"
      />

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <p className="text-white font-semibold text-base leading-snug">{short.title}</p>
        <p className="text-slate-300 text-xs mt-1">{short.subject} · {short.chapter}</p>
        <p className="text-slate-500 text-xs mt-0.5">{index + 1} / {total}</p>
      </div>
    </div>
  )
}
