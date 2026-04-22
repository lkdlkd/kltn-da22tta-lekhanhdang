import { useEffect, useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { toast } from 'sonner'
import {
  Calendar, Clock, CheckCircle, XCircle, CheckCheck,
  MapPin, MessageCircle, ExternalLink, User,
} from 'lucide-react'
import {
  getAppointmentsApi, confirmAppointmentApi,
  cancelAppointmentApi, completeAppointmentApi,
} from '@/services/appointmentService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

dayjs.locale('vi')

const TIME_SLOT_LABELS = {
  morning: '🌅 Sáng (8h–12h)',
  afternoon: '☀️ Chiều (13h–17h)',
  evening: '🌆 Tối (18h–20h)',
}

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã huỷ' },
]

const STATUS_BADGE = {
  pending: { label: 'Chờ xác nhận', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  completed: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
}

// ── Stat card (landlord only) ─────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-1', color)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const user = useSelector((s) => s.auth?.user)
  const isLandlord = user?.role === 'landlord' || user?.role === 'admin'
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [actionId, setActionId] = useState('')

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getAppointmentsApi()
      .then((res) => setAppointments(res.data?.data?.appointments || []))
      .catch(() => toast.error('Không thể tải lịch hẹn'))
      .finally(() => setLoading(false))
  }, [])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    activeTab === 'all' ? appointments : appointments.filter((a) => a.status === activeTab),
    [appointments, activeTab]
  )

  // ── Stats (landlord) ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return {
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      today: appointments.filter((a) =>
        (a.status === 'pending' || a.status === 'confirmed') &&
        dayjs(a.date).format('YYYY-MM-DD') === today
      ).length,
      total: appointments.length,
    }
  }, [appointments])

  // ── Actions ───────────────────────────────────────────────────────────────
  const doAction = async (fn, id, successMsg) => {
    setActionId(id)
    try {
      const res = await fn(id)
      const updated = res.data?.data?.appointment
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, ...updated } : a))
      toast.success(successMsg)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionId('')
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setActionId(cancelTarget._id)
    try {
      const res = await cancelAppointmentApi(cancelTarget._id, cancelReason)
      const updated = res.data?.data?.appointment
      setAppointments((prev) => prev.map((a) => a._id === cancelTarget._id ? { ...a, ...updated } : a))
      toast.success('Đã huỷ lịch hẹn')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionId(''); setCancelTarget(null); setCancelReason('')
    }
  }

  // ── Tab badge counts ──────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: appointments.length }
    appointments.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1 })
    return c
  }, [appointments])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {isLandlord ? 'Quản lý lịch hẹn' : 'Lịch hẹn xem phòng'}
          </h1>
          <p className="text-sm text-muted-foreground">{appointments.length} lịch hẹn</p>
        </div>
      </div>

      {/* Stat cards — landlord only */}
      {isLandlord && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Chờ xác nhận" value={stats.pending} color="border-yellow-200 dark:border-yellow-900/40" />
          <StatCard label="Đã xác nhận" value={stats.confirmed} color="border-blue-200 dark:border-blue-900/40" />
          <StatCard label="Lịch hôm nay" value={stats.today} color="border-primary/30" />
          <StatCard label="Tổng lịch hẹn" value={stats.total} color="" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={cn(
                'ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]',
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
              )}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {activeTab === 'all' ? 'Chưa có lịch hẹn nào' : `Không có lịch "${TABS.find(t => t.key === activeTab)?.label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const sb = STATUS_BADGE[appt.status]
            const isPending = appt.status === 'pending'
            const isConfirmed = appt.status === 'confirmed'
            const canCancel = isPending || isConfirmed
            const img = appt.room?.images?.[0]
            const isBusy = actionId === appt._id

            return (
              <div key={appt._id} className="rounded-xl border bg-card p-4 space-y-3 transition-shadow hover:shadow-sm">
                {/* Top row: image + info */}
                <div className="flex items-start gap-3">
                  {img && (
                    <img
                      src={img} alt=""
                      className="hidden sm:block h-16 w-24 rounded-lg object-cover shrink-0 cursor-pointer"
                      onClick={() => appt.room?.slug && navigate(`/rooms/${appt.room.slug}`)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      {/* Room title (clickable) */}
                      <button
                        onClick={() => appt.room?.slug && navigate(`/rooms/${appt.room.slug}`)}
                        className="font-semibold line-clamp-1 text-left hover:underline flex items-center gap-1"
                      >
                        {appt.room?.title}
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </button>
                      <span className={cn('shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', sb?.cls)}>
                        {sb?.label}
                      </span>
                    </div>

                    {/* Date & time */}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {dayjs(appt.date).format('dddd, DD/MM/YYYY')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {TIME_SLOT_LABELS[appt.timeSlot]}
                      </span>
                    </div>

                    {/* Address */}
                    {appt.room?.address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {appt.room.address}
                      </p>
                    )}

                    {/* Counterpart info */}
                    {isLandlord ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3 shrink-0" />
                        Sinh viên: <span className="text-foreground font-medium ml-0.5">{appt.student?.name}</span>
                        {appt.student?.phone && <span className="ml-1">· {appt.student.phone}</span>}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <User className="h-3 w-3 shrink-0" />
                        Chủ trọ: <span className="text-foreground font-medium ml-0.5">{appt.landlord?.name}</span>
                        {appt.landlord?.phone && <span className="ml-1">· {appt.landlord.phone}</span>}
                      </p>
                    )}

                    {/* Note / cancel reason */}
                    {appt.note && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Ghi chú: {appt.note}</p>
                    )}
                    {appt.cancelReason && (
                      <p className="text-xs text-red-500 mt-1">Lý do huỷ: {appt.cancelReason}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                  {/* Landlord actions */}
                  {isLandlord && isPending && (
                    <Button
                      size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 gap-1" disabled={isBusy}
                      onClick={() => doAction(confirmAppointmentApi, appt._id, 'Đã xác nhận lịch hẹn')}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Xác nhận
                    </Button>
                  )}
                  {isLandlord && isConfirmed && (
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1" disabled={isBusy}
                      onClick={() => doAction(completeAppointmentApi, appt._id, 'Đã đánh dấu hoàn thành')}
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Hoàn thành
                    </Button>
                  )}

                  {/* Quick message button — for landlord, link to chat with student */}
                  {isLandlord && appt.student?._id && (
                    <Button
                      size="sm" variant="outline" className="h-7 gap-1 ml-auto"
                      onClick={() => navigate(`/messages?to=${appt.student._id}`)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Nhắn tin
                    </Button>
                  )}

                  {/* Cancel button (both roles) */}
                  {canCancel && (
                    <Button
                      size="sm" variant="ghost"
                      className={cn('h-7 gap-1 text-red-500 hover:text-red-600', isLandlord && appt.student?._id ? '' : 'ml-auto')}
                      disabled={isBusy}
                      onClick={() => { setCancelTarget(appt); setCancelReason('') }}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Huỷ lịch
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel dialog */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={() => { setCancelTarget(null); setCancelReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ lịch hẹn?</DialogTitle>
            <DialogDescription>
              Vui lòng cho biết lý do huỷ (không bắt buộc). Bên còn lại sẽ nhận được thông báo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Lý do huỷ..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Đóng</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={Boolean(actionId)}>Huỷ lịch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
