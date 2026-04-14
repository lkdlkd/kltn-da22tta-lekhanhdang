import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, RefreshCw,
  MessageSquare, ChevronLeft, ChevronRight, ExternalLink, Trash2,
} from 'lucide-react'
import dayjs from 'dayjs'
import {
  adminGetReviewsApi, adminApproveReviewApi,
  adminRejectReviewApi, adminDeleteReviewApi,
} from '@/services/reviewService'
import { StarRating } from '@/components/rooms/StarRating'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STATUS_CFG = {
  pending:  { label: 'Chờ duyệt', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  approved: { label: 'Đã duyệt',  cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  rejected: { label: 'Từ chối',   cls: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
}

const STATUS_TABS = [
  { value: 'pending',  label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: '',         label: 'Tất cả' },
]

const STAR_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: '5', label: '5 ⭐' },
  { value: '4', label: '4 ⭐' },
  { value: '3', label: '3 ⭐' },
  { value: '2', label: '≤2 ⭐' },
]

function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">{total} đánh giá · Trang {page}/{totalPages}</p>
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

export default function AdminReviewsPage() {
  const [reviews, setReviews]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [starFilter, setStarFilter]     = useState('')
  const [page, setPage]                 = useState(1)
  const [pagination, setPagination]     = useState({ total: 0, totalPages: 1 })
  const [actionLoading, setActionLoading] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const LIMIT = 10

  const fetchReviews = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (statusFilter) params.status = statusFilter
      const res = await adminGetReviewsApi(params)
      setReviews(res.data?.data?.reviews || [])
      setPagination(res.data?.data?.pagination || { total: 0, totalPages: 1 })
    } catch { toast.error('Không thể tải đánh giá') }
    finally { setLoading(false) }
  }, [statusFilter, page])

  useEffect(() => { setPage(1); fetchReviews(1) }, [statusFilter, starFilter])
  useEffect(() => { fetchReviews(page) }, [page])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await adminApproveReviewApi(id)
      setReviews(prev => prev.map(r => r._id === id ? { ...r, status: 'approved' } : r))
      toast.success('Đã duyệt đánh giá ✅')
    } catch { toast.error('Lỗi') }
    finally { setActionLoading('') }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      await adminRejectReviewApi(id)
      setReviews(prev => prev.map(r => r._id === id ? { ...r, status: 'rejected' } : r))
      toast.success('Đã từ chối đánh giá')
    } catch { toast.error('Lỗi') }
    finally { setActionLoading('') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget._id)
    try {
      await adminDeleteReviewApi(deleteTarget._id)
      setReviews(prev => prev.filter(r => r._id !== deleteTarget._id))
      toast.success('Đã xoá đánh giá')
    } catch { toast.error('Lỗi khi xoá') }
    finally { setActionLoading(''); setDeleteTarget(null) }
  }

  // client-side star filter
  const displayed = starFilter
    ? reviews.filter(r => {
        if (starFilter === '2') return r.rating <= 2
        return r.rating === Number(starFilter)
      })
    : reviews

  const pendingCount = reviews.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold">Quản lý đánh giá</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pagination.total} đánh giá
            {pendingCount > 0 && <span className="text-amber-600 font-medium"> · {pendingCount} chờ duyệt</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => fetchReviews(page)}>
          <RefreshCw className="h-3.5 w-3.5" />Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-0 border-b">
          {STATUS_TABS.map(tab => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                statusFilter === tab.value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              {tab.label}
              {tab.value === 'pending' && pendingCount > 0 && (
                <Badge className="h-4 px-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{pendingCount}</Badge>
              )}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <div className="flex items-center gap-1.5 flex-wrap">
          {STAR_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStarFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                starFilter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52" /></div><Skeleton className="h-5 w-20 rounded-full" /></div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-14 w-full" />
                </CardContent>
              </Card>
            ))
          : displayed.length === 0
            ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="font-medium text-sm">Không có đánh giá nào</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Thử đổi bộ lọc phía trên</p>
                  </div>
                </CardContent>
              </Card>
            )
            : displayed.map(review => {
                const sc = STATUS_CFG[review.status] || STATUS_CFG.pending
                return (
                  <Card key={review._id} className={cn(
                    'transition-all',
                    review.status === 'rejected' && 'opacity-60',
                    review.status === 'pending' && 'border-l-[3px] border-l-amber-400'
                  )}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted border text-sm font-bold">
                          {(review.user?.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{review.user?.name}</span>
                            <span className="text-xs text-muted-foreground">{review.user?.email}</span>
                            <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Link to={`/rooms/${review.room?.slug}`} target="_blank"
                              className="text-xs text-primary hover:underline flex items-center gap-0.5">
                              {review.room?.title || 'Phòng đã xoá'}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {dayjs(review.createdAt).format('DD/MM/YYYY HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <StarRating value={review.rating} readOnly size="sm" />

                      {/* Content */}
                      <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-border pl-3 whitespace-pre-wrap">
                        {review.content}
                      </p>

                      {/* Actions */}
                      <div className="space-y-2">
                        {review.status === 'pending' && (
                          <>
                            <Separator />
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                disabled={actionLoading === review._id} onClick={() => handleApprove(review._id)}>
                                <CheckCircle className="h-3.5 w-3.5" />Duyệt
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 gap-1.5"
                                disabled={actionLoading === review._id} onClick={() => handleReject(review._id)}>
                                <XCircle className="h-3.5 w-3.5" />Từ chối
                              </Button>
                              <Button size="sm" variant="ghost"
                                className="h-8 gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 ml-auto"
                                disabled={actionLoading === review._id}
                                onClick={() => setDeleteTarget(review)}>
                                <Trash2 className="h-3.5 w-3.5" />Xoá
                              </Button>
                            </div>
                          </>
                        )}
                        {review.status !== 'pending' && (
                          <div className="flex justify-end">
                            <Button size="sm" variant="ghost"
                              className="h-7 gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                              disabled={actionLoading === review._id}
                              onClick={() => setDeleteTarget(review)}>
                              <Trash2 className="h-3 w-3" />Xoá vĩnh viễn
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
      </div>

      <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />Xoá đánh giá
            </DialogTitle>
            <DialogDescription>
              Đánh giá của <strong>{deleteTarget?.user?.name}</strong> về phòng{' '}
              <strong>"{deleteTarget?.room?.title}"</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={Boolean(actionLoading)}>
              <Trash2 className="h-4 w-4 mr-1.5" />Xác nhận xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
