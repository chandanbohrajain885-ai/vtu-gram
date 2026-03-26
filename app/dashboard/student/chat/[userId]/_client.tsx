'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Message, type Profile } from '@/lib/supabase'

type OtherUser = Pick<Profile, 'id' | 'name' | 'avatar_url' | 'usn'>

export default function ConvoClient() {
  const router = useRouter()
  const params = useParams()
  const otherId = params?.userId as string

  const [myId, setMyId] = useState<string | null>(null)
  const [other, setOther] = useState<OtherUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      loadOther()
      loadMessages(user.id)
      // realtime subscription
      const channel = supabase
        .channel(`chat-${user.id}-${otherId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === otherId) {
            setMessages((prev) => [...prev, msg])
          }
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [otherId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadOther() {
    const { data } = await supabase
      .from('profiles').select('id, name, avatar_url, usn').eq('id', otherId).single()
    if (data) setOther(data as OtherUser)
  }

  async function loadMessages(uid: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as Message[])
    } catch { setMessages([]) }
    finally { setLoading(false) }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !myId) return
    setSending(true)
    const content = text.trim()
    setText('')
    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: otherId, content,
      }).select().single()
      if (!error && data) setMessages((prev) => [...prev, data as Message])
    } catch { /* silent */ }
    finally { setSending(false) }
  }

  return (
    <div className="flex flex-col h-screen grad-bg">
      {/* Header */}
      <header className="glass border-b border-[#1e1e35] px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/dashboard/student/chat" className="text-slate-400 hover:text-slate-200 transition-colors text-lg">
          ←
        </Link>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-900/40 border border-slate-700 flex items-center justify-center shrink-0">
          {other?.avatar_url
            ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span>👤</span>}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{other?.name ?? '...'}</p>
          <p className="text-xs text-slate-500">{other?.usn ?? ''}</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-10">No messages yet. Say hi! 👋</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === myId
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  mine
                    ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-lg shadow-violet-900/30'
                    : 'glass text-slate-200 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage}
        className="shrink-0 glass border-t border-[#1e1e35] px-4 py-3 flex gap-3 items-center">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-[#1e1e35] rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button type="submit" disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 flex items-center justify-center transition-all shadow-lg shadow-violet-900/30 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
