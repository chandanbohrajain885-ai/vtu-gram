import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:admin@vtugram.app'

// Base64url helpers
function base64urlToUint8(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - str.length % 4)
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from([...bin].map(c => c.charCodeAt(0)))
}

function uint8ToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeVapidHeaders(endpoint: string) {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const now = Math.floor(Date.now() / 1000)

  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud: audience, exp: now + 43200, sub: VAPID_SUBJECT }

  const enc = new TextEncoder()
  const headerB64 = uint8ToBase64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = uint8ToBase64url(enc.encode(JSON.stringify(payload)))
  const sigInput = `${headerB64}.${payloadB64}`

  const privKeyBytes = base64urlToUint8(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(sigInput)
  )
  const jwt = `${sigInput}.${uint8ToBase64url(new Uint8Array(sig))}`

  return {
    Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/octet-stream',
    TTL: '86400',
  }
}

async function encryptPayload(payload: string, p256dh: string, auth: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const payloadBytes = enc.encode(payload)

  const receiverPublicKey = await crypto.subtle.importKey(
    'raw', base64urlToUint8(p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  )

  const senderKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveKey', 'deriveBits']
  )

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey },
    senderKeyPair.privateKey, 256
  )

  const authBytes = base64urlToUint8(auth)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const senderPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKeyPair.publicKey)
  )

  // HKDF for content encryption key and nonce
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits'])

  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: enc.encode('Content-Encoding: auth\0') },
    hkdfKey, 256
  )

  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])

  const keyInfo = new Uint8Array([...enc.encode('Content-Encoding: aesgcm\0'), 0, 65, ...senderPublicKeyRaw, 0, 65, ...base64urlToUint8(p256dh)])
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0'), 0, 65, ...senderPublicKeyRaw, 0, 65, ...base64urlToUint8(p256dh)])

  const [keyBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkKey, 128),
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96),
  ])

  const aesKey = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt'])
  const padded = new Uint8Array([0, 0, ...payloadBytes])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, aesKey, padded)

  // Build the final body: salt(16) + rs(4) + keyid_len(1) + sender_pub(65) + ciphertext
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)
  const body = new Uint8Array([...salt, ...rs, 65, ...senderPublicKeyRaw, ...new Uint8Array(encrypted)])
  return body
}

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()
    if (!record?.receiver_id || !record?.content || !record?.sender_id) {
      return new Response('missing fields', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get receiver's push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', record.receiver_id)

    if (!subs || subs.length === 0) return new Response('no subs', { status: 200 })

    // Get sender name
    const { data: sender } = await supabase
      .from('profiles').select('name').eq('id', record.sender_id).single()

    const payload = JSON.stringify({
      title: sender?.name ?? 'VTU GRAM',
      body: record.content.length > 80 ? record.content.slice(0, 80) + '...' : record.content,
      url: `/dashboard/student/chat/${record.sender_id}`,
      tag: `msg-${record.sender_id}`,
    })

    await Promise.allSettled(
      subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        const headers = await makeVapidHeaders(sub.endpoint)
        const body = await encryptPayload(payload, sub.p256dh, sub.auth)
        await fetch(sub.endpoint, { method: 'POST', headers, body })
      })
    )

    return new Response('ok', { status: 200 })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
