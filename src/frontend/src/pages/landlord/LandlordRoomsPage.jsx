import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Eye, Home, DoorOpen, Users } from 'lucide-react'
import { getMyRoomsApi, deleteRoomApi } from '@/services/roomService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatAddress(address) {
  if (!address) return ''
  if (typeof address === 'string') return address
  return address.fullAddress || [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

// ── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <Card className={`border-l-4 ${colorClass}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Skeleton loading ────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat skeletons */}
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Room card skeletons */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40 w-full rounded-none" />
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function LandlordRoomsPage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState(null)

  const totalRooms = rooms.length
  const availableRooms = rooms.filter((room) => room.isAvailable).length
  const totalCapacity = rooms.reduce((total, room) => total + Number(room.capacity || 0), 0)

  const fetchMyRooms = async () => {
    try {
      setLoading(true)
      const res = await getMyRoomsApi()
      setRooms(res.data?.data?.rooms || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách phòng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyRooms()
  }, [])

  const handleDelete = async (roomId) => {
    try {
      setDeletingId(roomId)
      await deleteRoomApi(roomId)
      toast.success('Đã xoá phòng')
      setRooms((prev) => prev.filter((item) => item._id !== roomId))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xoá phòng thất bại')
    } finally {
      setDeletingId('')
    }
  }

  const openDeleteDialog = (room) => {
    setPendingDeleteRoom(room)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteRoom?._id) return
    await handleDelete(pendingDeleteRoom._id)
    setDeleteDialogOpen(false)
    setPendingDeleteRoom(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phòng trọ</h1>
          <p className="text-sm text-muted-foreground">Tạo, chỉnh sửa và quản lý tin đăng của bạn</p>
        </div>
        <Button asChild>
          <Link to="/landlord/rooms/create">
            <Plus className="h-4 w-4" />
            Tạo phòng mới
          </Link>
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Tổng tin đăng"
              value={totalRooms}
              icon={Home}
              colorClass="border-l-blue-500"
              bgClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatCard
              label="Phòng còn trống"
              value={availableRooms}
              icon={DoorOpen}
              colorClass="border-l-emerald-500"
              bgClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            />
            <StatCard
              label="Tổng sức chứa"
              value={`${totalCapacity} người`}
              icon={Users}
              colorClass="border-l-violet-500"
              bgClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
            />
          </div>

          {/* Empty state */}
          {rooms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Home className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Bạn chưa có phòng nào</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tạo tin đăng đầu tiên để bắt đầu nhận liên hệ từ sinh viên.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/landlord/rooms/create">
                    <Plus className="h-4 w-4" />
                    Tạo phòng ngay
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Danh sách phòng */
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => (
                <Card key={room._id} className="group overflow-hidden transition-all duration-200 hover:shadow-md">
                  {/* Ảnh */}
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {room.images?.[0] ? (
                      <img
                        src={room.images[0]}
                        alt={room.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Chưa có ảnh đại diện
                      </div>
                    )}
                    {/* Badge overlay */}
                    <div className="absolute left-2 top-2">
                      <Badge variant={room.isAvailable ? 'success' : 'muted'} className="shadow-sm">
                        {room.isAvailable ? 'Còn trống' : 'Đã cho thuê'}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="text-base leading-snug line-clamp-2">{room.title}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">{formatAddress(room.address)}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-md border bg-muted/40 p-2 text-center">
                        <p className="text-xs text-muted-foreground">Giá</p>
                        <p className="mt-0.5 text-xs font-semibold text-primary line-clamp-1">{formatCurrency(room.price)}</p>
                      </div>
                      <div className="rounded-md border bg-muted/40 p-2 text-center">
                        <p className="text-xs text-muted-foreground">Diện tích</p>
                        <p className="mt-0.5 text-xs font-semibold">{room.area} m²</p>
                      </div>
                      <div className="rounded-md border bg-muted/40 p-2 text-center">
                        <p className="text-xs text-muted-foreground">Chứa</p>
                        <p className="mt-0.5 text-xs font-semibold">{room.capacity} người</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/rooms/${room.slug}`}>
                          <Eye className="h-4 w-4" />
                          Xem
                        </Link>
                      </Button>
                      <Button variant="secondary" size="sm" asChild>
                        <Link to={`/landlord/rooms/${room._id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(room)}
                        disabled={deletingId === room._id}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === room._id ? 'Đang xoá...' : 'Xoá'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirm delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá phòng này?</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xoá vĩnh viễn tin đăng{' '}
              {pendingDeleteRoom?.title ? <strong>"{pendingDeleteRoom.title}"</strong> : 'đang chọn'}.
              Không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Huỷ</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={Boolean(deletingId)}>
              {deletingId ? 'Đang xoá...' : 'Xoá phòng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
