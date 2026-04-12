import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { toast } from 'sonner'
import { getNotificationsApi, markOneReadApi, markAllReadApi } from '@/services/notificationService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const TYPE_COLORS = {
  room_approved: 'bg-emerald-500',
  room_rejected: 'bg-red-500',
  new_message: 'bg-blue-500',
  review_approved: 'bg-yellow-500',
  review_rejected: 'bg-orange-500',
  new_room: 'bg-violet-500',
  system: 'bg-gray-500',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await getNotificationsApi({ limit: 50 })
      setNotifications(res.data?.data?.notifications || [])
      setUnreadCount(res.data?.data?.unreadCount || 0)
    } catch {
      toast.error('Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkOne = async (id) => {
    await markOneReadApi(id)
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const handleMarkAll = async () => {
    await markAllReadApi()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    toast.success('Đã đánh dấu tất cả đã đọc')
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Thông báo</h1>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} chưa đọc</p>}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="h-4 w-4" /> Đọc tất cả
          </Button>
        )}
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Chưa có thông báo nào</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              className={cn('flex gap-3 p-4 transition-colors', !notif.isRead && 'bg-primary/5')}
            >
              {/* Color dot */}
              <div className="mt-1 shrink-0">
                <span className={cn('block h-2.5 w-2.5 rounded-full', !notif.isRead ? TYPE_COLORS[notif.type] || 'bg-primary' : 'bg-muted')} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-medium', notif.isRead && 'font-normal text-muted-foreground')}>
                    {notif.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {dayjs(notif.createdAt).fromNow()}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>

                <div className="mt-2 flex gap-2">
                  {notif.link && (
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                      <Link to={notif.link}>
                        <ExternalLink className="h-3 w-3" /> Xem
                      </Link>
                    </Button>
                  )}
                  {!notif.isRead && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkOne(notif._id)}>
                      <Check className="h-3 w-3" /> Đánh dấu đã đọc
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
