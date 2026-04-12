import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Calendar, Clock, CheckCircle, XCircle, CheckCheck, MapPin } from 'lucide-react'
import {
  getAppointmentsApi, confirmAppointmentApi,
  cancelAppointmentApi, completeAppointmentApi,
} from '@/services/appointmentService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const TIME_SLOT_LABELS = {
  morning: '🌅 Sáng (8h–12h)',
  afternoon: '☀️ Chiều (13h–17h)',
  evening: '🌆 Tối (18h–20h)',
}

const STATUS_BADGE = {
  pending: { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { label: 'Đã huỷ', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  completed: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
}

export default function AppointmentsPage() {
  const user = useSelector((state) => state.auth?.user)
  const isLandlord = user?.role === 'landlord' || user?.role === 'admin'
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [actionId, setActionId] = useState('')

  useEffect(() => {
    getAppointmentsApi()
      .then((res) => setAppointments(res.data?.data?.appointments || []))
      .catch(() => toast.error('Không thể tải lịch hẹn'))
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
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

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Chưa có lịch hẹn nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const sb = STATUS_BADGE[appt.status]
            const isPending = appt.status === 'pending'
            const isConfirmed = appt.status === 'confirmed'
            const canCancel = isPending || isConfirmed
            const img = appt.room?.images?.[0]
            return (
              <div key={appt._id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {img && <img src={img} alt="" className="hidden sm:block h-16 w-24 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold line-clamp-1">{appt.room?.title}</p>
                      <span className={cn('shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', sb?.className)}>
                        {sb?.label}
                      </span>
                    </div>
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
                    {isLandlord && (
                      <p className="text-xs text-muted-foreground mt-1">Sinh viên: <span className="text-foreground font-medium">{appt.student?.name}</span> · {appt.student?.phone}</p>
                    )}
                    {!isLandlord && (
                      <p className="text-xs text-muted-foreground mt-1">Chủ trọ: <span className="text-foreground font-medium">{appt.landlord?.name}</span> · {appt.landlord?.phone}</p>
                    )}
                    {appt.note && <p className="text-xs text-muted-foreground mt-1 italic">Ghi chú: {appt.note}</p>}
                    {appt.cancelReason && <p className="text-xs text-red-500 mt-1">Lý do huỷ: {appt.cancelReason}</p>}
                  </div>
                </div>

                {/* Actions */}
                {(isLandlord || canCancel) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isLandlord && isPending && (
                      <>
                        <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 gap-1" disabled={actionId === appt._id}
                          onClick={() => doAction(confirmAppointmentApi, appt._id, 'Đã xác nhận lịch hẹn')}>
                          <CheckCircle className="h-3.5 w-3.5" /> Xác nhận
                        </Button>
                      </>
                    )}
                    {isLandlord && isConfirmed && (
                      <Button size="sm" variant="outline" className="h-7 gap-1" disabled={actionId === appt._id}
                        onClick={() => doAction(completeAppointmentApi, appt._id, 'Đã đánh dấu hoàn thành')}>
                        <CheckCheck className="h-3.5 w-3.5" /> Hoàn thành
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-red-500 hover:text-red-600"
                        disabled={actionId === appt._id} onClick={() => { setCancelTarget(appt); setCancelReason('') }}>
                        <XCircle className="h-3.5 w-3.5" /> Huỷ lịch
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={() => { setCancelTarget(null); setCancelReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ lịch hẹn?</DialogTitle>
            <DialogDescription>Vui lòng cho biết lý do huỷ (không bắt buộc). Bên còn lại sẽ nhận được thông báo.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Lý do huỷ..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Đóng</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={Boolean(actionId)}>Huỷ lịch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
