import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Pencil, Trash2 } from 'lucide-react'
import { getRoomReviewsApi, createReviewApi, deleteReviewApi } from '@/services/reviewService'
import { StarRating } from '@/components/rooms/StarRating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right">{star}</span>
      <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
        <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-muted-foreground">{count}</span>
    </div>
  )
}

export function ReviewSection({ roomId }) {
  const user = useSelector((state) => state.auth?.user)
  const [reviews, setReviews] = useState([])
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const totalReviews = Object.values(distribution).reduce((a, b) => a + b, 0)
  const avgRating = totalReviews > 0
    ? (Object.entries(distribution).reduce((sum, [star, count]) => sum + Number(star) * count, 0) / totalReviews).toFixed(1)
    : 0

  useEffect(() => {
    if (!roomId) return
    getRoomReviewsApi(roomId)
      .then((res) => {
        setReviews(res.data?.data?.reviews || [])
        setDistribution(res.data?.data?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [roomId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Vui lòng đăng nhập để đánh giá'); return }
    if (content.trim().length < 10) { toast.error('Nội dung ít nhất 10 ký tự'); return }
    try {
      setSubmitting(true)
      await createReviewApi(roomId, { rating, content: content.trim() })
      toast.success('Cảm ơn! Đánh giá đang chờ admin duyệt ✨')
      setContent('')
      setRating(5)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteReviewApi(deleteTarget._id)
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget._id))
      toast.success('Đã xoá đánh giá')
    } catch { toast.error('Xoá thất bại') }
    finally { setDeleteTarget(null) }
  }

  return (
    <div className="space-y-6">
      {/* Rating summary */}
      {!loading && totalReviews > 0 && (
        <div className="flex gap-6 rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{avgRating}</span>
            <StarRating value={Math.round(Number(avgRating))} readOnly size="sm" />
            <span className="mt-1 text-xs text-muted-foreground">{totalReviews} đánh giá</span>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar key={star} star={star} count={distribution[star] || 0} total={totalReviews} />
            ))}
          </div>
        </div>
      )}

      {/* Review form */}
      {user?.role === 'student' && (
        <div className="rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Viết đánh giá của bạn</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Chất lượng:</span>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về phòng này (ít nhất 10 ký tự)..."
              rows={3}
            />
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </form>
        </div>
      )}

      <Separator />

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Chưa có đánh giá nào được duyệt. Hãy là người đầu tiên!
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review._id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {(review.user?.name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold">{review.user?.name}</span>
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{dayjs(review.createdAt).format('DD/MM/YYYY')}</span>
                  </div>
                  {String(review.user?._id) === String(user?._id) && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(review)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <StarRating value={review.rating} readOnly size="sm" />
                <p className="mt-1.5 text-sm text-foreground/80">{review.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá đánh giá?</DialogTitle>
            <DialogDescription>Hành động này không thể hoàn tác.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={handleDelete}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
