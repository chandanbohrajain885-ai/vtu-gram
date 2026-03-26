'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if dismissed before
    if (localStorage.getItem('pwa-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShow(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    setInstalling(true)
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setShow(false)
    }
    setInstalling(false)
    setPrompt(null)
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="glass rounded-2xl border border-violet-700/40 p-4 shadow-2xl shadow-violet-900/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
            <span className="text-white font-black text-lg">V</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100">Install VTU GRAM</p>
            <p className="text-xs text-slate-400">Add to home screen for the best experience</p>
          </div>
          <button onClick={handleDismiss} className="text-slate-600 hover:text-slate-400 text-lg leading-none shrink-0">✕</button>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 text-white text-sm font-bold transition-all shadow-md shadow-violet-900/30"
        >
          {installing ? 'Installing...' : '📲 Install App'}
        </button>
      </div>
    </div>
  )
}
