import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = 'mailto:admin@vtugram.app'

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromB64url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - str.length % 4)
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function makeJwt(audience: string): Promise<string> {
  const enc = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const h = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const p = b64url(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })))
  const input = `${h}.${p}`
  const key = await crypto.subtle.importKey(
    'raw', fromB64url(VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(input))
  return `${input}.${b64url(sig)}`
}

async function sendPush(endpoint: string, p256dh: string, auth: string, payload: string): Promise<void> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await makeJwt(audience)

  const enc = new TextEncoder()
  const payloadBytes = enc.encode(payload)

  // Generate sender key pair
  const senderKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey))

  // Import receiver public key
  const receiverPub = await crypto.subtle.importKey(
    'raw', fromB64url(p256dh), { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverPub }, senderKP.privateKey, 256)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authBytes = fromB64url(auth)

  // HKDF PRK
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits'])
  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: enc.encode('Content-Encoding: auth\0') },
    hkdfKey, 256
  )
  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])

  const receiverPubRaw = fromB64url(p256dh)
  const keyInfo = new Uint8Array([...enc.encode('Content-Encoding: aesgcm\0'), 0, 65, ...senderPubRaw, 0, 65, ...receiverPubRaw])
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0'), 0, 65, ...senderPubRaw, 0, 65, ...receiverPubRaw])

  const [keyBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkKey, 128),
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96),
  ])

  const aesKey = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt'])
  const padded = new Uint8Array([0, 0, ...payloadBytes])
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, aesKey, padded))

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const body = new Uint8Array([...salt, ...rs, 65, ...senderPubRaw, ...encrypted])

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${b64url(salt)}`,
      'Crypto-Key': `dh=${b64url(senderPubRaw)};p256ecdsa=${VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
    },
    body,
  })
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const record = body.record
    if (!record || !record.receiver_id || !record.content || !record.sender_id) {
      return new Response('missing fields', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const [{ data: subs }, { data: sender }] = await Promise.all([
      supabase.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', record.receiver_id),
      supabase.from('profiles').select('name').eq('id', record.sender_id).single(),
    ])

    if (!subs || subs.length === 0) {
      return new Response('no subscriptions', { status: 200 })
    }

    const msg = record.content.length > 80 ? record.content.slice(0, 80) + '...' : record.content
    const payload = JSON.stringify({
      title: (sender as { name?: string } | null)?.name ?? 'VTU GRAM',
      body: msg,
      url: `/dashboard/student/chat/${record.sender_id}`,
      tag: `msg-${record.sender_id}`,
    })

    await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        sendPush(s.endpoint, s.p256dh, s.auth, payload)
      )
    )

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
