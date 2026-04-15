import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { confirmAppointmentApi, cancelAppointmentApi } from '@/services/appointmentService'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const TIME_SLOT_LABELS = {
  morning: 'Sáng (8h – 12h)',
  afternoon: 'Chiều (13h – 17h)',
  evening: 'Tối (18h – 20h)',
}

const STATUS_CONFIG = {
  pending: {
    label: 'Chờ xác nhận',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Đã xác nhận',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Đã huỷ',
    color: 'text-destructive',
    bg: 'bg-destructive/5 border-destructive/20',
    dot: 'bg-destructive',
  },
  completed: {
    label: 'Hoàn thành',
    color: 'text-muted-foreground',
    bg: 'bg-muted/40 border-border',
    dot: 'bg-muted-foreground',
  },
}

export function AppointmentBubble({ appt: initialAppt, isMine }) {
  const user = useSelector((s) => s.auth?.user)
  const [appt, setAppt] = useState(initialAppt)
  const [loading, setLoading] = useState(null) // 'confirm' | 'cancel'

  if (!appt) return null

  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending
  const isLandlord = String(user?._id) === String(appt.landlord?._id || appt.landlord)
  const isStudent  = String(user?._id) === String(appt.student?._id  || appt.student)
  const canConfirm = isLandlord && appt.status === 'pending'
  const canCancel  = (isLandlord || isStudent) && ['pending', 'confirmed'].includes(appt.status)

  const handleConfirm = async () => {
    try {
      setLoading('confirm')
      const res = await confirmAppointmentApi(appt._id)
      setAppt((p) => ({ ...p, status: 'confirmed' }))
      toast.success('Đã xác nhận lịch hẹn!')
    } catch { toast.error('Xác nhận thất bại') }
    finally { setLoading(null) }
  }

  const handleCancel = async () => {
    try {
      setLoading('cancel')
      await cancelAppointmentApi(appt._id)
      setAppt((p) => ({ ...p, status: 'cancelled' }))
      toast.success('Đã huỷ lịch hẹn')
    } catch { toast.error('Huỷ thất bại') }
    finally { setLoading(null) }
  }

  // Được gọi từ MessagesPage khi socket emit 'appointment_updated'
  AppointmentBubble.updateStatus = (appointmentId, status) => {
    if (String(appt._id) === String(appointmentId)) {
      setAppt((p) => ({ ...p, status }))
    }
  }

  return (
    <div className={cn('rounded-xl border p-3.5 w-72 space-y-3 shadow-sm', cfg.bg)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-semibold text-foreground">Lời mời xem phòng</p>
        </div>
        <span className={cn('flex items-center gap-1 text-[10px] font-medium', cfg.color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      {/* Room */}
      {appt.room && (
        <Link
          to={`/rooms/${appt.room.slug}`}
          className="flex items-center gap-2 group"
        >
          {appt.room.images?.[0] && (
            <img
              src={appt.room.images[0]}
              alt={appt.room.title}
              className="h-10 w-10 rounded-lg object-cover shrink-0 group-hover:opacity-80 transition-opacity"
            />
          )}
          <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {appt.room.title}
          </p>
        </Link>
      )}

      {/* Date & Time */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {dayjs(appt.date).format('DD/MM/YYYY')}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {TIME_SLOT_LABELS[appt.timeSlot] || appt.timeSlot}
        </span>
      </div>

      {/* Note */}
      {appt.note && (
        <p className="text-[11px] text-muted-foreground italic border-t pt-2">
          "{appt.note}"
        </p>
      )}

      {/* Actions */}
      {appt.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          {canConfirm && (
            <Button
              size="sm"
              className="flex-1 h-7 text-xs gap-1 rounded-full"
              onClick={handleConfirm}
              disabled={!!loading}
            >
              {loading === 'confirm'
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <CheckCircle2 className="h-3 w-3" />}
              Xác nhận
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs gap-1 rounded-full border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={handleCancel}
              disabled={!!loading}
            >
              {loading === 'cancel'
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <XCircle className="h-3 w-3" />}
              Huỷ
            </Button>
          )}
        </div>
      )}

      {appt.status === 'confirmed' && canCancel && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={handleCancel}
          disabled={!!loading}
        >
          {loading === 'cancel' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Huỷ lịch hẹn
        </Button>
      )}
    </div>
  )
}
