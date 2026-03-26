'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, DEPARTMENTS, BADGES, BADGE_STYLE, type Profile, type Badge } from '@/lib/supabase'

interface Props {
  profile: Profile
  onClose: () => void
  onSaved: (updated: Profile) => void
}

export default function ProfileEditModal({ profile, onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile.name)
  const [badge, setBadge] = useState<Badge | null>(profile.badge ?? null)
  const [department, setDepartment] = useState(profile.department ?? '')
  const [year, setYear] = useState(String(profile.year ?? ''))
  const [semester, setSemester] = useState(String(profile.semester ?? ''))
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update subjects when dept/year/sem change
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile.subjects ?? [])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  useEffect(() => {
    if (!department || !semester || !year) { setAvailableSubjects([]); return }
    fetchSubjects(department, parseInt(semester, 10), parseInt(year, 10))
  }, [department, semester, year])

  async function fetchSubjects(dept: string, sem: number, yr: number) {
    setLoadingSubjects(true)
    try {
      const { data } = await supabase
        .from('subjects_config').select('subject')
        .eq('department', dept).eq('semester', sem).eq('year', yr).order('subject')
      setAvailableSubjects((data ?? []).map((r: { subject: string }) => r.subject))
    } catch { setAvailableSubjects([]) }
    finally { setLoadingSubjects(false) }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  function toggleSubject(subject: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)

    try {
      let avatar_url = profile.avatar_url ?? null

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const path = `${profile.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = urlData.publicUrl
      }

      const updates = {
        name: name.trim(),
        department: department || null,
        year: year ? parseInt(year, 10) : null,
        semester: semester ? parseInt(semester, 10) : null,
        subjects: selectedSubjects,
        avatar_url,
        badge,
      }

      const { error: updateError } = await supabase
        .from('profiles').update(updates).eq('id', profile.id)

      if (updateError) throw updateError

      onSaved({ ...profile, ...updates })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-[#13131a] rounded-t-3xl sm:rounded-2xl border border-slate-800 max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
          <h2 className="font-semibold text-slate-200 text-base">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 hover:border-violet-500 cursor-pointer overflow-hidden flex items-center justify-center bg-[#0a0a0f] transition-colors"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500" />
          </div>

          {/* Badge */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {BADGES.map((b) => (
                <button key={b} type="button"
                  onClick={() => setBadge(badge === b ? null : b)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    badge === b
                      ? BADGE_STYLE[b]
                      : 'bg-white/5 border-[#1e1e35] text-slate-400 hover:border-violet-600/40 hover:text-slate-200'
                  }`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* USN — read only */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">USN (cannot be changed)</label>
            <input value={profile.usn ?? ''} disabled
              className="w-full bg-[#0a0a0f] border border-slate-800 rounded-lg px-3 py-2.5 text-slate-500 text-sm cursor-not-allowed" />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500">
              <option value="">Select</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Year + Semester */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500">
                <option value="">Year</option>
                {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500">
                <option value="">Sem</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>

          {/* Subjects */}
          {department && year && semester && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Subjects
                {selectedSubjects.length > 0 && <span className="ml-2 text-violet-400">({selectedSubjects.length} selected)</span>}
              </label>
              {loadingSubjects ? (
                <p className="text-xs text-slate-500">Loading subjects...</p>
              ) : availableSubjects.length === 0 ? (
                <p className="text-xs text-slate-500">No subjects configured for this selection.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {availableSubjects.map((subject) => (
                    <label key={subject} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={selectedSubjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                        className="w-4 h-4 rounded accent-violet-500" />
                      <span className="text-sm text-slate-300 group-hover:text-violet-300 transition-colors">{subject}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
