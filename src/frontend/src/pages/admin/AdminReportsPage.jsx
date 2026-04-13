import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Flag, Trash2, X, RefreshCw, AlertTriangle,
  ExternalLink, ChevronLeft, ChevronRight, User as UserIcon,
} from 'lucide-react'
import dayjs from 'dayjs'
import { adminGetReportsApi, adminResolveReportApi } from '@/services/reportService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const REASON_LABELS = {
  fake_info:   'Thông tin sai lệch',
  wrong_price: 'Giá không đúng',
  fake_images: 'Ảnh giả mạo',
  spam:        'Spam / Quảng cáo',
  other:       'Lý do khác',
}

const REASON_BADGE_CLS = {
  fake_info:   'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  wrong_price: 'border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  fake_images: 'border-pink-200 bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
  spam:        'border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  other:       'border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
}

const STATUS_CFG = {
  pending:  { label: 'Chờ xử lý',     cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  reviewed: { label: 'Đang xem xét',  cls: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  resolved: { label: 'Đã giải quyết', cls: 'border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400' },
}

const STATUS_TABS = [
  { value: 'pending',  label: 'Chờ xử lý' },
  { value: 'reviewed', label: 'Đang xem xét' },
  { value: 'resolved', label: 'Đã giải quyết' },
  { value: '',         label: 'Tất cả' },
]

const REASON_FILTER_OPTS = [
  { value: '', label: 'Tất cả lý do' },
  ...Object.entries(REASON_LABELS).map(([v, label]) => ({ value: v, label })),
]

function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">{total} báo cáo · Trang {page}/{totalPages}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2
          if (p < 1 || p > totalPages) return null
          return <Button key={p} size="icon" className="h-7 w-7 text-xs" variant={p === page ? 'default' : 'outline'} onClick={() => onChange(p)}>{p}</Button>
        })}
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [reasonFilter, setReasonFilter] = useState('')
  const [page, setPage]                 = useState(1)
  const [pagination, setPagination]     = useState({ total: 0, totalPages: 1 })
  const [resolveTarget, setResolveTarget] = useState(null)
  const [actionId, setActionId]         = useState('')
  const LIMIT = 10

  const fetchReports = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (statusFilter) params.status = statusFilter
      if (reasonFilter) params.reason = reasonFilter
      const res = await adminGetReportsApi(params)
      setReports(res.data?.data?.reports || [])
      setPagination(res.data?.data?.pagination || { total: 0, totalPages: 1 })
    } catch { toast.error('Không thể tải báo cáo') }
    finally { setLoading(false) }
  }, [statusFilter, reasonFilter, page])

  useEffect(() => { setPage(1); fetchReports(1) }, [statusFilter, reasonFilter])
  useEffect(() => { fetchReports(page) }, [page])

  const handleResolve = async (action) => {
    if (!resolveTarget) return
    setActionId(resolveTarget._id)
    try {
      await adminResolveReportApi(resolveTarget._id, action)
      setReports(prev => prev.map(r => r._id === resolveTarget._id ? { ...r, status: 'resolved' } : r))
      toast.success(action === 'remove_room' ? '🗑️ Đã gỡ phòng vi phạm' : '✅ Đã bỏ qua báo cáo')
    } catch { toast.error('Lỗi xử lý báo cáo') }
    finally { setActionId(''); setResolveTarget(null) }
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold">Báo cáo vi phạm</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pagination.total} báo cáo
            {pendingCount > 0 && <span className="text-red-500 font-medium"> · {pendingCount} chờ xử lý</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => fetchReports(page)}>
          <RefreshCw className="h-3.5 w-3.5" />Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-0 border-b overflow-x-auto scrollbar-none">
          {STATUS_TABS.map(tab => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
                statusFilter === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {tab.label}
              {tab.value === 'pending' && pendingCount > 0 && (
                <Badge className="h-4 px-1 text-[10px] bg-red-100 text-red-600 border-red-200 hover:bg-red-100">{pendingCount}</Badge>
              )}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        {/* Reason pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {REASON_FILTER_OPTS.map(f => (
            <button key={f.value} onClick={() => setReasonFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                reasonFilter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 justify-between"><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-72" /></div><Skeleton className="h-5 w-24 rounded-full" /></div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </CardContent></Card>
            ))
          : reports.length === 0
            ? (
              <Card><CardContent className="flex flex-col items-center gap-3 py-16">
                <Flag className="h-10 w-10 text-muted-foreground/20" />
                <div className="text-center">
                  <p className="font-medium text-sm">Không có báo cáo nào</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Thử đổi bộ lọc phía trên</p>
                </div>
              </CardContent></Card>
            )
            : reports.map(report => {
                const sc = STATUS_CFG[report.status] || STATUS_CFG.pending
                const rc = REASON_BADGE_CLS[report.reason] || REASON_BADGE_CLS.other
                return (
                  <Card key={report._id} className={cn(
                    'transition-all',
                    report.status === 'resolved' && 'opacity-60',
                    report.status === 'pending' && 'border-l-[3px] border-l-red-400'
                  )}>
                    <CardContent className="p-4 space-y-3">

                      {/* Room + status */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Link to={`/rooms/${report.room?.slug}`} target="_blank"
                              className="font-semibold text-sm hover:underline flex items-center gap-1 group">
                              {report.room?.title || 'Phòng đã xoá'}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </Link>
                            <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
                            {report.room?.status === 'flagged' && (
                              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 gap-1">
                                <AlertTriangle className="h-3 w-3" />Vi phạm
                              </Badge>
                            )}
                          </div>

                          {/* Reporter info */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3 shrink-0" />
                              <strong className="text-foreground">{report.reportedBy?.name}</strong>
                              <span>({report.reportedBy?.email})</span>
                            </span>
                            <span>{dayjs(report.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reason + description */}
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge variant="outline" className={cn('shrink-0', rc)}>
                          {REASON_LABELS[report.reason] || report.reason}
                        </Badge>
                        {report.description && (
                          <p className="text-xs text-muted-foreground italic flex-1 min-w-[180px]">
                            "{report.description}"
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      {report.status === 'pending' && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline"
                              className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                              onClick={() => setResolveTarget(report)}>
                              <Flag className="h-3.5 w-3.5" />Xử lý báo cáo
                            </Button>
                            <span className="text-xs text-muted-foreground">Bỏ qua hoặc gỡ phòng vi phạm</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
      </div>

      <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />

      {/* Resolve dialog */}
      <Dialog open={Boolean(resolveTarget)} onOpenChange={() => setResolveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Xử lý báo cáo vi phạm
            </DialogTitle>
            <DialogDescription className="space-y-1 text-sm">
              <span>Phòng: <strong>{resolveTarget?.room?.title}</strong></span><br />
              <span>Lý do: <strong>{REASON_LABELS[resolveTarget?.reason]}</strong></span>
              {resolveTarget?.description && (
                <><br /><em className="text-xs">"{resolveTarget.description}"</em></>
              )}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Dismiss */}
            <button disabled={Boolean(actionId)} onClick={() => handleResolve('dismiss')}
              className="group flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center hover:border-slate-400 hover:bg-muted/30 transition-all disabled:opacity-50 focus:outline-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted group-hover:border-slate-400">
                <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold">Bỏ qua</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Không hợp lệ</p>
              </div>
            </button>

            {/* Hide room */}
            <button disabled={Boolean(actionId)} onClick={() => handleResolve('hide_room')}
              className="group flex flex-col items-center gap-2 rounded-xl border-2 border-orange-200 p-3 text-center hover:border-orange-400 hover:bg-orange-50 transition-all disabled:opacity-50 focus:outline-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-200 bg-orange-50 group-hover:bg-orange-100">
                <Flag className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-700">Ẩn phòng</p>
                <p className="text-[10px] text-orange-500 mt-0.5">Giữ dữ liệu</p>
              </div>
            </button>

            {/* Delete room */}
            <button disabled={Boolean(actionId)} onClick={() => handleResolve('remove_room')}
              className="group flex flex-col items-center gap-2 rounded-xl border-2 border-red-200 p-3 text-center hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50 focus:outline-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 group-hover:bg-red-100">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-700">Xóa phòng</p>
                <p className="text-[10px] text-red-500 mt-0.5">Vĩnh viễn</p>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setResolveTarget(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
