import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import dayjs from 'dayjs'
import { adminGetReviewsApi, adminApproveReviewApi, adminRejectReviewApi } from '@/services/reviewService'
import { StarRating } from '@/components/rooms/StarRating'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState('')

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await adminGetReviewsApi({ status: statusFilter || undefined, limit: 50 })
      setReviews(res.data?.data?.reviews || [])
    } catch { toast.error('Không thể tải đánh giá') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReviews() }, [statusFilter])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await adminApproveReviewApi(id)
      setReviews((prev) => prev.map((r) => r._id === id ? { ...r, status: 'approved' } : r))
      toast.success('Đã duyệt đánh giá')
    } catch { toast.error('Lỗi') }
    finally { setActionLoading('') }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      await adminRejectReviewApi(id)
      setReviews((prev) => prev.map((r) => r._id === id ? { ...r, status: 'rejected' } : r))
      toast.success('Đã từ chối đánh giá')
    } catch { toast.error('Lỗi') }
    finally { setActionLoading('') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Quản lý đánh giá</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border py-16 text-center text-muted-foreground">Không có đánh giá nào</div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{review.user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Phòng: <span className="text-foreground">{review.room?.title}</span>
                    {' · '}
                    {dayjs(review.createdAt).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[review.status]}`}>
                  {review.status === 'pending' ? 'Chờ duyệt' : review.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                </span>
              </div>
              <StarRating value={review.rating} readOnly size="sm" />
              <p className="text-sm">{review.content}</p>
              {review.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actionLoading === review._id} onClick={() => handleApprove(review._id)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Duyệt
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7"
                    disabled={actionLoading === review._id} onClick={() => handleReject(review._id)}>
                    <XCircle className="h-3.5 w-3.5" /> Từ chối
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
