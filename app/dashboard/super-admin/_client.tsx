'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, DEPARTMENTS, type Content } from '@/lib/supabase'

type ContentType = 'video' | 'short' | 'note' | 'question_paper'

export default function SuperAdminDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [contents, setContents] = useState<Content[]>([])
  const [loadingContents, setLoadingContents] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    type: 'video' as ContentType,
    department: '',
    semester: '',
    subject: '',
    chapter: '',
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'super_admin') {
        router.push('/login')
        return
      }

      await loadContents()
    } catch {
      router.push('/login')
    }
  }

  async function loadContents() {
    setLoadingContents(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('content')
        .select('*')
        .order('id', { ascending: false })

      if (fetchError) throw fetchError
      setContents(data ?? [])
    } catch {
      setError('Failed to load content.')
    } finally {
      setLoadingContents(false)
    }
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    if (!form.department) { setError('Please select a department.'); return }

    setUploading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const isMedia = form.type === 'video' || form.type === 'short'
      const bucket = isMedia ? 'videos' : 'documents'
      const ext = file.name.split('.').pop() ?? 'bin'
      const filePath = `${form.department}/${form.type}/${Date.now()}.${ext}`

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: false })

      if (storageError) throw storageError

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

      const { error: dbError } = await supabase.from('content').insert({
        title: form.title,
        department: form.department,
        semester: parseInt(form.semester, 10),
        subject: form.subject,
        chapter: form.chapter,
        type: form.type,
        file_url: urlData.publicUrl,
        status: 'approved',
      })

      if (dbError) throw dbError

      setSuccessMsg('Content uploaded successfully!')
      setForm({ title: '', type: 'video', department: '', semester: '', subject: '', chapter: '' })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadContents()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(item: Content) {
    setDeleting(item.id)
    setError(null)
    try {
      const isMedia = item.type === 'video' || item.type === 'short'
      const bucket = isMedia ? 'videos' : 'documents'

      // Extract path from URL
      const url = new URL(item.file_url)
      const pathParts = url.pathname.split(`/object/public/${bucket}/`)
      const filePath = pathParts[1] ?? ''

      if (filePath) {
        await supabase.storage.from(bucket).remove([filePath])
      }

      const { error: dbError } = await supabase.from('content').delete().eq('id', item.id)
      if (dbError) throw dbError

      setContents((prev) => prev.filter((c) => c.id !== item.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const typeLabel: Record<ContentType, string> = {
    video: 'Video',
    short: 'Short',
    note: 'E-Note',
    question_paper: 'Question Paper',
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top bar */}
      <header className="bg-[#13131a] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          VTU GRAM — Admin
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          Logout
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Upload form */}
        <section className="bg-[#13131a] rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-5">Upload Content</h2>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 text-sm rounded-lg px-4 py-3">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Title</label>
              <input
                name="title" required value={form.title} onChange={handleFormChange}
                placeholder="e.g. Data Structures - Lecture 1"
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select
                name="type" value={form.type} onChange={handleFormChange}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="video">Video</option>
                <option value="short">Short</option>
                <option value="note">E-Note</option>
                <option value="question_paper">Question Paper</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Department</label>
              <select
                name="department" required value={form.department} onChange={handleFormChange}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Semester</label>
              <select
                name="semester" required value={form.semester} onChange={handleFormChange}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Subject</label>
              <input
                name="subject" required value={form.subject} onChange={handleFormChange}
                placeholder="e.g. Data Structures"
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Chapter</label>
              <input
                name="chapter" required value={form.chapter} onChange={handleFormChange}
                placeholder="e.g. Chapter 1"
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">File</label>
              <input
                ref={fileInputRef}
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-400 text-sm focus:outline-none focus:border-violet-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:text-xs file:cursor-pointer"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Content'}
              </button>
            </div>
          </form>
        </section>

        {/* Content list */}
        <section className="bg-[#13131a] rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-5">All Content</h2>

          {loadingContents ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading...</div>
          ) : contents.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">No content uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left pb-3 pr-4 font-medium">Title</th>
                    <th className="text-left pb-3 pr-4 font-medium">Subject</th>
                    <th className="text-left pb-3 pr-4 font-medium">Type</th>
                    <th className="text-left pb-3 pr-4 font-medium">Chapter</th>
                    <th className="text-left pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {contents.map((item) => (
                    <tr key={item.id} className="text-slate-300">
                      <td className="py-3 pr-4 max-w-[180px] truncate">{item.title}</td>
                      <td className="py-3 pr-4 text-slate-400">{item.subject}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-violet-900/40 text-violet-300">
                          {typeLabel[item.type] ?? item.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{item.chapter}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                        >
                          {deleting === item.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
