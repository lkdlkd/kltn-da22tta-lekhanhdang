import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, RefreshCw,
  MessageSquare, ChevronLeft, ChevronRight, ExternalLink, Trash2,
} from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import {
  adminGetCommentsApi, adminApproveCommentApi,
  adminRejectCommentApi, adminDeleteCommentApi,
} from '@/services/commentService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

dayjs.extend(relativeTime)
dayjs.locale('vi')

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

function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">{total} bình luận · Trang {page}/{totalPages}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function AdminCommentsPage() {
  const [comments, setComments]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [status, setStatus]             = useState('pending')
  const [page, setPage]                 = useState(1)
  const [pagination, setPagination]     = useState({})
  const [actionId, setActionId]         = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, limit: 15 }
      if (status) params.status = status
      const res = await adminGetCommentsApi(params)
      setComments(res.data?.data?.comments || [])
      setPagination(res.data?.data?.pagination || {})
    } catch {
      toast.error('Không thể tải danh sách bình luận')
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => { fetchComments() }, [fetchComments])

  const handleStatusChange = (val) => {
    setStatus(val)
    setPage(1)
  }

  const handleApprove = async (id) => {
    try {
      setActionId(id)
      await adminApproveCommentApi(id)
      toast.success('Đã duyệt bình luận')
      fetchComments()
    } catch { toast.error('Thao tác thất bại') } finally { setActionId('') }
  }

  const handleReject = async (id) => {
    try {
      setActionId(id)
      await adminRejectCommentApi(id)
      toast.success('Đã từ chối bình luận')
      fetchComments()
    } catch { toast.error('Thao tác thất bại') } finally { setActionId('') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setActionId(deleteTarget._id)
      await adminDeleteCommentApi(deleteTarget._id)
      toast.success('Đã xoá bình luận')
      setDeleteTarget(null)
      fetchComments()
    } catch { toast.error('Xoá thất bại') } finally { setActionId('') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Quản lý bình luận</h1>
          <p className="text-sm text-muted-foreground">Duyệt và kiểm duyệt bình luận phòng trọ</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchComments} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Làm mới
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex border-b gap-0 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusChange(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              status === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex gap-3 p-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Không có bình luận nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const sc = STATUS_CFG[comment.status] || STATUS_CFG.pending
            const busy = actionId === comment._id
            return (
              <Card key={comment._id} className={cn(
                'transition-all',
                comment.status === 'pending' && 'border-amber-200/60 dark:border-amber-800/40',
              )}>
                <CardContent className="p-4 space-y-3">
                  {/* Top: user + room + time + status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {(comment.user?.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{comment.user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{comment.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn('text-[10px] h-5', sc.cls)}>
                        {sc.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{dayjs(comment.createdAt).fromNow()}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="rounded-lg bg-muted/40 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content}
                  </div>

                  {/* Room link */}
                  {comment.room && (
                    <Link
                      to={`/rooms/${comment.room.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {comment.room.title}
                    </Link>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {comment.status !== 'approved' && (
                      <Button size="sm" className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApprove(comment._id)} disabled={busy}>
                        <CheckCircle className="h-3.5 w-3.5" />Duyệt
                      </Button>
                    )}
                    {comment.status !== 'rejected' && (
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleReject(comment._id)} disabled={busy}>
                        <XCircle className="h-3.5 w-3.5" />Từ chối
                      </Button>
                    )}
                    <Button variant="ghost" size="sm"
                      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => setDeleteTarget(comment)} disabled={busy}>
                      <Trash2 className="h-3.5 w-3.5" />Xoá
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Pagination
            page={page}
            totalPages={pagination.totalPages || 1}
            total={pagination.total || 0}
            onChange={setPage}
          />
        </div>
      )}

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />Xoá bình luận?
            </DialogTitle>
            <DialogDescription>
              Bình luận của <strong>{deleteTarget?.user?.name}</strong> sẽ bị xoá vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={Boolean(actionId)}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
