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
      // Look up email by USN
      const { data: profileData, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('usn', usn.trim())
        .single()

      if (profileLookupError || !profileData) {
        setError('USN not found. Please check and try again.')
        return
      }

      // Get email from auth — we need to sign in via email
      // Since we can't get email from profiles, we store it or use a workaround:
      // Sign in with USN as identifier by fetching the user's email via admin lookup
      // Instead: store email in profiles table OR use email field
      // Simplest: add email column to profiles and look it up
      const { data: emailData } = await supabase
        .from('profiles')
        .select('email')
        .eq('usn', usn.trim())
        .single()

      const email = (emailData as { email?: string } | null)?.email

      if (!email) {
        setError('Account not found. Please sign up first.')
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) { setError('Incorrect password. Please try again.'); return }
      if (!authData.user) { setError('Login failed. Please try again.'); return }

      if (profileData.role === 'super_admin') {
        router.push('/dashboard/super-admin')
      } else {
        router.push('/dashboard/student')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            VTU GRAM
          </span>
          <p className="text-slate-400 text-sm mt-1">Sign in with your USN</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#13131a] rounded-2xl p-6 border border-slate-800 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-400 mb-1">USN</label>
            <input
              type="text" required value={usn}
              onChange={(e) => setUsn(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="e.g. 1VT21CS001"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-4">
          No account?{' '}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300">Sign up</Link>
        </p>
        <p className="text-center text-slate-500 text-xs mt-2">
          Admin?{' '}
          <Link href="/login/admin" className="text-slate-400 hover:text-slate-300">Admin login</Link>
        </p>
      </div>
    </main>
  )
}
