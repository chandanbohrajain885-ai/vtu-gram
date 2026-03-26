'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = '5RQPce_njjTtZRbzz9d3t2WCXSvsWNmX9l8zPMOLzO-43vy0Q9EJKSMbb3U7P9UPOmS5YOwNX9tK6MPwfSrDjA'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = sub.toJSON()
    const keys = json.keys as { p256dh: string; auth: string }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'user_id,endpoint' })

    return !error
  } catch { return false }
}

export default function PushSetup() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'granted') {
      // Already granted — subscribe silently
      subscribePush().then(ok => { if (ok) setStatus('subscribed') })
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied'); return
    }
    // Show prompt after 2s
    const t = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(t)
  }, [])

  async function handleEnable() {
    setShow(false)
    const ok = await subscribePush()
    setStatus(ok ? 'subscribed' : 'denied')
  }

  if (!show || status !== 'idle') return null

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50">
      <div className="glass rounded-2xl border border-violet-700/40 p-4 shadow-2xl shadow-violet-900/40">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100">Enable Notifications</p>
            <p className="text-xs text-slate-400 mt-0.5">Get alerts for new messages even when the app is closed.</p>
          </div>
          <button onClick={() => setShow(false)} className="text-slate-600 hover:text-slate-400 text-lg leading-none shrink-0">✕</button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleEnable}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold transition-all">
            Enable
          </button>
          <button onClick={() => setShow(false)}
            className="px-4 py-2 rounded-xl glass text-slate-400 text-xs transition-all">
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
