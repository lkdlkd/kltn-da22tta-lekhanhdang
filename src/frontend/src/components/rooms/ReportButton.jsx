import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import { createReportApi, getMyReportStatusApi } from '@/services/reportService'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const REASONS = [
  { value: 'fake_info', label: 'Thông tin sai lệch' },
  { value: 'wrong_price', label: 'Giá không đúng thực tế' },
  { value: 'fake_images', label: 'Ảnh không đúng thực tế' },
  { value: 'spam', label: 'Spam / Quảng cáo' },
  { value: 'other', label: 'Lý do khác' },
]

/**
 * ReportDialog — nút trigger + dialog báo cáo phòng
 * Props: roomId
 */
export function ReportButton({ roomId }) {
  const user = useSelector((state) => state.auth?.user)
  const [open, setOpen] = useState(false)
  const [hasReported, setHasReported] = useState(false)
  const [reason, setReason] = useState('fake_info')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && roomId) {
      getMyReportStatusApi(roomId)
        .then((res) => setHasReported(res.data?.data?.hasReported || false))
        .catch(() => {})
    }
  }, [user, roomId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createReportApi(roomId, { reason, description })
      toast.success('Báo cáo đã được ghi nhận. Chúng tôi sẽ xem xét sớm.')
      setHasReported(true)
      setOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi báo cáo')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={hasReported}
        title={hasReported ? 'Bạn đã báo cáo phòng này' : 'Báo cáo vi phạm'}
        className={cn('gap-1.5', hasReported && 'opacity-60')}
        onClick={() => !hasReported && setOpen(true)}
      >
        <Flag className="h-4 w-4 text-destructive" />
        {hasReported ? 'Đã báo cáo' : 'Báo cáo'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Flag className="h-5 w-5" /> Báo cáo vi phạm
            </DialogTitle>
            <DialogDescription>Chọn lý do phù hợp để giúp chúng tôi xử lý nhanh hơn.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Lý do báo cáo</Label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      reason === r.value ? 'border-destructive bg-destructive/5' : 'hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-destructive"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-desc">Mô tả thêm (không bắt buộc)</Label>
              <Textarea
                id="report-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
