'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, type Message, type Profile } from '@/lib/supabase'

type OtherUser = Pick<Profile, 'id' | 'name' | 'avatar_url' | 'usn'>
type MsgAction = { msg: Message; type: 'menu' | 'edit' | 'reply' | 'forward' } | null

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
  const [action, setAction] = useState<MsgAction>(null)
  const [editText, setEditText] = useState('')
  const [forwardTarget, setForwardTarget] = useState<string | null>(null)
  const [connections, setConnections] = useState<OtherUser[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      loadOther()
      loadMessages(user.id)
      loadConnections(user.id)

      // mark messages read
      supabase.from('messages').update({ read_at: new Date().toISOString() })
        .eq('receiver_id', user.id).eq('sender_id', otherId).is('read_at', null)
        .then(() => {})

      const channel = supabase.channel(`chat-${user.id}-${otherId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === otherId) {
            setMessages((prev) => [...prev, msg])
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

  async function loadOther() {
    const { data } = await supabase.from('profiles').select('id, name, avatar_url, usn').eq('id', otherId).single()
    if (data) setOther(data as OtherUser)
  }

  async function loadConnections(uid: string) {
    const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', uid),
      supabase.from('follows').select('follower_id').eq('following_id', uid),
    ])
    const iFollowSet = new Set((iFollow ?? []).map((r: { following_id: string }) => r.following_id))
    const theyFollowSet = new Set((theyFollow ?? []).map((r: { follower_id: string }) => r.follower_id))
    const mutualIds = [...iFollowSet].filter(id => theyFollowSet.has(id) && id !== uid)
    if (mutualIds.length === 0) return
    const { data } = await supabase.from('profiles').select('id, name, avatar_url, usn').in('id', mutualIds)
    setConnections((data ?? []) as OtherUser[])
  }

  async function loadMessages(uid: string) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('messages').select('*')
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

    // If in reply mode
    const replyId = action?.type === 'reply' ? action.msg.id : null
    if (action?.type === 'reply') setAction(null)

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: otherId, content,
        reply_to_id: replyId ?? null,
      }).select().single()
      if (!error && data) setMessages((prev) => [...prev, data as Message])
    } catch { }
    finally { setSending(false) }
  }

  async function handleEdit() {
    if (!action || action.type !== 'edit' || !editText.trim()) return
    await supabase.from('messages').update({ content: editText.trim(), edited: true }).eq('id', action.msg.id)
    setAction(null)
    setEditText('')
  }

  async function deleteForMe(msg: Message) {
    const mine = msg.sender_id === myId
    if (mine) {
      await supabase.from('messages').update({ deleted_for_sender: true }).eq('id', msg.id)
    } else {
      await supabase.from('messages').update({ deleted_for_receiver: true }).eq('id', msg.id)
    }
    setMessages((prev) => prev.filter((m) => m.id !== msg.id))
    setAction(null)
  }

  async function deleteForEveryone(msg: Message) {
    await supabase.from('messages').update({ deleted_for_everyone: true, content: 'This message was deleted' }).eq('id', msg.id)
    setAction(null)
  }

  async function deleteFullChat() {
    if (!myId) return
    // mark all as deleted for me
    await supabase.from('messages')
      .update({ deleted_for_sender: true })
      .eq('sender_id', myId).eq('receiver_id', otherId)
    await supabase.from('messages')
      .update({ deleted_for_receiver: true })
      .eq('receiver_id', myId).eq('sender_id', otherId)
    setMessages([])
    setAction(null)
  }

  async function forwardMessage(targetId: string) {
    if (!action || !myId) return
    const content = action.msg.content
    const { data } = await supabase.from('messages').insert({
      sender_id: myId, receiver_id: targetId, content,
      forwarded_from: action.msg.id,
    }).select().single()
    if (data && targetId === otherId) setMessages((prev) => [...prev, data as Message])
    setForwardTarget(null)
    setAction(null)
  }

  // Filter visible messages
  const visible = messages.filter((m) => {
    if (m.deleted_for_everyone) return true // show "deleted" placeholder
    if (m.sender_id === myId && m.deleted_for_sender) return false
    if (m.receiver_id === myId && m.deleted_for_receiver) return false
    return true
  })

  const replyMsg = action?.type === 'reply' ? action.msg : null
  const replyPreview = messages.find((m) => m.id)

  return (
    <div className="flex flex-col h-screen grad-bg">
      {/* Header */}
      <header className="glass border-b border-[#1e1e35] px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/dashboard/student/chat" className="text-slate-400 hover:text-slate-200 text-lg">←</Link>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
          {other?.avatar_url ? <img src={other.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>👤</span>}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-200">{other?.name ?? '...'}</p>
          <p className="text-xs text-slate-500">{other?.usn ?? ''}</p>
        </div>
        <button onClick={deleteFullChat}
          className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/60 px-3 py-1.5 rounded-lg transition-all">
          Clear Chat
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" onClick={() => setAction(null)}>
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-10">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-10">No messages yet. Say hi! 👋</p>
        ) : (
          visible.map((msg) => {
            const mine = msg.sender_id === myId
            const isDeleted = msg.deleted_for_everyone
            const replyTo = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null

            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
                <div className="max-w-[78%]">
                  {/* Reply preview */}
                  {replyTo && !isDeleted && (
                    <div className={`text-xs px-3 py-1.5 rounded-t-xl mb-0.5 border-l-2 border-violet-500 bg-white/5 text-slate-400 truncate ${mine ? 'ml-auto' : ''}`}>
                      ↩ {replyTo.deleted_for_everyone ? 'Deleted message' : replyTo.content}
                    </div>
                  )}
                  {/* Forwarded label */}
                  {msg.forwarded_from && !isDeleted && (
                    <p className={`text-[10px] text-slate-500 mb-0.5 ${mine ? 'text-right' : 'text-left'}`}>↪ Forwarded</p>
                  )}

                  <div
                    className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer select-none ${
                      isDeleted
                        ? 'bg-white/5 text-slate-500 italic border border-[#1e1e35]'
                        : mine
                          ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-lg shadow-violet-900/30'
                          : 'glass text-slate-200 rounded-bl-sm'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isDeleted) setAction({ msg, type: 'menu' })
                    }}
                  >
                    {msg.content}
                    {msg.edited && !isDeleted && (
                      <span className="text-[10px] opacity-60 ml-1">edited</span>
                    )}
                  </div>

                  {/* Context menu */}
                  {action?.type === 'menu' && action.msg.id === msg.id && (
                    <div
                      className={`absolute z-50 mt-1 glass rounded-xl shadow-xl border border-[#1e1e35] py-1 min-w-[160px] ${mine ? 'right-0' : 'left-0'}`}
                      style={{ position: 'absolute' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Reply */}
                      <button onClick={() => { setAction({ msg, type: 'reply' }); inputRef.current?.focus() }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2">
                        ↩ Reply
                      </button>
                      {/* Forward */}
                      <button onClick={() => { setForwardTarget('pick'); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2">
                        ↪ Forward
                      </button>
                      {/* Edit — only own recent messages */}
                      {mine && (
                        <button onClick={() => { setEditText(msg.content); setAction({ msg, type: 'edit' }) }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2">
                          ✏️ Edit
                        </button>
                      )}
                      {/* Delete for me */}
                      <button onClick={() => deleteForMe(msg)}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2">
                        🗑 Delete for me
                      </button>
                      {/* Delete for everyone — only sender */}
                      {mine && (
                        <button onClick={() => deleteForEveryone(msg)}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2">
                          🗑 Delete for everyone
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Forward picker modal */}
      {forwardTarget === 'pick' && action && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4" onClick={() => setForwardTarget(null)}>
          <div className="w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-2xl border border-[#1e1e35] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-200 mb-4">Forward to...</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {connections.length === 0
                ? <p className="text-slate-500 text-sm text-center py-4">No connections to forward to.</p>
                : connections.map((c) => (
                  <button key={c.id} onClick={() => forwardMessage(c.id)}
                    className="w-full flex items-center gap-3 glass hover:border-violet-500/40 rounded-xl px-3 py-2.5 transition-all">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>👤</span>}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-200">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.usn ?? ''}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit bar */}
      {action?.type === 'edit' && (
        <div className="shrink-0 glass border-t border-[#1e1e35] px-4 py-2 flex gap-2 items-center">
          <span className="text-xs text-violet-400 shrink-0">Editing</span>
          <input value={editText} onChange={(e) => setEditText(e.target.value)}
            className="flex-1 bg-white/5 border border-[#1e1e35] rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-violet-500"
            autoFocus
          />
          <button onClick={handleEdit}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg transition-colors">Save</button>
          <button onClick={() => setAction(null)}
            className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors">Cancel</button>
        </div>
      )}

      {/* Reply preview bar */}
      {action?.type === 'reply' && (
        <div className="shrink-0 glass border-t border-[#1e1e35] px-4 py-2 flex items-center gap-2">
          <div className="flex-1 border-l-2 border-violet-500 pl-3">
            <p className="text-xs text-violet-400">Replying to</p>
            <p className="text-xs text-slate-400 truncate">{action.msg.content}</p>
          </div>
          <button onClick={() => setAction(null)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Input */}
      {action?.type !== 'edit' && (
        <form onSubmit={sendMessage}
          className="shrink-0 glass border-t border-[#1e1e35] px-4 py-3 flex gap-3 items-center">
          <input ref={inputRef}
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={action?.type === 'reply' ? 'Write a reply...' : 'Type a message...'}
            className="flex-1 bg-white/5 border border-[#1e1e35] rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 flex items-center justify-center transition-all shadow-lg shadow-violet-900/30 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}
