'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, DEPARTMENTS } from '@/lib/supabase'

export default function SignupClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', usn: '',
    department: '', semester: '', year: '',
  })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  // Fetch subjects whenever dept + semester + year are all selected
  useEffect(() => {
    const { department, semester, year } = form
    if (!department || !semester || !year) {
      setAvailableSubjects([])
      setSelectedSubjects([])
      return
    }
    fetchSubjects(department, parseInt(semester, 10), parseInt(year, 10))
  }, [form.department, form.semester, form.year])

  async function fetchSubjects(department: string, semester: number, year: number) {
    setLoadingSubjects(true)
    setSelectedSubjects([])
    try {
      const { data } = await supabase
        .from('subjects_config')
        .select('subject')
        .eq('department', department)
        .eq('semester', semester)
        .eq('year', year)
        .order('subject')
      setAvailableSubjects((data ?? []).map((r: { subject: string }) => r.subject))
    } catch {
      setAvailableSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleSubject(subject: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const semesterNum = parseInt(form.semester, 10)
      const yearNum = parseInt(form.year, 10)
      if (!form.department) { setError('Please select a department.'); return }
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        setError('Please select a valid semester.'); return
      }
      if (selectedSubjects.length === 0) {
        setError('Please select at least one subject.'); return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
      })
      if (authError) { setError(authError.message); return }
      if (!authData.user) { setError('Signup failed. Please try again.'); return }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        name: form.name,
        role: 'student',
        usn: form.usn,
        email: form.email,
        department: form.department,
        semester: semesterNum,
        year: isNaN(yearNum) ? null : yearNum,
        subjects: selectedSubjects,
        is_approved: true,
      })
      if (profileError) { setError(profileError.message); return }
      router.push('/dashboard/student')
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const showSubjectPicker = form.department && form.semester && form.year

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">VTU GRAM</span>
          <p className="text-slate-400 text-sm mt-1">Create your student account</p>
        </div>
        <form onSubmit={handleSignup} className="bg-[#13131a] rounded-2xl p-6 border border-slate-800 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Basic fields */}
          {([
            { label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'USN', name: 'usn', type: 'text', placeholder: '1VT21CS001' },
          ] as const).map((field) => (
            <div key={field.name}>
              <label className="block text-sm text-slate-400 mb-1">{field.label}</label>
              <input
                type={field.type} name={field.name} required
                value={form[field.name]} onChange={handleChange}
                placeholder={field.placeholder}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          ))}

          {/* Department */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Department</label>
            <select name="department" required value={form.department} onChange={handleChange}
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors">
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Year + Semester */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Year</label>
              <select name="year" required value={form.year} onChange={handleChange}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">Year</option>
                {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Semester</label>
              <select name="semester" required value={form.semester} onChange={handleChange}
                className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">Sem</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
          </div>

          {/* Subject picker */}
          {showSubjectPicker && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Subjects
                {selectedSubjects.length > 0 && (
                  <span className="ml-2 text-violet-400">({selectedSubjects.length} selected)</span>
                )}
              </label>
              {loadingSubjects ? (
                <p className="text-xs text-slate-500 py-2">Loading subjects...</p>
              ) : availableSubjects.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No subjects configured for this selection yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableSubjects.map((subject) => (
                    <label key={subject} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                        className="w-4 h-4 rounded accent-violet-500"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-violet-300 transition-colors">
                        {subject}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
