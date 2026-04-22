import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { toast } from 'sonner'
import {
  Home, Calendar, MessageCircle, Plus, Eye,
  TrendingUp, Clock, CheckCircle, AlertTriangle,
  ArrowRight, DoorOpen, Pencil, Bell,
} from 'lucide-react'
import { getMyRoomsApi } from '@/services/roomService'
import { getAppointmentsApi, confirmAppointmentApi, cancelAppointmentApi } from '@/services/appointmentService'
import { getConversationsApi } from '@/services/chatService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

dayjs.locale('vi')

const TIME_SLOT_LABELS = {
  morning: 'Sáng (8–12h)',
  afternoon: 'Chiều (13–17h)',
  evening: 'Tối (18–20h)',
}

function formatCurrency(v) {
  if (!v) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const palette = {
    blue:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20',
    green:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
    amber:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20',
    red:    'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20',
  }
  const cls = palette[color] || palette.blue
  const inner = (
    <CardContent className="flex items-center gap-4 p-5">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', cls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </CardContent>
  )
  return (
    <Card className="hover:shadow-md transition-shadow">
      {to ? <Link to={to}>{inner}</Link> : inner}
    </Card>
  )
}

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link to={to} className={cn(
      'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5',
      color
    )}>
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LandlordDashboardPage() {
  const user = useSelector((s) => s.auth?.user)
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [appointments, setAppointments] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')

  useEffect(() => {
    Promise.all([
      getMyRoomsApi(),
      getAppointmentsApi(),
      getConversationsApi(),
    ]).then(([r, a, c]) => {
      setRooms(r.data?.data?.rooms || [])
      setAppointments(a.data?.data?.appointments || [])
      setConversations(c.data?.data?.conversations || [])
    }).catch(() => toast.error('Không thể tải dữ liệu dashboard'))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)
    return {
      totalRooms: rooms.length,
      availableRooms: rooms.filter(r => r.isAvailable && r.status === 'approved').length,
      pendingRooms: rooms.filter(r => r.status === 'pending').length,
      totalViews: rooms.reduce((s, r) => s + (r.viewCount || 0), 0),
      pendingAppts: appointments.filter(a => a.status === 'pending').length,
      confirmedAppts: appointments.filter(a => a.status === 'confirmed').length,
      todayAppts: appointments.filter(a =>
        (a.status === 'pending' || a.status === 'confirmed') &&
        dayjs(a.date).format('YYYY-MM-DD') === today
      ).length,
      totalUnread,
    }
  }, [rooms, appointments, conversations])

  // Lịch hẹn chờ xử lý (pending) — tối đa 5
  const pendingAppts = useMemo(() =>
    appointments.filter(a => a.status === 'pending').slice(0, 5),
    [appointments]
  )

  // Phòng nổi bật — 3 phòng xem nhiều nhất
  const topRooms = useMemo(() =>
    [...rooms].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 3),
    [rooms]
  )

  // ── Actions ───────────────────────────────────────────────────────────────
  const doConfirm = async (id) => {
    setActionId(id)
    try {
      const res = await confirmAppointmentApi(id)
      const updated = res.data?.data?.appointment
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, ...updated } : a))
      toast.success('Đã xác nhận lịch hẹn')
    } catch { toast.error('Có lỗi xảy ra') }
    finally { setActionId('') }
  }

  const doCancel = async (id) => {
    setActionId(id)
    try {
      const res = await cancelAppointmentApi(id, '')
      const updated = res.data?.data?.appointment
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, ...updated } : a))
      toast.success('Đã huỷ lịch hẹn')
    } catch { toast.error('Có lỗi xảy ra') }
    finally { setActionId('') }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">

      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {user?.name?.split(' ').pop()} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tổng quan hoạt động cho thuê của bạn hôm nay
          </p>
        </div>
        <Button asChild>
          <Link to="/landlord/rooms/create"><Plus className="h-4 w-4" />Đăng phòng mới</Link>
        </Button>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0,1,2,3].map(i => (
            <Card key={i}><CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-10" /></div>
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Home} label="Tổng tin đăng" value={stats.totalRooms}
            sub={`${stats.availableRooms} phòng còn trống`} color="blue" to="/landlord/rooms" />
          <StatCard icon={Calendar} label="Chờ xác nhận" value={stats.pendingAppts}
            sub={`${stats.todayAppts} lịch hôm nay`}
            color={stats.pendingAppts > 0 ? 'amber' : 'green'} to="/landlord/appointments" />
          <StatCard icon={MessageCircle} label="Tin nhắn chưa đọc" value={stats.totalUnread}
            color={stats.totalUnread > 0 ? 'violet' : 'blue'} to="/messages" />
          <StatCard icon={TrendingUp} label="Lượt xem phòng" value={stats.totalViews.toLocaleString('vi')}
            sub="Tổng tất cả tin đăng" color="green" />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Plus} label="Đăng phòng mới" to="/landlord/rooms/create"
            color="border-primary/20 hover:border-primary/40 text-primary" />
          <QuickAction icon={Home} label="Quản lý phòng" to="/landlord/rooms"
            color="hover:border-blue-300 text-blue-600 dark:text-blue-400" />
          <QuickAction icon={Calendar} label="Lịch hẹn" to="/landlord/appointments"
            color="hover:border-amber-300 text-amber-600 dark:text-amber-400" />
          <QuickAction icon={MessageCircle} label="Tin nhắn" to="/messages"
            color="hover:border-violet-300 text-violet-600 dark:text-violet-400" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Pending appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Lịch hẹn chờ xác nhận
              {stats.pendingAppts > 0 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-1">
                  {stats.pendingAppts}
                </Badge>
              )}
            </CardTitle>
            <Link to="/landlord/appointments" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Xem tất cả <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {loading ? (
              [0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)
            ) : pendingAppts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
                <p className="text-sm text-muted-foreground">Không có lịch hẹn chờ xử lý</p>
              </div>
            ) : pendingAppts.map(appt => (
              <div key={appt._id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{appt.room?.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appt.student?.name} · {dayjs(appt.date).format('DD/MM/YYYY')} · {TIME_SLOT_LABELS[appt.timeSlot]}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1"
                    disabled={actionId === appt._id} onClick={() => doConfirm(appt._id)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Xác nhận
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                    disabled={actionId === appt._id} onClick={() => doCancel(appt._id)}>
                    Huỷ
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => navigate(`/messages?to=${appt.student?._id}`)}>
                    <MessageCircle className="h-3.5 w-3.5" /> Chat
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top rooms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Phòng nhiều lượt xem nhất
            </CardTitle>
            <Link to="/landlord/rooms" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Quản lý <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {loading ? (
              [0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)
            ) : topRooms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Home className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chưa có phòng nào</p>
                <Button size="sm" asChild><Link to="/landlord/rooms/create"><Plus className="h-3.5 w-3.5" />Đăng ngay</Link></Button>
              </div>
            ) : topRooms.map((room) => {
              const isAvail = room.isAvailable && room.status === 'approved'
              return (
                <div key={room._id} className="flex items-center gap-3 rounded-lg border p-3">
                  {room.images?.[0]
                    ? <img src={room.images[0]} alt="" className="h-12 w-16 rounded-md object-cover shrink-0" />
                    : <div className="h-12 w-16 rounded-md bg-muted flex items-center justify-center shrink-0"><Home className="h-5 w-5 text-muted-foreground/40" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{room.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-primary font-semibold">{formatCurrency(room.price)}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        isAvail ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                        {isAvail ? 'Còn trống' : 'Đã thuê'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />{room.viewCount || 0}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                        <Link to={`/rooms/${room.slug}`}><Eye className="h-3 w-3" /></Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                        <Link to={`/landlord/rooms/${room._id}/edit`}><Pencil className="h-3 w-3" /></Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-violet-500" />
              Tin nhắn gần đây
              {stats.totalUnread > 0 && (
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  {stats.totalUnread} chưa đọc
                </Badge>
              )}
            </CardTitle>
            <Link to="/messages" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Mở chat <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {loading ? (
              [0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào</p>
              </div>
            ) : conversations.slice(0, 5).map(conv => {
              const other = conv.participants?.find(p => String(p._id) !== String(user?._id))
              const unread = conv.unreadCount || 0
              return (
                <Link key={conv._id} to={`/messages`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                  <div className="relative shrink-0">
                    {other?.avatar
                      ? <img src={other.avatar} className="h-8 w-8 rounded-full object-cover" alt="" />
                      : <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {other?.name?.[0] || '?'}
                        </div>
                    }
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center px-0.5">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm line-clamp-1', unread > 0 ? 'font-semibold' : 'font-medium')}>
                      {other?.name || 'Người dùng'}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {conv.lastMessage?.content || 'Chưa có tin nhắn'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        {/* Alerts / notices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              Cần chú ý
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {loading ? (
              [0,1].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : (
              <>
                {rooms.filter(r => r.status === 'pending').length > 0 && (
                  <Link to="/landlord/rooms?tab=pending"
                    className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-3 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {rooms.filter(r => r.status === 'pending').length} phòng đang chờ admin duyệt
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">Phòng chưa được duyệt sẽ không hiển thị với sinh viên</p>
                    </div>
                  </Link>
                )}
                {rooms.filter(r => r.status === 'flagged' || r.status === 'rejected').length > 0 && (
                  <Link to="/landlord/rooms"
                    className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-3 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        {rooms.filter(r => r.status === 'flagged' || r.status === 'rejected').length} phòng vi phạm hoặc bị từ chối
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-0.5">Vui lòng chỉnh sửa hoặc liên hệ admin</p>
                    </div>
                  </Link>
                )}
                {stats.pendingAppts > 0 && (
                  <Link to="/landlord/appointments"
                    className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-3 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                    <Calendar className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        {stats.pendingAppts} lịch hẹn chờ xác nhận
                      </p>
                      <p className="text-xs text-blue-600/70 dark:text-blue-500/70 mt-0.5">Sinh viên đang chờ phản hồi từ bạn</p>
                    </div>
                  </Link>
                )}
                {stats.pendingAppts === 0 &&
                  rooms.filter(r => r.status === 'pending' || r.status === 'flagged' || r.status === 'rejected').length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                    <p className="text-sm text-muted-foreground">Mọi thứ đều ổn! Không có vấn đề cần xử lý.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
