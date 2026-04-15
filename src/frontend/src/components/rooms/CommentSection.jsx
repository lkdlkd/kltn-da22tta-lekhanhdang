import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { Trash2, Send, MessageCircle, CornerDownRight, X } from 'lucide-react'
import { getRoomCommentsApi, createCommentApi, deleteCommentApi, replyCommentApi } from '@/services/commentService'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

dayjs.extend(relativeTime)
dayjs.locale('vi')

// ── Landlord Reply Form ─────────────────────────────────────────────────
function ReplyForm({ commentId, onReplied, onCancel }) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => { ref.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    try {
      setSaving(true)
      const res = await replyCommentApi(commentId, { content: content.trim() })
      onReplied(res.data?.data?.comment)
      toast.success('Đã phản hồi bình luận ✨')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phản hồi thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 ml-8 flex gap-2 items-start">
      <Textarea
        ref={ref}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nhập phản hồi của bạn..."
        rows={2}
        className="resize-none flex-1 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
          if (e.key === 'Escape') onCancel()
        }}
      />
      <div className="flex flex-col gap-1">
        <Button type="submit" size="sm" disabled={saving || !content.trim()} className="gap-1">
          <Send className="h-3 w-3" />
          Gửi
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </form>
  )
}

// ── Main Component ──────────────────────────────────────────────────────
export function CommentSection({ roomId, landlordId }) {
  const user = useSelector((s) => s.auth?.user)
  const isLandlord = user && String(user._id) === String(landlordId)

  const [comments, setComments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent]       = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [replyingId, setReplyingId] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!roomId) return
    getRoomCommentsApi(roomId)
      .then((res) => setComments(res.data?.data?.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [roomId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Vui lòng đăng nhập để bình luận'); return }
    if (!content.trim()) { toast.error('Nội dung bình luận không được rỗng'); return }
    try {
      setSubmitting(true)
      await createCommentApi(roomId, { content: content.trim() })
      toast.success('Bình luận đã gửi và đang chờ duyệt ✨')
      setContent('')
      textareaRef.current?.focus()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCommentApi(deleteTarget._id)
      setComments((prev) => prev.filter((c) => c._id !== deleteTarget._id))
      toast.success('Đã xoá bình luận')
    } catch { toast.error('Xoá thất bại') }
    finally { setDeleteTarget(null) }
  }

  const handleReplied = (updatedComment) => {
    setComments((prev) =>
      prev.map((c) => (c._id === updatedComment._id ? updatedComment : c))
    )
    setReplyingId(null)
  }

  return (
    <div className="space-y-5">
      {/* Comment form */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Bình luận về phòng này
        </h3>

        {user ? (
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {(user.name || '?')[0].toUpperCase()}
              </div>
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ nhận xét, câu hỏi về phòng này..."
                rows={2}
                className="resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
                }}
              />
            </div>
            <div className="flex items-center justify-between pl-11">
              <p className="text-xs text-muted-foreground">Ctrl+Enter để gửi</p>
              <Button type="submit" size="sm" className="gap-1.5" disabled={submitting || !content.trim()}>
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Đang gửi...' : 'Gửi'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground pl-1">
            <a href="/login" className="text-primary underline underline-offset-2">Đăng nhập</a> để bình luận.
          </p>
        )}
      </div>

      <Separator />

      {/* Comments list */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          {loading ? '' : `${comments.length} bình luận`}
        </p>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-8 w-8 opacity-25" />
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </div>
        ) : (
          <div className="space-y-5">
            {comments.map((comment) => (
              <div key={comment._id} className="flex gap-3 group">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {(comment.user?.name || '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Comment bubble */}
                  <div className="rounded-xl bg-muted/50 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold leading-none">{comment.user?.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {dayjs(comment.createdAt).fromNow()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    {/* Delete — chủ bình luận */}
                    {String(comment.user?._id) === String(user?._id) && (
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        onClick={() => setDeleteTarget(comment)}
                      >
                        <Trash2 className="h-3 w-3" /> Xoá
                      </button>
                    )}
                    {/* Reply — chủ trọ */}
                    {isLandlord && !comment.landlordReply?.content && (
                      <button
                        className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                        onClick={() => setReplyingId(replyingId === comment._id ? null : comment._id)}
                      >
                        <CornerDownRight className="h-3 w-3" /> Phản hồi
                      </button>
                    )}
                  </div>

                  {/* Landlord reply box */}
                  {comment.landlordReply?.content && (
                    <div className="mt-2 ml-4 flex gap-2.5 rounded-lg border-l-2 border-primary/50 bg-primary/5 px-3 py-2">
                      <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-primary">Chủ trọ phản hồi</span>
                          <span className="text-xs text-muted-foreground">
                            {dayjs(comment.landlordReply.repliedAt).fromNow()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/80">
                          {comment.landlordReply.content}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reply input form */}
                  {replyingId === comment._id && (
                    <ReplyForm
                      commentId={comment._id}
                      onReplied={handleReplied}
                      onCancel={() => setReplyingId(null)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá bình luận?</DialogTitle>
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
