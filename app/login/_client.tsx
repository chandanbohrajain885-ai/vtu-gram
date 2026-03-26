'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginClient() {
  const router = useRouter()
  const [usn, setUsn] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data: profileData, error: lookupError } = await supabase
        .from('profiles').select('id, role, email').eq('usn', usn.trim()).single()
      if (lookupError || !profileData) { setError('USN not found. Please check and try again.'); return }
      const email = (profileData as { email?: string | null }).email
      if (!email) { setError('Account has no email linked. Please re-register.'); return }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError('Incorrect password. Please try again.'); return }
      if (!authData.user) { setError('Login failed. Please try again.'); return }
      if (profileData.role === 'super_admin') router.push('/dashboard/super-admin')
      else router.push('/dashboard/student')
    } catch { setError('An unexpected error occurred.') }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen grad-bg flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent">VTU GRAM</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in with your USN</p>
        </div>
        <form onSubmit={handleLogin} className="glass rounded-2xl p-6 space-y-4">
          {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">USN</label>
            <input type="text" required value={usn} onChange={(e) => setUsn(e.target.value)}
              className="w-full bg-white/5 border border-[#1e1e35] rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
              placeholder="e.g. 1VT21CS001" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-[#1e1e35] rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-violet-900/30">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-slate-600 text-sm mt-4">
          No account? <Link href="/signup" className="text-violet-400 hover:text-violet-300">Sign up</Link>
        </p>
        <p className="text-center text-slate-600 text-xs mt-2">
          Admin? <Link href="/login/admin" className="text-slate-500 hover:text-slate-300">Admin login</Link>
        </p>
      </div>
    </main>
  )
}
