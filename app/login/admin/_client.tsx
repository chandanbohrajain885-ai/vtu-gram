'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminLoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }
      if (!authData.user) { setError('Login failed.'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', authData.user.id).single()

      if (!profile || profile.role !== 'super_admin') {
        await supabase.auth.signOut()
        setError('This account is not an admin.')
        return
      }
      router.push('/dashboard/super-admin')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">VTU GRAM</span>
          <p className="text-slate-400 text-sm mt-1">Admin login</p>
        </div>
        <form onSubmit={handleLogin} className="bg-[#13131a] rounded-2xl p-6 border border-slate-800 space-y-4">
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              placeholder="admin@example.com" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
            {loading ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          Student?{' '}
          <Link href="/login" className="text-violet-400 hover:text-violet-300">Student login</Link>
        </p>
      </div>
    </main>
  )
}
