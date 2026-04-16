import { useState } from 'react'
import { CalendarPlus, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { createAppointmentApi } from '@/services/appointmentService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SLOTS = [
  { v: 'morning',   l: 'Sáng',  sub: '8h – 12h' },
  { v: 'afternoon', l: 'Chiều', sub: '13h – 17h' },
  { v: 'evening',   l: 'Tối',   sub: '18h – 20h' },
]

export function BookingInChatDialog({ open, onClose, conv, conversationId, onBooked }) {
  const room = conv?.room
  const [date, setDate]     = useState('')
  const [slot, setSlot]     = useState('morning')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  const minDate = dayjs().add(1, 'day').format('YYYY-MM-DD')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!room?._id || !date) return
    try {
      setSaving(true)
      const res = await createAppointmentApi({ roomId: room._id, date, timeSlot: slot, note: note.trim(), conversationId })
      toast.success('Đã gửi lịch hẹn!')
      onBooked?.(res.data?.data?.appointment)
      onClose()
      setDate(''); setNote('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt lịch thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            Đặt lịch xem phòng
          </DialogTitle>
        </DialogHeader>

        {room ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Room preview */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              {room.images?.[0] && (
                <img src={room.images[0]} alt={room.title} className="h-12 w-12 rounded-lg object-cover shrink-0 border" />
              )}
              <p className="text-sm font-medium line-clamp-2">{room.title}</p>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />Ngày xem
              </label>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Time slot */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />Khung giờ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map(({ v, l, sub }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSlot(v)}
                    className={cn(
                      'rounded-lg border py-2.5 text-center text-xs font-medium transition-colors',
                      slot === v
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <p>{l}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Lời nhắn (tùy chọn)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Mình đến khoảng 9h sáng..."
                maxLength={200}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
              <Button type="submit" disabled={!date || saving}>
                {saving ? 'Đang gửi...' : 'Gửi lịch hẹn'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Cuộc hội thoại này không gắn với phòng trọ nào.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
