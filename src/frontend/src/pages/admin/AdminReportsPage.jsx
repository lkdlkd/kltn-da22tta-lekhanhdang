import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Flag, Eye, Trash2, X } from 'lucide-react'
import dayjs from 'dayjs'
import { adminGetReportsApi, adminResolveReportApi } from '@/services/reportService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const REASON_LABELS = {
  fake_info: 'Thông tin sai lệch',
  wrong_price: 'Giá không đúng',
  fake_images: 'Ảnh giả mạo',
  spam: 'Spam / Quảng cáo',
  other: 'Lý do khác',
}

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [resolveTarget, setResolveTarget] = useState(null)
  const [actionId, setActionId] = useState('')

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await adminGetReportsApi({ status: statusFilter || undefined, limit: 50 })
      setReports(res.data?.data?.reports || [])
    } catch { toast.error('Không thể tải báo cáo') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports() }, [statusFilter])

  const handleResolve = async (action) => {
    if (!resolveTarget) return
    setActionId(resolveTarget._id)
    try {
      await adminResolveReportApi(resolveTarget._id, action)
      setReports((prev) => prev.map((r) => r._id === resolveTarget._id ? { ...r, status: 'resolved' } : r))
      toast.success(action === 'remove_room' ? 'Đã gỡ phòng vi phạm' : 'Đã bỏ qua báo cáo')
    } catch { toast.error('Lỗi xử lý báo cáo') }
    finally { setActionId(''); setResolveTarget(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Flag className="h-5 w-5 text-red-500" /> Báo cáo vi phạm
        </h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tất cả</option>
          <option value="pending">Chờ xử lý</option>
          <option value="reviewed">Đang xem xét</option>
          <option value="resolved">Đã giải quyết</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : reports.length === 0 ? (
          <div className="rounded-xl border py-16 text-center text-muted-foreground">Không có báo cáo nào</div>
        ) : (
          reports.map((report) => (
            <div key={report._id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/rooms/${report.room?.slug}`} className="font-semibold text-sm hover:underline line-clamp-1">
                      {report.room?.title || 'Phòng đã xoá'}
                    </Link>
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[report.status])}>
                      {report.status === 'pending' ? 'Chờ xử lý' : report.status === 'reviewed' ? 'Đang xem xét' : 'Đã giải quyết'}
                    </span>
                    {report.room?.status === 'flagged' && (
                      <span className="inline-flex rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">
                        ⚠️ Bị gắn cờ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Người báo cáo: <span className="text-foreground">{report.reportedBy?.name}</span>
                    {' · '}Lý do: <span className="text-foreground font-medium">{REASON_LABELS[report.reason]}</span>
                    {' · '}{dayjs(report.createdAt).format('DD/MM/YYYY HH:mm')}
                  </p>
                  {report.description && <p className="text-xs text-muted-foreground italic mt-1">"{report.description}"</p>}
                </div>
                {report.status === 'pending' && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 shrink-0" onClick={() => setResolveTarget(report)}>
                    Xử lý
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve dialog */}
      <Dialog open={Boolean(resolveTarget)} onOpenChange={() => setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo</DialogTitle>
            <DialogDescription>
              Chọn hành động cho báo cáo phòng <strong>"{resolveTarget?.room?.title}"</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" className="flex-col h-auto py-4 gap-2" disabled={Boolean(actionId)}
              onClick={() => handleResolve('dismiss')}>
              <X className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Bỏ qua</span>
              <span className="text-xs text-muted-foreground text-center">Báo cáo không hợp lệ</span>
            </Button>
            <Button variant="destructive" className="flex-col h-auto py-4 gap-2" disabled={Boolean(actionId)}
              onClick={() => handleResolve('remove_room')}>
              <Trash2 className="h-5 w-5" />
              <span className="text-sm font-medium">Gỡ phòng</span>
              <span className="text-xs text-destructive-foreground/70 text-center">Xoá phòng vi phạm</span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveTarget(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
