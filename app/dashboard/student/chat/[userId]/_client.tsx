'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Message, type Profile } from '@/lib/supabase'

type OtherUser = Pick<Profile, 'id' | 'name' | 'avatar_url' | 'usn'>
type MenuState = { msgId: string; mine: boolean } | null

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
  const [menu, setMenu] = useState<MenuState>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [connections, setConnections] = useState<OtherUser[]>([])
  const [iFollow, setIFollow] = useState(false)
  const [togglingFollow, setTogglingFollow] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const myIdRef = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      myIdRef.current = user.id
      setMyId(user.id)
      loadOther()
      loadMessages(user.id)
      loadConnections(user.id)
      markRead(user.id)
      checkFollow(user.id)

      const channel = supabase.channel(`convo-${user.id}-${otherId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
        }, (payload) => {
          const msg = payload.new as Message
          const uid = myIdRef.current
          const isRelevant =
            (msg.sender_id === uid && msg.receiver_id === otherId) ||
            (msg.sender_id === otherId && msg.receiver_id === uid)
          if (!isRelevant) return
          setMessages((prev) => {
            // Dedupe: if real id already exists skip, also replace any temp with same content+sender
            if (prev.find(m => m.id === msg.id)) return prev
            // Remove matching temp message (same sender+content sent within last 5s)
            const filtered = prev.filter(m => {
              if (!m.id.startsWith('temp-')) return true
              const isRecent = Date.now() - parseInt(m.id.replace('temp-', '')) < 5000
              return !(m.sender_id === msg.sender_id && m.content === msg.content && isRecent)
            })
            return [...filtered, msg]
          })
          if (msg.receiver_id === uid) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {})
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'messages',
        }, (payload) => {
          const updated = payload.new as Message
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m))
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [otherId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function markRead(uid: string) {
    await supabase.from('messages').update({ read_at: new Date().toISOString() })
      .eq('receiver_id', uid).eq('sender_id', otherId).is('read_at', null)
  }

  async function checkFollow(uid: string) {
    const { data } = await supabase.from('follows')
      .select('id').eq('follower_id', uid).eq('following_id', otherId).maybeSingle()
    setIFollow(!!data)
  }

  async function toggleFollow() {
    if (!myId) return
    setTogglingFollow(true)
    try {
      if (iFollow) {
        await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', otherId)
        setIFollow(false)
      } else {
        await supabase.from('follows').insert({ follower_id: myId, following_id: otherId })
        setIFollow(true)
      }
    } finally { setTogglingFollow(false) }
  }

  async function loadOther() {
    const { data } = await supabase.from('profiles').select('id, name, avatar_url, usn').eq('id', otherId).single()
    if (data) setOther(data as OtherUser)
  }

  async function loadConnections(uid: string) {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', uid),
      supabase.from('follows').select('follower_id').eq('following_id', uid),
    ])
    const aSet = new Set((a ?? []).map((r: { following_id: string }) => r.following_id))
    const bSet = new Set((b ?? []).map((r: { follower_id: string }) => r.follower_id))
    const mutual = [...aSet].filter(id => bSet.has(id) && id !== uid)
    if (!mutual.length) return
    const { data } = await supabase.from('profiles').select('id, name, avatar_url, usn').in('id', mutual)
    setConnections((data ?? []) as OtherUser[])
  }

  async function loadMessages(uid: string) {
    setLoading(true)
    try {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as Message[])
    } finally { setLoading(false) }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !myId || sending) return

    // If not following: allow only 1 message total
    if (!iFollow) {
      const sentCount = messages.filter(m => m.sender_id === myId && !m.deleted_for_sender && !m.deleted_for_everyone).length
      if (sentCount >= 1) return
    }

    setSending(true)
    const content = text.trim()
    const replyId = replyTo?.id ?? null
    setText('')
    setReplyTo(null)

    // Optimistic: show message immediately
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      sender_id: myId,
      receiver_id: otherId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      deleted_for_everyone: false,
      deleted_for_sender: false,
      deleted_for_receiver: false,
      edited: false,
      reply_to_id: replyId ?? null,
      forwarded_from: null,
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: otherId, content, reply_to_id: replyId,
      }).select().single()

      if (!error && data) {
        // Replace temp with real
        setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m))
      } else {
        // Remove temp on error
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setText(content)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(content)
    } finally {
      setSending(false)
    }
  }

  async function saveEdit() {
    if (!editingId || !editText.trim()) return
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: editText.trim(), edited: true } : m))
    setEditingId(null)
    setEditText('')
    setMenu(null)
    await supabase.from('messages').update({ content: editText.trim(), edited: true }).eq('id', editingId)
  }

  async function deleteForMe(msg: Message) {
    const field = msg.sender_id === myId ? 'deleted_for_sender' : 'deleted_for_receiver'
    // Optimistic remove
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    setMenu(null)
    await supabase.from('messages').update({ [field]: true }).eq('id', msg.id)
  }

  async function deleteForEveryone(msg: Message) {
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_for_everyone: true, content: 'This message was deleted' } : m))
    setMenu(null)
    await supabase.from('messages').update({ deleted_for_everyone: true, content: 'This message was deleted' }).eq('id', msg.id)
  }

  async function clearChat() {
    if (!myId) return
    setMessages([])
    setMenu(null)
    await Promise.all([
      supabase.from('messages').update({ deleted_for_sender: true }).eq('sender_id', myId).eq('receiver_id', otherId),
      supabase.from('messages').update({ deleted_for_receiver: true }).eq('receiver_id', myId).eq('sender_id', otherId),
    ])
  }

  async function forwardTo(targetId: string) {
    if (!forwardMsg || !myId) return
    setForwardMsg(null)
    const { data } = await supabase.from('messages').insert({
      sender_id: myId, receiver_id: targetId,
      content: forwardMsg.content, forwarded_from: forwardMsg.id,
    }).select().single()
    // If forwarding to same convo, add optimistically (realtime will also fire but deduped)
    if (data && targetId === otherId) {
      setMessages(prev => prev.find(m => m.id === (data as Message).id) ? prev : [...prev, data as Message])
    }
  }

  const visible = messages.filter((m) => {
    if (m.deleted_for_everyone) return true
    if (m.sender_id === myId && m.deleted_for_sender) return false
    if (m.receiver_id === myId && m.deleted_for_receiver) return false
    return true
  })

  return (
    <div className="flex flex-col grad-bg" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="glass border-b border-[#1e1e35] px-4 py-3 flex items-center gap-3 shrink-0 z-20">
        <Link href="/dashboard/student/chat" className="text-slate-400 hover:text-slate-200 text-xl leading-none">←</Link>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
          {other?.avatar_url ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{other?.name ?? '...'}</p>
          <p className="text-xs text-slate-500">{other?.usn ?? ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleFollow} disabled={togglingFollow}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50 ${
              iFollow
                ? 'border border-slate-700 text-slate-400 hover:border-red-700/50 hover:text-red-400'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-900/30'
            }`}>
            {togglingFollow ? '...' : iFollow ? 'Unfollow' : 'Follow'}
          </button>
          <button onClick={clearChat} className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 px-3 py-1.5 rounded-lg transition-all">
            Clear
          </button>
        </div>
      </header>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0" onClick={() => setMenu(null)}>
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-10">No messages yet. Say hi! 👋</p>
        ) : visible.map((msg) => {
          const mine = msg.sender_id === myId
          const isDeleted = msg.deleted_for_everyone
          const replySource = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null
          const isMenuOpen = menu?.msgId === msg.id

          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="relative max-w-[78%]">
                {/* Forwarded label */}
                {msg.forwarded_from && !isDeleted && (
                  <p className={`text-[10px] text-slate-500 mb-0.5 ${mine ? 'text-right' : 'text-left'}`}>↪ Forwarded</p>
                )}
                {/* Reply preview */}
                {replySource && !isDeleted && (
                  <div className={`text-xs px-3 py-1.5 mb-0.5 rounded-xl border-l-2 border-violet-500 bg-white/5 text-slate-400 truncate`}>
                    ↩ {replySource.deleted_for_everyone ? 'Deleted' : replySource.content}
                  </div>
                )}
                {/* Bubble */}
                <div
                  onClick={(e) => { e.stopPropagation(); if (!isDeleted) setMenu(isMenuOpen ? null : { msgId: msg.id, mine }) }}
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer ${
                    isDeleted ? 'bg-white/5 text-slate-500 italic border border-[#1e1e35]'
                    : mine ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-md shadow-violet-900/30'
                    : 'glass text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.edited && !isDeleted && <span className="text-[10px] opacity-50 ml-1">edited</span>}
                </div>

                {/* Context menu */}
                {isMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-50 top-full mt-1 glass rounded-xl shadow-xl border border-[#1e1e35] py-1 w-48 ${mine ? 'right-0' : 'left-0'}`}
                  >
                    <MenuItem icon="↩" label="Reply" onClick={() => { setReplyTo(msg); setMenu(null); inputRef.current?.focus() }} />
                    <MenuItem icon="↪" label="Forward" onClick={() => { setForwardMsg(msg); setMenu(null) }} />
                    {mine && <MenuItem icon="✏️" label="Edit" onClick={() => { setEditingId(msg.id); setEditText(msg.content); setMenu(null) }} />}
                    <MenuItem icon="🗑" label="Delete for me" red onClick={() => deleteForMe(msg)} />
                    {mine && <MenuItem icon="🗑" label="Delete for everyone" red onClick={() => deleteForEveryone(msg)} />}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="shrink-0 glass border-t border-[#1e1e35] px-4 py-2 flex items-center gap-3">
          <div className="flex-1 border-l-2 border-violet-500 pl-3 min-w-0">
            <p className="text-xs text-violet-400 font-medium">Replying to</p>
            <p className="text-xs text-slate-400 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-slate-300 text-lg shrink-0">✕</button>
        </div>
      )}

      {/* Edit bar */}
      {editingId && (
        <div className="shrink-0 glass border-t border-[#1e1e35] px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-violet-400 shrink-0 font-medium">Edit:</span>
          <input value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus
            className="flex-1 bg-white/5 border border-[#1e1e35] rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-violet-500 min-w-0" />
          <button onClick={saveEdit} className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg shrink-0">Save</button>
          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-200 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* Input */}
      {!editingId && (() => {
        const sentCount = messages.filter(m => m.sender_id === myId && !m.deleted_for_sender && !m.deleted_for_everyone).length
        const blocked = !iFollow && sentCount >= 1
        return blocked ? (
          <div className="shrink-0 glass border-t border-[#1e1e35] px-4 py-3 text-center">
            <p className="text-xs text-slate-500">
              Follow <span className="text-violet-400">{other?.name}</span> to send more messages.
            </p>
            <button onClick={toggleFollow} disabled={togglingFollow}
              className="mt-2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs rounded-lg font-medium">
              {togglingFollow ? '...' : 'Follow Now'}
            </button>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="shrink-0 glass border-t border-[#1e1e35] px-3 py-3 flex gap-2 items-center">
            <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? 'Write a reply...' : 'Type a message...'}
              className="flex-1 bg-white/5 border border-[#1e1e35] rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors min-w-0"
            />
            <button type="submit" disabled={sending || !text.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 disabled:opacity-40 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        )
      })()}

      {/* Forward modal */}
      {forwardMsg && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4" onClick={() => setForwardMsg(null)}>
          <div className="w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-2xl border border-[#1e1e35] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-200 mb-1">Forward to</p>
            <p className="text-xs text-slate-500 mb-4 truncate">"{forwardMsg.content}"</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {connections.length === 0
                ? <p className="text-slate-500 text-sm text-center py-4">No connections available.</p>
                : connections.map((c) => (
                  <button key={c.id} onClick={() => forwardTo(c.id)}
                    className="w-full flex items-center gap-3 glass hover:border-violet-500/40 rounded-xl px-3 py-2.5 transition-all">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>👤</span>}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.usn ?? ''}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, red }: { icon: string; label: string; onClick: () => void; red?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors ${red ? 'text-red-400' : 'text-slate-300'}`}>
      <span>{icon}</span>{label}
    </button>
  )
}
