import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { getNotificationsApi, markOneReadApi, markAllReadApi } from '@/services/notificationService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSocket } from '@/hooks/useSocket'
import { cn } from '@/lib/utils'

dayjs.extend(relativeTime)
dayjs.locale('vi')

export function NotificationDropdown() {
  const user = useSelector((state) => state.auth?.user)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  // Connect socket
  const socket = useSocket(user?._id)

  // Load on first open
  useEffect(() => {
    if (!open || loaded || !user) return
    getNotificationsApi({ limit: 15 })
      .then((res) => {
        setNotifications(res.data?.data?.notifications || [])
        setUnreadCount(res.data?.data?.unreadCount || 0)
        setLoaded(true)
      })
      .catch(() => {})
  }, [open, loaded, user])

  // Load unread count on mount
  useEffect(() => {
    if (!user) return
    getNotificationsApi({ limit: 1 })
      .then((res) => setUnreadCount(res.data?.data?.unreadCount || 0))
      .catch(() => {})
  }, [user])

  // Real-time new notifications
  useEffect(() => {
    const handler = (notif) => {
      setNotifications((prev) => [notif, ...prev])
      setUnreadCount((c) => c + 1)
      toast.info(notif.title, { description: notif.body })
    }
    socket.on('new_notification', handler)
    return () => socket.off('new_notification', handler)
  }, [socket])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAll = async () => {
    await markAllReadApi()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const handleMarkOne = async (id, e) => {
    e.stopPropagation()
    await markOneReadApi(id)
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-popover shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Thông báo</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                <Bell className="h-6 w-6 opacity-30" />
                Chưa có thông báo
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={cn('flex gap-2.5 px-4 py-3 transition-colors hover:bg-muted/50', !n.isRead && 'bg-primary/5')}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', !n.isRead ? 'bg-primary' : 'bg-transparent')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium', n.isRead && 'font-normal text-muted-foreground')}>{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/60">{dayjs(n.createdAt).fromNow()}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {n.link && (
                      <Link to={n.link} onClick={() => setOpen(false)} className="text-primary hover:text-primary/80">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {!n.isRead && (
                      <button onClick={(e) => handleMarkOne(n._id, e)} className="text-muted-foreground hover:text-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2">
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
