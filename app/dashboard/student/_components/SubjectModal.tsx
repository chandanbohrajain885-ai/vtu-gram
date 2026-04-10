'use client'

import { useState, useEffect } from 'react'
import { supabase, type Profile, type Content } from '@/lib/supabase'

type Tab = 'videos' | 'enotes' | 'mynotes'

interface Props {
  subject: string
  profile: Profile
  onClose: () => void
}

export default function SubjectModal({ subject, profile, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('videos')
  const [videos, setVideos] = useState<Content[]>([])
  const [notes, setNotes] = useState<Content[]>([])
  const [myNote, setMyNote] = useState('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    loadContent()
    loadMyNote()
  }, [subject])

  async function loadContent() {
    setLoadingContent(true)
    try {
      const { data: videoData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'video')
        .eq('subject', subject)
        .eq('department', profile.department ?? '')
        .eq('semester', profile.semester ?? 0)
        .eq('status', 'approved')
        .eq('language', profile.preferred_language ?? 'English')

      const { data: noteData } = await supabase
        .from('content')
        .select('*')
        .eq('type', 'note')
        .eq('subject', subject)
        .eq('department', profile.department ?? '')
        .eq('semester', profile.semester ?? 0)
        .eq('status', 'approved')

      setVideos(videoData ?? [])
      setNotes(noteData ?? [])
    } catch {
      // silently fail — UI shows empty state
    } finally {
      setLoadingContent(false)
    }
  }

  async function loadMyNote() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('student_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('subject', subject)
        .single()

      if (data) setMyNote(data.content ?? '')
    } catch {
      // no note yet — that's fine
    }
  }

  async function saveMyNote() {
    setSavingNote(true)
    setNoteSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('student_notes').upsert(
        { user_id: user.id, subject, content: myNote },
        { onConflict: 'user_id,subject' }
      )
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } catch {
      // silently fail
    } finally {
      setSavingNote(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'videos', label: 'Videos' },
    { key: 'enotes', label: 'E-Notes' },
    { key: 'mynotes', label: 'My Notes' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
      <div className="w-full sm:max-w-2xl bg-[#13131a] rounded-t-3xl sm:rounded-2xl border border-slate-800 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
          <h2 className="font-semibold text-slate-200 text-base truncate pr-4">{subject}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-violet-500 text-violet-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loadingContent && tab !== 'mynotes' ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading...</div>
          ) : tab === 'videos' ? (
            <ContentList items={videos} emptyMsg="No videos available for this subject." />
          ) : tab === 'enotes' ? (
            <ContentList items={notes} emptyMsg="No e-notes available for this subject." />
          ) : (
            <div className="space-y-3">
              <textarea
                value={myNote}
                onChange={(e) => setMyNote(e.target.value)}
                placeholder="Write your personal notes here..."
                rows={10}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-violet-500 resize-none"
              />
              <button
                onClick={saveMyNote}
                disabled={savingNote}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {savingNote ? 'Saving...' : noteSaved ? 'Saved ✓' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContentList({ items, emptyMsg }: { items: Content[]; emptyMsg: string }) {
  if (items.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-8">{emptyMsg}</p>
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-[#0a0a0f] border border-slate-800 hover:border-violet-500 rounded-xl px-4 py-3 transition-all group"
        >
          <div>
            <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{item.chapter}</p>
          </div>
          <span className="text-slate-500 group-hover:text-violet-400 text-lg">↗</span>
        </a>
      ))}
    </div>
  )
}
