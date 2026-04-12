import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { createAppointmentApi } from '@/services/appointmentService'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const TIME_SLOTS = [
  { value: 'morning', label: 'Sáng', sub: '8h – 12h', icon: '🌅' },
  { value: 'afternoon', label: 'Chiều', sub: '13h – 17h', icon: '☀️' },
  { value: 'evening', label: 'Tối', sub: '18h – 20h', icon: '🌆' },
]

/**
 * BookingDialog — dialog đặt lịch xem phòng
 * Props: open, onClose, roomId, roomTitle
 */
export function BookingDialog({ open, onClose, roomId, roomTitle }) {
  const user = useSelector((state) => state.auth?.user)
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('morning')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // min date = ngày mai
  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Vui lòng đăng nhập để đặt lịch'); navigate('/login'); return }
    if (!date) { toast.error('Vui lòng chọn ngày hẹn'); return }

    setLoading(true)
    try {
      await createAppointmentApi({ roomId, date, timeSlot, note: note.trim() })
      toast.success('Đặt lịch thành công! Chờ chủ trọ xác nhận 🎉')
      onClose()
      setDate(''); setNote(''); setTimeSlot('morning')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đặt lịch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Đặt lịch xem phòng
          </DialogTitle>
          <DialogDescription className="line-clamp-1">{roomTitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label htmlFor="appt-date">Chọn ngày</Label>
            <input
              id="appt-date"
              type="date"
              min={minDateStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Time slot */}
          <div className="space-y-2">
            <Label>Khung giờ</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setTimeSlot(slot.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                    timeSlot === slot.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <span className="text-xl">{slot.icon}</span>
                  <span className="text-sm font-medium">{slot.label}</span>
                  <span className="text-xs text-muted-foreground">{slot.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="appt-note">Ghi chú (không bắt buộc)</Label>
            <Textarea
              id="appt-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Tôi muốn xem phòng tầng cao hơn..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang đặt...' : 'Xác nhận đặt lịch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
