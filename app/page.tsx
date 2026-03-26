import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="text-5xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            VTU GRAM
          </span>
          <p className="text-slate-400 mt-2 text-sm">
            VTU Digital Academic Platform
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="w-full py-3 rounded-xl border border-slate-700 hover:border-violet-500 text-slate-300 font-semibold transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}
