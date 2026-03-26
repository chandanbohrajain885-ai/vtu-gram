import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen grad-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center max-w-md relative z-10">
        <div className="mb-2 inline-flex items-center gap-2 bg-violet-600/10 border border-violet-700/30 rounded-full px-4 py-1.5 text-xs text-violet-300 mb-6">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
          VTU Digital Academic Platform
        </div>

        <h1 className="text-6xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-400 bg-clip-text text-transparent mb-4 leading-none">
          VTU GRAM
        </h1>
        <p className="text-slate-400 text-base mb-10 leading-relaxed">
          Your subjects. Your reels. Your notes.<br />All in one place.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/login"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-sm transition-all shadow-lg shadow-violet-900/40">
            Sign In
          </Link>
          <Link href="/signup"
            className="w-full py-3.5 rounded-2xl glass border border-[#1e1e35] hover:border-violet-600/50 text-slate-300 font-semibold text-sm transition-all">
            Create Account
          </Link>
          <Link href="/login/admin"
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors mt-1">
            Admin login →
          </Link>
        </div>
      </div>
    </main>
  )
}
