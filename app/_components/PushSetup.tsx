'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Your VAPID public key
const VAPID_PUBLIC_KEY = '5RQPce_njjTtZRbzz9d3t2WCXSvsWNmX9l8zPMOLzO-43vy0Q9EJKSMbb3U7P9UPOmS5YOwNX9tK6MPwfSrDjA'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function setup() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Request permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const reg = await navigator.serviceWorker.ready

        // Check existing subscription
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        }

        const json = sub.toJSON()
        const keys = json.keys as { p256dh: string; auth: string }

        // Save to Supabase
        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }, { onConflict: 'user_id,endpoint' })
      } catch { /* silent — user may have denied */ }
    }

    // Delay slightly so it doesn't fire on first load before user interacts
    const t = setTimeout(setup, 3000)
    return () => clearTimeout(t)
  }, [])

  return null
}
