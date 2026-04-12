import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import { adminGetRoomsApi, adminApproveRoomApi, adminRejectRoomApi } from '@/services/adminService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const STATUS_BADGE = {
  approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300' },
  pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300' },
  flagged: { label: 'Vi phạm', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300' },
}

function formatCurrency(v) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0)
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState('')

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const res = await adminGetRoomsApi({ status: statusFilter || undefined, limit: 50 })
      setRooms(res.data?.data?.rooms || [])
    } catch { toast.error('Không thể tải danh sách phòng') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRooms() }, [statusFilter])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await adminApproveRoomApi(id)
      setRooms((prev) => prev.map((r) => r._id === id ? { ...r, status: 'approved' } : r))
      toast.success('Đã duyệt phòng ✅')
    } catch { toast.error('Lỗi khi duyệt phòng') }
    finally { setActionLoading('') }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActionLoading(rejectTarget._id)
    try {
      await adminRejectRoomApi(rejectTarget._id)
      setRooms((prev) => prev.map((r) => r._id === rejectTarget._id ? { ...r, status: 'rejected' } : r))
      toast.success('Đã từ chối phòng')
    } catch { toast.error('Lỗi khi từ chối phòng') }
    finally { setActionLoading(''); setRejectTarget(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Quản lý phòng trọ</h1>
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

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Phòng</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Chủ trọ</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Giá</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 mx-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24 ml-auto" /></td>
                </tr>
              ))
            ) : rooms.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Không có phòng nào</td></tr>
            ) : (
              rooms.map((room) => {
                const sb = STATUS_BADGE[room.status] || STATUS_BADGE.pending
                return (
                  <tr key={room._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {room.images?.[0] && <img src={room.images[0]} alt="" className="hidden sm:block h-9 w-14 rounded object-cover" />}
                        <div>
                          <p className="font-medium line-clamp-1 max-w-[200px]">{room.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{room.address?.district}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm">{room.landlord?.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-right font-medium">{formatCurrency(room.price)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${sb.className}`}>{sb.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link to={`/rooms/${room.slug}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        {room.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                              disabled={actionLoading === room._id} onClick={() => handleApprove(room._id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                              disabled={actionLoading === room._id} onClick={() => setRejectTarget(room)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối phòng này?</DialogTitle>
            <DialogDescription>Chủ trọ sẽ nhận được thông báo và cần chỉnh sửa để đăng lại.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={handleReject} disabled={Boolean(actionLoading)}>Từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
