import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { MessageCircle } from 'lucide-react'

import {
  getConversationsApi,
  createConversationApi,
  getMessagesApi,
  uploadChatMediaApi,
  markConversationReadApi,
} from '@/services/chatService'
import { getSocket } from '@/hooks/useSocket'

import { ConversationList } from './components/ConversationList'
import { ChatHeader } from './components/ChatHeader'
import { MessageBubble, TypingBubble } from './components/MessageBubble'
import { ChatInput } from './components/ChatInput'
import { BookingInChatDialog } from './components/BookingInChatDialog'
import { cn } from '@/lib/utils'

dayjs.extend(relativeTime)
dayjs.locale('vi')

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const user = useSelector((s) => s.auth?.user)
  const [searchParams] = useSearchParams()

  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [msgPage, setMsgPage] = useState(1)
  const [mediaFiles, setMediaFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)

  // Pending lazy conv creation
  const [pendingTo, setPendingTo] = useState(null)
  const [pendingRoom, setPendingRoom] = useState(null)

  const [onlineUsers, setOnlineUsers] = useState({})
  const [typingUsers, setTypingUsers] = useState({})

  const bottomRef = useRef(null)
  const msgContainerRef = useRef(null)   // scroll container
  const topSentinelRef = useRef(null)    // IO sentinel ở đầu messages
  const isLoadingMoreRef = useRef(false) // tránh scroll xuống khi prepend
  // Refs để tránh stale closure trong scroll handler
  const hasMoreRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const msgPageRef = useRef(1)
  const activeConvIdRef = useRef(null)
  const typingTimerRef = useRef(null)
  const isTypingRef = useRef(false)

  const socket = getSocket()

  // ── Mark conversation as read ────────────────────────────────────────────
  const markRead = useCallback((convId) => {
    if (!convId || convId === '__pending__') return
    // Optimistic: zero out locally
    setConversations((prev) =>
      prev.map((c) => c._id === convId ? { ...c, unreadCount: 0 } : c)
    )
    // Tell server
    markConversationReadApi?.(convId).catch(() => { })
  }, [])

  // ── Select conversation ──────────────────────────────────────────────────
  const selectConv = useCallback((convId) => {
    setActiveConvId(convId)
    markRead(convId)
  }, [markRead])

  // ── Load conversations ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket.connected) socket.connect()
    if (user?._id) socket.emit('join_user', user._id)

    getConversationsApi()
      .then((res) => {
        const convs = res.data?.data?.conversations || []
        setConversations(convs)

        const uniqueIds = [...new Set(
          convs
            .flatMap((c) => c.participants || [])
            .filter((p) => String(p._id) !== String(user?._id))
            .map((p) => String(p._id))
        )]
        if (uniqueIds.length) {
          socket.emit('check_online', { userIds: uniqueIds }, (r) => { if (r) setOnlineUsers(r) })
        }
      })
      .catch(() => { })
      .finally(() => setLoadingConvs(false))

    // Auto-open via ?to=
    const toUser = searchParams.get('to')
    const roomId = searchParams.get('room')
    if (toUser) {
      getConversationsApi().then((res) => {
        const convs = res.data?.data?.conversations || []
        const existing = convs.find((c) =>
          c.participants?.some((p) => String(p._id) === String(toUser))
        )
        if (existing) {
          setConversations((prev) =>
            prev.find((c) => c._id === existing._id) ? prev : [existing, ...prev]
          )
          selectConv(existing._id)
        } else {
          setPendingTo(toUser)
          setPendingRoom(roomId)
          setActiveConvId('__pending__')
        }
      }).catch(() => { })
    }
  }, [user?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages (dùng cho cả lần đầu và load more) ───────────────────────
  const loadMessages = useCallback(async (convId, page, prepend = false) => {
    if (page === 1) setLoadingMsgs(true)
    else setLoadingMore(true)

    isLoadingMoreRef.current = prepend // chẹn auto-scroll khi prepend
    try {
      const res = await getMessagesApi(convId, page, 10)
      const newMsgs = res.data?.data?.messages || []
      const more = res.data?.data?.hasMore ?? false
      setHasMore(more)

      if (prepend) {
        const container = msgContainerRef.current
        const prevScrollHeight = container?.scrollHeight || 0
        setMessages((prev) => [...newMsgs, ...prev])
        // Khôi phục scroll position sau khi prepend
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight
          }
          isLoadingMoreRef.current = false
        })
      } else {
        setMessages(newMsgs)
        // Scroll xuống dưới sau khi load lần đầu
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'instant' })
          isLoadingMoreRef.current = false
        })
      }
    } catch {
      isLoadingMoreRef.current = false
    } finally {
      if (page === 1) setLoadingMsgs(false)
      else setLoadingMore(false)
    }
  }, [])

  // ── Load messages when conv changes ─────────────────────────────────────
  useEffect(() => {
    if (!activeConvId || activeConvId === '__pending__') {
      setMessages([])
      setMsgPage(1)
      setHasMore(false)
      return
    }
    setMsgPage(1)
    setHasMore(false)
    socket.emit('join_conversation', activeConvId)
    loadMessages(activeConvId, 1, false)
  }, [activeConvId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── IntersectionObserver: load more khi sentinel ở đầu hiện ra ─────────────
  // Dùng IO thay scroll listener vì hoạt động cả khi content chưa đủ cao để scroll
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const container = msgContainerRef.current
    if (!sentinel || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingMoreRef.current &&
          !isLoadingMoreRef.current
        ) {
          const nextPage = msgPageRef.current + 1
          msgPageRef.current = nextPage // cập nhật ngay, tránh double-load
          setMsgPage(nextPage)
          loadMessages(activeConvIdRef.current, nextPage, true)
        }
      },
      { root: container, threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeConvId, hasMore, loadMessages])

  // Sync refs với state (để IO callback không bị stale)
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  useEffect(() => { msgPageRef.current = msgPage }, [msgPage])
  useEffect(() => { activeConvIdRef.current = activeConvId }, [activeConvId])

  // ── Socket listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const onMsg = (msg) => {
      const convId = msg.conversation?._id || msg.conversation

      if (convId === activeConvId) {
        // Conversation is open — append immediately
        setMessages((prev) => [...prev, msg])
        setConversations((prev) =>
          prev.map((c) =>
            c._id === convId
              ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt, unreadCount: 0 }
              : c
          )
        )
        // mark read on server since we're viewing it
        markRead(convId)
      } else {
        // Conversation not open — increment unread
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === convId)
          if (exists) {
            return prev.map((c) =>
              c._id === convId
                ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt, unreadCount: (c.unreadCount || 0) + 1 }
                : c
            )
          }
          // New conversation arrived — prepend it
          return [{ _id: convId, lastMessage: msg, lastMessageAt: msg.createdAt, unreadCount: 1, participants: [msg.sender].filter(Boolean) }, ...prev]
        })
      }

      // Clear typing for this sender
      if (msg.sender?._id) {
        setTypingUsers((prev) => {
          const s = new Set(prev[convId] || [])
          s.delete(String(msg.sender._id))
          return { ...prev, [convId]: s }
        })
      }
    }

    const onOnline = ({ userId }) => setOnlineUsers((p) => ({ ...p, [userId]: true }))
    const onOffline = ({ userId }) => setOnlineUsers((p) => ({ ...p, [userId]: false }))

    const onTypingStart = ({ conversationId, userId }) => {
      if (String(userId) === String(user?._id)) return
      setTypingUsers((p) => {
        const s = new Set(p[conversationId] || [])
        s.add(String(userId))
        return { ...p, [conversationId]: s }
      })
    }
    const onTypingStop = ({ conversationId, userId }) => {
      setTypingUsers((p) => {
        const s = new Set(p[conversationId] || [])
        s.delete(String(userId))
        return { ...p, [conversationId]: s }
      })
    }

    // Real-time appointment status update
    const onApptUpdate = ({ appointmentId, status }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.messageType === 'appointment' &&
            String(m.appointmentRef?._id || m.appointmentRef) === String(appointmentId)
            ? { ...m, appointmentRef: { ...(m.appointmentRef || {}), status } }
            : m
        )
      )
    }

    socket.on('receive_message', onMsg)
    socket.on('user_online', onOnline)
    socket.on('user_offline', onOffline)
    socket.on('typing_start', onTypingStart)
    socket.on('typing_stop', onTypingStop)
    socket.on('appointment_updated', onApptUpdate)

    return () => {
      socket.off('receive_message', onMsg)
      socket.off('user_online', onOnline)
      socket.off('user_offline', onOffline)
      socket.off('typing_start', onTypingStart)
      socket.off('typing_stop', onTypingStop)
      socket.off('appointment_updated', onApptUpdate)
    }
  }, [activeConvId, socket, user?._id, markRead])

  // ── Auto scroll xuống khi có tin nhắn mới (không scroll khi đang load more) ──
  useEffect(() => {
    if (!isLoadingMoreRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ── Typing emit ──────────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!activeConvId || !user?._id || activeConvId === '__pending__') return
    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit('typing_start', { conversationId: activeConvId, userId: user._id })
    }
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket.emit('typing_stop', { conversationId: activeConvId, userId: user._id })
    }, 2000)
  }, [activeConvId, user?._id, socket])

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault()
    if ((!input.trim() && mediaFiles.length === 0) || !activeConvId || !user) return

    let convId = activeConvId
    let attachments = []

    // Lazy conv creation
    if (convId === '__pending__') {
      if (!pendingTo) return
      try {
        const res = await createConversationApi(pendingTo, pendingRoom)
        const conv = res.data?.data?.conversation
        if (!conv) return
        convId = conv._id
        setConversations((prev) =>
          prev.find((c) => c._id === conv._id) ? prev : [conv, ...prev]
        )
        setActiveConvId(conv._id)
        setPendingTo(null); setPendingRoom(null)
        socket.emit('join_conversation', conv._id)
      } catch {
        toast.error('Không thể mở cuộc hội thoại')
        return
      }
    }

    // Upload media
    if (mediaFiles.length > 0) {
      try {
        setUploading(true)
        const fd = new FormData()
        mediaFiles.forEach((f) => fd.append('files', f))
        const res = await uploadChatMediaApi(fd)
        attachments = res.data?.data?.attachments || []
      } catch {
        toast.error('Upload file thất bại')
        setUploading(false)
        return
      } finally {
        setUploading(false)
        setMediaFiles([])
      }
    }

    socket.emit('send_message', {
      conversationId: convId,
      senderId: user._id,
      content: input.trim(),
      attachments,
    })

    clearTimeout(typingTimerRef.current)
    isTypingRef.current = false
    setInput('')
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeConv = conversations.find((c) => c._id === activeConvId)
  const otherUser = activeConv?.participants?.find((p) => String(p._id) !== String(user?._id))
  const isOtherOnline = otherUser ? !!onlineUsers[String(otherUser._id)] : false
  const isOtherTyping = activeConvId ? (typingUsers[activeConvId]?.size || 0) > 0 : false

  // Total unread count for page title
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar: Conversation List ─────────────────────────────────── */}
      <div
        className={cn(
          'flex flex-col w-full shrink-0 border-r bg-background md:w-72 lg:w-80',
          activeConvId && 'hidden md:flex'
        )}
      >
        {/* Sidebar header — aligns with navbar h-14 */}
        <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base">Tin nhắn</h1>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeConvId={activeConvId}
            onSelect={selectConv}
            currentUserId={user?._id}
            onlineUsers={onlineUsers}
            typingUsers={typingUsers}
            loading={loadingConvs}
          />
        </div>
      </div>

      {/* ── Main: Chat Window ─────────────────────────────────────────────── */}
      <div className={cn('flex flex-1 flex-col min-w-0', !activeConvId && 'hidden md:flex')}>
        {!activeConvId ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageCircle className="h-14 w-14 opacity-20" />
            <p className="text-sm">Chọn một cuộc hội thoại để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <ChatHeader
              otherUser={otherUser}
              isOnline={isOtherOnline}
              isTyping={isOtherTyping}
              conv={activeConv}
              onBack={() => setActiveConvId(null)}
              onOpenBooking={() => setBookingOpen(true)}
            />

            {/* Messages — scroll container cố định, input luôn ở dưới */}
            <div
              ref={msgContainerRef}
              className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-1.5"
            >
              {/* Sentinel vô hình ở đầu — IO fire khi visible để load more */}
              <div ref={topSentinelRef} className="h-1" />
              {/* Spinner khi đang load thêm */}
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              {loadingMsgs ? (
                <div className="space-y-3 pt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={cn('flex', i % 2 === 0 ? '' : 'justify-end')}>
                      <div className={cn('h-10 w-48 rounded-2xl bg-muted animate-pulse', i % 2 !== 0 && 'bg-primary/20')} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground pt-8">
                  Bắt đầu cuộc trò chuyện 👋
                </p>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = String(msg.sender?._id || msg.sender) === String(user?._id)
                  const prevMsg = messages[idx - 1]
                  const showAvatar =
                    !isMine &&
                    (idx === 0 || String(prevMsg?.sender?._id || prevMsg?.sender) !== String(msg.sender?._id || msg.sender))
                  const isRead = isMine && idx < messages.length - 1

                  return (
                    <MessageBubble
                      key={msg._id || idx}
                      msg={msg}
                      isMine={isMine}
                      showAvatar={showAvatar}
                      isRead={isRead}
                    />
                  )
                })
              )}

              {isOtherTyping && <TypingBubble name={otherUser?.name} />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSend}
              onTyping={emitTyping}
              mediaFiles={mediaFiles}
              setMediaFiles={setMediaFiles}
              uploading={uploading}
              hasRoom={!!activeConv?.room}
              onOpenBooking={() => setBookingOpen(true)}
              disabled={!activeConvId}
            />
          </>
        )}
      </div>

      {/* Booking dialog */}
      <BookingInChatDialog
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        conv={activeConv}
        conversationId={activeConvId}
      />
    </div>
  )
}
