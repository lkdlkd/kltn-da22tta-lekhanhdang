import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, Eye, Home, RefreshCw,
  Search, ChevronLeft, ChevronRight, MapPin,
  EyeOff, Trash2, AlertTriangle, RotateCcw,
} from 'lucide-react'
import {
  adminGetRoomsApi, adminApproveRoomApi, adminRejectRoomApi,
  adminHideRoomApi, adminDeleteRoomApi, adminRestoreRoomApi,
} from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ── Config ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved: { label: 'Đã duyệt', cls: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
  pending:  { label: 'Chờ duyệt', cls: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
  rejected: { label: 'Từ chối', cls: 'border-red-300 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
  flagged:  { label: 'Vi phạm', cls: 'border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
}

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'flagged', label: '⚠️ Vi phạm' },
]

const fmtVND  = v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0)
const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t">
      <p className="text-xs text-muted-foreground">{total} phòng · Trang {page}/{totalPages}</p>
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

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminRoomsPage() {
  const [rooms, setRooms]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [page, setPage]                 = useState(1)
  const [pagination, setPagination]     = useState({ total: 0, totalPages: 1 })

  // dialog states
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // { room, mode: 'hide'|'delete' }
  const [deleteReason, setDeleteReason] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const searchTimeout = useRef(null)
  const LIMIT = 20

  const fetchRooms = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const res = await adminGetRoomsApi({
        status: statusFilter || undefined,
        search: search || undefined,
        page: pg, limit: LIMIT,
      })
      setRooms(res.data?.data?.rooms || [])
      setPagination(res.data?.data?.pagination || { total: 0, totalPages: 1 })
    } catch { toast.error('Không thể tải danh sách phòng') }
    finally { setLoading(false) }
  }, [statusFilter, search, page])

  useEffect(() => { setPage(1); fetchRooms(1) }, [statusFilter, search])
  useEffect(() => { fetchRooms(page) }, [page])

  // debounce search
  const handleSearchChange = (v) => {
    setSearchInput(v)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setSearch(v), 500)
  }

  // handlers
  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await adminApproveRoomApi(id)
      setRooms(prev => prev.map(r => r._id === id ? { ...r, status: 'approved' } : r))
      toast.success('Đã duyệt phòng ✅')
    } catch { toast.error('Lỗi khi duyệt phòng') }
    finally { setActionLoading('') }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActionLoading(rejectTarget._id)
    try {
      await adminRejectRoomApi(rejectTarget._id, rejectReason)
      setRooms(prev => prev.map(r => r._id === rejectTarget._id ? { ...r, status: 'rejected' } : r))
      toast.success('Đã từ chối phòng')
    } catch { toast.error('Lỗi khi từ chối') }
    finally { setActionLoading(''); setRejectTarget(null); setRejectReason('') }
  }

  const handleRestore = async (id) => {
    setActionLoading(id)
    try {
      await adminRestoreRoomApi(id)
      setRooms(prev => prev.map(r => r._id === id ? { ...r, status: 'approved' } : r))
      toast.success('Đã khôi phục phòng ✅')
    } catch { toast.error('Lỗi khi khôi phục') }
    finally { setActionLoading('') }
  }

  const handleHideOrDelete = async () => {
    if (!deleteTarget) return
    const { room, mode } = deleteTarget
    setActionLoading(room._id)
    try {
      if (mode === 'hide') {
        await adminHideRoomApi(room._id, deleteReason)
        setRooms(prev => prev.map(r => r._id === room._id ? { ...r, status: 'flagged', isAvailable: false } : r))
        toast.success('Đã ẩn phòng khỏi danh sách')
      } else {
        await adminDeleteRoomApi(room._id, deleteReason)
        setRooms(prev => prev.filter(r => r._id !== room._id))
        toast.success('Đã xóa phòng')
      }
    } catch { toast.error(mode === 'hide' ? 'Lỗi khi ẩn phòng' : 'Lỗi khi xóa phòng') }
    finally { setActionLoading(''); setDeleteTarget(null); setDeleteReason('') }
  }

  const pendingCount = rooms.filter(r => r.status === 'pending').length
  const flaggedCount = rooms.filter(r => r.status === 'flagged').length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold">Quản lý phòng trọ</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pagination.total} phòng tổng cộng
            {pendingCount > 0 && <span className="text-amber-600 font-medium"> · {pendingCount} chờ duyệt</span>}
            {flaggedCount > 0 && <span className="text-orange-600 font-medium"> · {flaggedCount} vi phạm</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Tên phòng, quận, thành phố..."
              className="h-9 pl-8 w-56"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fetchRooms(page)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0 border-b overflow-x-auto scrollbar-none">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
              statusFilter === tab.value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <Badge className="h-4 px-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{pendingCount}</Badge>
            )}
            {tab.value === 'flagged' && flaggedCount > 0 && (
              <Badge className="h-4 px-1 text-[10px] bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">{flaggedCount}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phòng</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chủ trọ</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giá / Loại</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày đăng</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><Skeleton className="h-12 w-[4.5rem] rounded-lg shrink-0" /><div className="space-y-1.5"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-28" /></div></div></td>
                      <td className="px-5 py-3"><div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-36" /></div></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-5 py-3 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                      <td className="px-5 py-3 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                : rooms.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground">
                        <Home className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Không tìm thấy phòng nào</p>
                      </td>
                    </tr>
                  )
                  : rooms.map(room => {
                      const sc = STATUS_CFG[room.status] || STATUS_CFG.pending
                      const isFlagged = room.status === 'flagged'
                      return (
                        <tr key={room._id} className={cn(
                          'hover:bg-muted/20 transition-colors',
                          room.status === 'rejected' && 'opacity-60',
                          isFlagged && 'bg-orange-50/30 dark:bg-orange-950/10'
                        )}>
                          {/* Phòng */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {room.images?.[0]
                                ? <img src={room.images[0]} alt="" className="h-12 w-[4.5rem] rounded-lg object-cover border shrink-0" />
                                : <div className="flex h-12 w-[4.5rem] rounded-lg bg-muted border items-center justify-center shrink-0"><Home className="h-4 w-4 text-muted-foreground/30" /></div>}
                              <div className="min-w-0">
                                <p className="font-medium text-sm break-words">{room.title}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3 shrink-0" />{room.address?.district || '—'}
                                </p>
                                {isFlagged ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-600 font-semibold mt-0.5">
                                    <AlertTriangle className="h-3 w-3" />Ẩn / Vi phạm
                                  </span>
                                ) : (
                                  <Badge variant="outline" className={cn('mt-1 text-[10px] h-4 px-1.5', room.isAvailable ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-muted-foreground')}>
                                    {room.isAvailable ? 'Còn trống' : 'Đã cho thuê'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Chủ trọ */}
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium">{room.landlord?.name || '—'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 break-all">{room.landlord?.email}</p>
                          </td>
                          {/* Giá */}
                          <td className="px-5 py-3">
                            <p className="text-sm font-semibold">{fmtVND(room.price)}<span className="text-xs font-normal text-muted-foreground">/th</span></p>
                            <p className="text-xs text-muted-foreground mt-0.5">{room.roomType?.replace(/_/g, ' ')}</p>
                          </td>
                          {/* Ngày */}
                          <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(room.createdAt)}</td>
                          {/* Status */}
                          <td className="px-5 py-3 text-center">
                            <Badge variant="outline" className={sc.cls}>{sc.label}</Badge>
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Xem phòng">
                                <Link to={`/rooms/${room.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                              </Button>

                              {/* Duyệt / Từ chối (chỉ khi pending) */}
                              {room.status === 'pending' && (<>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="Duyệt"
                                  disabled={actionLoading === room._id} onClick={() => handleApprove(room._id)}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" title="Từ chối"
                                  disabled={actionLoading === room._id} onClick={() => setRejectTarget(room)}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>)}

                              {/* Duyệt lại — chỉ khi flagged */}
                              {isFlagged && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="Duyệt lại (khôi phục)"
                                  disabled={actionLoading === room._id}
                                  onClick={() => handleRestore(room._id)}>
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Ẩn — cho approved/flagged */}
                              {(room.status === 'approved') && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:bg-orange-50" title="Ẩn phòng"
                                  disabled={actionLoading === room._id}
                                  onClick={() => setDeleteTarget({ room, mode: 'hide' })}>
                                  <EyeOff className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Xóa hẳn — tất cả status */}
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" title="Xóa phòng"
                                disabled={actionLoading === room._id}
                                onClick={() => setDeleteTarget({ room, mode: 'delete' })}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
      </Card>

      {/* ── Reject dialog */}
      <Dialog open={Boolean(rejectTarget)} onOpenChange={() => { setRejectTarget(null); setRejectReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối phòng</DialogTitle>
            <DialogDescription>
              Phòng <strong>"{rejectTarget?.title}"</strong> sẽ bị từ chối. Chủ trọ sẽ nhận thông báo.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-2 py-1">
            <label className="text-sm font-medium">Lý do từ chối <span className="text-xs text-muted-foreground">(tuỳ chọn)</span></label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Thông tin không đầy đủ, ảnh không đúng quy cách..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason('') }}>Huỷ</Button>
            <Button variant="destructive" onClick={handleReject} disabled={Boolean(actionLoading)}>
              <XCircle className="h-4 w-4 mr-1.5" />Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hide / Delete dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => { setDeleteTarget(null); setDeleteReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteTarget?.mode === 'hide'
                ? <><EyeOff className="h-5 w-5 text-orange-500" />Ẩn phòng vi phạm</>
                : <><Trash2 className="h-5 w-5 text-red-600" />Xóa phòng</>}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.mode === 'hide'
                ? <>Phòng <strong>"{deleteTarget?.room?.title}"</strong> sẽ bị <strong>ẩn</strong> khỏi danh sách tìm kiếm. Dữ liệu được giữ lại, chủ trọ có thể liên hệ admin để khôi phục.</>
                : <>Phòng <strong>"{deleteTarget?.room?.title}"</strong> sẽ bị <strong>xóa vĩnh viễn</strong> khỏi hệ thống. Hành động này không thể hoàn tác.</>}
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-2 py-1">
            <label className="text-sm font-medium">Lý do <span className="text-xs text-muted-foreground">(tuỳ chọn)</span></label>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
              placeholder="Nhập lý do để thông báo cho chủ trọ..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteReason('') }}>Huỷ</Button>
            <Button
              variant="destructive"
              className={deleteTarget?.mode === 'hide' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              onClick={handleHideOrDelete}
              disabled={Boolean(actionLoading)}
            >
              {deleteTarget?.mode === 'hide'
                ? <><EyeOff className="h-4 w-4 mr-1.5" />Xác nhận ẩn phòng</>
                : <><Trash2 className="h-4 w-4 mr-1.5" />Xác nhận xóa</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
