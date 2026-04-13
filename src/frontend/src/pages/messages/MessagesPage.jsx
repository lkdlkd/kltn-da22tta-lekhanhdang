import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import { Send, MessageCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { getConversationsApi, createConversationApi, getMessagesApi } from '@/services/chatService'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

dayjs.extend(relativeTime)
dayjs.locale('vi')

// ── Helpers ────────────────────────────────────────────────────────────────

function Avatar({ name = '?', size = 'sm', online = false }) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  const dotClass = size === 'sm' ? 'h-2.5 w-2.5 -bottom-0 -right-0' : 'h-3 w-3 bottom-0 right-0'
  return (
    <div className="relative shrink-0">
      <div className={cn('flex items-center justify-center rounded-full bg-primary/20 font-bold text-primary', sizeClass)}>
        {(name || '?')[0].toUpperCase()}
      </div>
      {/* Online dot */}
      {online !== undefined && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-background',
            dotClass,
            online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
      )}
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        …
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const user = useSelector((state) => state.auth?.user)
  const [searchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  // Online & Typing state
  const [onlineUsers, setOnlineUsers] = useState({}) // { userId: bool }
  const [typingUsers, setTypingUsers] = useState({}) // { conversationId: Set<userId> }

  const bottomRef = useRef(null)
  const typingTimerRef = useRef(null)
  const isTypingRef = useRef(false)
  const socket = getSocket()

  // ── Load conversations ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect()
    if (user?._id) socket.emit('join_user', user._id)

    getConversationsApi()
      .then((res) => {
        const convs = res.data?.data?.conversations || []
        setConversations(convs)

        // Check online status for all conversation partners
        const partnerIds = convs
          .flatMap((c) => c.participants || [])
          .filter((p) => String(p._id) !== String(user?._id))
          .map((p) => String(p._id))
        const uniqueIds = [...new Set(partnerIds)]
        if (uniqueIds.length > 0) {
          socket.emit('check_online', { userIds: uniqueIds }, (result) => {
            setOnlineUsers((prev) => ({ ...prev, ...result }))
          })
        }

        // Auto-open conversation from query params
        const recipientId = searchParams.get('to')
        const roomId = searchParams.get('room')
        if (recipientId) {
          createConversationApi(recipientId, roomId)
            .then((r) => {
              const conv = r.data?.data?.conversation
              if (conv) {
                setConversations((prev) => {
                  const exists = prev.some((c) => c._id === conv._id)
                  return exists ? prev : [conv, ...prev]
                })
                setActiveConvId(conv._id)
              }
            })
            .catch(() => {})
        }
      })
      .finally(() => setLoadingConvs(false))
  }, [])

  // ── Load messages when active conversation changes ────────────────────
  useEffect(() => {
    if (!activeConvId) return
    setLoadingMsgs(true)
    getMessagesApi(activeConvId)
      .then((res) => setMessages(res.data?.data?.messages || []))
      .catch(() => toast.error('Không thể tải tin nhắn'))
      .finally(() => setLoadingMsgs(false))

    socket.emit('join_conversation', activeConvId)
  }, [activeConvId])

  // ── Real-time socket events ───────────────────────────────────────────
  useEffect(() => {
    // New message
    const onMessage = (msg) => {
      if (msg.conversation === activeConvId) {
        setMessages((prev) => [...prev, msg])
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === msg.conversation ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt } : c
        )
      )
      // Clear typing for sender
      if (msg.sender?._id) {
        setTypingUsers((prev) => {
          const s = new Set(prev[msg.conversation] || [])
          s.delete(String(msg.sender._id))
          return { ...prev, [msg.conversation]: s }
        })
      }
    }

    // Online / offline
    const onOnline = ({ userId }) => setOnlineUsers((prev) => ({ ...prev, [userId]: true }))
    const onOffline = ({ userId }) => setOnlineUsers((prev) => ({ ...prev, [userId]: false }))

    // Typing start
    const onTypingStart = ({ conversationId, userId }) => {
      if (String(userId) === String(user?._id)) return
      setTypingUsers((prev) => {
        const s = new Set(prev[conversationId] || [])
        s.add(String(userId))
        return { ...prev, [conversationId]: s }
      })
    }

    // Typing stop
    const onTypingStop = ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const s = new Set(prev[conversationId] || [])
        s.delete(String(userId))
        return { ...prev, [conversationId]: s }
      })
    }

    socket.on('receive_message', onMessage)
    socket.on('user_online', onOnline)
    socket.on('user_offline', onOffline)
    socket.on('typing_start', onTypingStart)
    socket.on('typing_stop', onTypingStop)

    return () => {
      socket.off('receive_message', onMessage)
      socket.off('user_online', onOnline)
      socket.off('user_offline', onOffline)
      socket.off('typing_start', onTypingStart)
      socket.off('typing_stop', onTypingStop)
    }
  }, [activeConvId, socket, user?._id])

  // ── Scroll to bottom on new message ──────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Input handlers ────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!activeConvId || !user?._id) return
    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit('typing_start', { conversationId: activeConvId, userId: user._id })
    }
    // Debounce stop
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket.emit('typing_stop', { conversationId: activeConvId, userId: user._id })
    }, 2000)
  }, [activeConvId, user?._id, socket])

  const handleInputChange = (e) => {
    setInput(e.target.value)
    emitTyping()
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim() || !activeConvId || !user) return
    socket.emit('send_message', {
      conversationId: activeConvId,
      senderId: user._id,
      content: input.trim(),
    })
    // Stop typing locally
    clearTimeout(typingTimerRef.current)
    isTypingRef.current = false
    setInput('')
  }

  // ── Derived ───────────────────────────────────────────────────────────
  const activeConv = conversations.find((c) => c._id === activeConvId)
  const otherUser = activeConv?.participants?.find((p) => String(p._id) !== String(user?._id))
  const isOtherOnline = otherUser ? onlineUsers[String(otherUser._id)] : false
  const isOtherTyping = activeConvId
    ? (typingUsers[activeConvId]?.size || 0) > 0
    : false

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex overflow-hidden border-t" style={{ height: 'calc(100svh - var(--navbar-h))' }}>
      {/* ── Conversation List ─────────────────────────────────────────── */}
      <div className={cn('w-full shrink-0 overflow-y-auto border-r bg-background md:w-72 lg:w-80', activeConvId && 'hidden md:block')}>
        <div className="border-b px-4 py-3">
          <h1 className="font-semibold">Tin nhắn</h1>
        </div>
        {loadingConvs ? (
          <div className="space-y-1 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 rounded-lg p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Chưa có cuộc hội thoại nào
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {conversations.map((conv) => {
              const other = conv.participants?.find((p) => String(p._id) !== String(user?._id))
              const isActive = conv._id === activeConvId
              const isOnline = other ? onlineUsers[String(other._id)] : false
              const hasTyping = (typingUsers[conv._id]?.size || 0) > 0

              return (
                <button
                  key={conv._id}
                  onClick={() => setActiveConvId(conv._id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                    isActive ? 'bg-primary/10' : 'hover:bg-muted/60'
                  )}
                >
                  <Avatar name={other?.name} online={isOnline} />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{other?.name || 'Người dùng'}</p>
                    <p className={cn('truncate text-xs', hasTyping ? 'text-primary italic' : 'text-muted-foreground')}>
                      {hasTyping
                        ? 'Đang nhập...'
                        : conv.lastMessage?.content || conv.room?.title || 'Bắt đầu hội thoại'}
                    </p>
                  </div>
                  {conv.lastMessageAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dayjs(conv.lastMessageAt).fromNow(true)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Chat Window ──────────────────────────────────────────────── */}
      <div className={cn('flex flex-1 flex-col', !activeConvId && 'hidden md:flex')}>
        {!activeConvId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p>Chọn một cuộc hội thoại để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
              <button className="md:hidden" onClick={() => setActiveConvId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar name={otherUser?.name} size="md" online={isOtherOnline} />
              <div>
                <p className="font-semibold leading-tight">{otherUser?.name}</p>
                {/* Online status / typing */}
                <p className="text-xs text-muted-foreground h-4">
                  {isOtherTyping ? (
                    <span className="text-primary italic animate-pulse">Đang nhập tin nhắn...</span>
                  ) : isOtherOnline ? (
                    <span className="text-emerald-600">● Online</span>
                  ) : (
                    <span className="text-muted-foreground/60">● Offline</span>
                  )}
                </p>
                {activeConv?.room && (
                  <Link to={`/rooms/${activeConv.room.slug}`} className="text-xs text-primary hover:underline">
                    {activeConv.room.title}
                  </Link>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className={cn('h-10 w-48 rounded-2xl', i % 2 === 0 ? '' : 'ml-auto')} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Bắt đầu cuộc trò chuyện</p>
              ) : (
                messages.map((msg) => {
                  const isMine = String(msg.sender?._id || msg.sender) === String(user?._id)
                  return (
                    <div key={msg._id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      {!isMine && <Avatar name={msg.sender?.name} size="sm" />}
                      <div
                        className={cn(
                          'mx-2 max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                          isMine
                            ? 'rounded-tr-sm bg-primary text-primary-foreground'
                            : 'rounded-tl-sm bg-muted'
                        )}
                      >
                        <p>{msg.content}</p>
                        <p className={cn('mt-1 text-[10px]', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                          {dayjs(msg.createdAt).format('HH:mm')}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Typing bubble */}
              {isOtherTyping && <TypingBubble />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2 border-t bg-background p-3">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Nhập tin nhắn..."
                className="flex-1"
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
