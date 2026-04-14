import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Eye, Home, DoorOpen,
  TrendingUp, Clock, AlertTriangle, Search,
  RefreshCw, MapPin, LayoutGrid, LayoutList,
} from 'lucide-react'
import { getMyRoomsApi, deleteRoomApi } from '@/services/roomService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────
function formatCurrency(value) {
  if (!value) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

function formatAddress(address) {
  if (!address) return ''
  if (typeof address === 'string') return address
  // legacy object fallback
  return address.fullAddress || [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

// ── Status config ──────────────────────────────────────────────────────
const STATUS_CFG = {
  approved: { label: 'Đã duyệt',   cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  pending:  { label: 'Chờ duyệt',  cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  rejected: { label: 'Từ chối',    cls: 'border-red-200 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  flagged:  { label: 'Vi phạm',    cls: 'border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
}

const FILTER_TABS = [
  { value: 'all',      label: 'Tất cả' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'pending',  label: 'Chờ duyệt' },
  { value: 'rejected', label: 'Từ chối' },
  { value: 'flagged',  label: 'Vi phạm' },
]

// ── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  const colors = {
    blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-500/20' },
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
    amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/20' },
    red:    { bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',     ring: 'ring-red-500/20' },
  }
  const c = colors[color] || colors.blue
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', c.bg, c.ring)}>
          <Icon className={cn('h-5 w-5', c.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
          <p className="text-2xl font-bold leading-none">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Room Card ──────────────────────────────────────────────────────────
function RoomCard({ room, onDelete, deleting }) {
  const sc = STATUS_CFG[room.status] || STATUS_CFG.pending
  const addr = formatAddress(room.address)

  return (
    <Card className={cn(
      'group overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col',
      room.status === 'flagged'  && 'border-orange-300 dark:border-orange-800',
      room.status === 'rejected' && 'border-red-300 dark:border-red-800 opacity-80',
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
        {room.images?.[0] ? (
          <img
            src={room.images[0]} alt={room.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground/40">
            <Home className="h-8 w-8" />
            <span className="text-xs">Chưa có ảnh</span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute inset-x-2 top-2 flex items-center justify-between">
          {/* Trạng thái duyệt */}
          <Badge variant="outline" className={cn('text-[10px] h-5 shadow-sm backdrop-blur-sm', sc.cls)}>
            {sc.label}
          </Badge>
          {/* Trạng thái phòng */}
          <Badge variant="outline" className={cn(
            'text-[10px] h-5 shadow-sm backdrop-blur-sm',
            room.isAvailable
              ? 'border-sky-200 bg-sky-50/90 text-sky-700'
              : 'border-slate-200 bg-slate-50/90 text-slate-600'
          )}>
            {room.isAvailable ? 'Còn trống' : 'Đã cho thuê'}
          </Badge>
        </div>

        {/* View count chip */}
        {room.viewCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            <Eye className="h-2.5 w-2.5" />
            {room.viewCount}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 gap-3">
        {/* Title + address */}
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">{room.title}</h3>
          {addr && (
            <p className="flex items-start gap-1 text-xs text-muted-foreground line-clamp-1">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />{addr}
            </p>
          )}
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-muted/40 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Giá/tháng</p>
            <p className="text-xs font-bold text-primary mt-0.5 line-clamp-1">{formatCurrency(room.price)}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Diện tích</p>
            <p className="text-xs font-semibold mt-0.5">{room.area} m²</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Sức chứa</p>
            <p className="text-xs font-semibold mt-0.5">{room.capacity} người</p>
          </div>
        </div>

        {/* Warning for flagged/rejected */}
        {(room.status === 'flagged' || room.status === 'rejected') && (
          <div className={cn(
            'flex items-start gap-2 rounded-lg p-2.5 text-xs',
            room.status === 'flagged'
              ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          )}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {room.status === 'flagged'
                ? 'Phòng này đang bị ẩn do vi phạm. Vui lòng liên hệ admin.'
                : 'Tin đăng bị từ chối. Hãy chỉnh sửa và đăng lại.'}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" asChild>
            <Link to={`/rooms/${room.slug}`}><Eye className="h-3.5 w-3.5" />Xem</Link>
          </Button>
          <Button variant="secondary" size="sm" className="flex-1 h-8 text-xs gap-1" asChild>
            <Link to={`/landlord/rooms/${room._id}/edit`}><Pencil className="h-3.5 w-3.5" />Sửa</Link>
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onDelete(room)}
            disabled={deleting === room._id}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Room Card (List / nằm ngang) ──────────────────────────────────
function RoomCardList({ room, onDelete, deleting }) {
  const sc = STATUS_CFG[room.status] || STATUS_CFG.pending
  const addr = formatAddress(room.address)

  return (
    <Card className={cn(
      'group overflow-hidden transition-all duration-200 hover:shadow-md',
      room.status === 'flagged'  && 'border-orange-300 dark:border-orange-800',
      room.status === 'rejected' && 'border-red-300 dark:border-red-800 opacity-80',
    )}>
      <CardContent className="flex gap-0 p-0">
        {/* Thumbnail */}
        <div className="relative w-36 sm:w-48 shrink-0 overflow-hidden bg-muted">
          {room.images?.[0] ? (
            <img
              src={room.images[0]} alt={room.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground/40">
              <Home className="h-6 w-6" />
            </div>
          )}
          {/* Status badge */}
          <div className="absolute bottom-2 left-2">
            <Badge variant="outline" className={cn('text-[10px] h-5 shadow-sm backdrop-blur-sm', sc.cls)}>
              {sc.label}
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 min-w-0 flex-col justify-between p-3 gap-2">
          {/* Top: title + address + availability */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-snug line-clamp-1">{room.title}</h3>
              {addr && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  <MapPin className="h-3 w-3 shrink-0" />{addr}
                </p>
              )}
            </div>
            <Badge variant="outline" className={cn(
              'text-[10px] h-5 shrink-0',
              room.isAvailable
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            )}>
              {room.isAvailable ? 'Trống' : 'Thuê'}
            </Badge>
          </div>

          {/* Mid: stats inline */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-primary">{formatCurrency(room.price)}</span>
            <span className="text-muted-foreground">• {room.area} m²</span>
            <span className="text-muted-foreground">• {room.capacity} người</span>
            {room.viewCount > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground ml-auto">
                <Eye className="h-3 w-3" />{room.viewCount}
              </span>
            )}
          </div>

          {/* Warning */}
          {(room.status === 'flagged' || room.status === 'rejected') && (
            <div className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs',
              room.status === 'flagged'
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            )}>
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">
                {room.status === 'flagged' ? 'Phòng bị ẩn do vi phạm.' : 'Tin đăng bị từ chối.'}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" asChild>
              <Link to={`/rooms/${room.slug}`}><Eye className="h-3 w-3" />Xem</Link>
            </Button>
            <Button variant="secondary" size="sm" className="h-7 text-xs gap-1 px-2" asChild>
              <Link to={`/landlord/rooms/${room._id}/edit`}><Pencil className="h-3 w-3" />Sửa</Link>
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-7 w-7 p-0 ml-auto text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onDelete(room)}
              disabled={deleting === room._id}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main ────────────────────────────────────────────────────────────────
export default function LandlordRoomsPage() {
  const [rooms, setRooms]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [deletingId, setDeletingId]     = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch]             = useState('')
  const [activeTab, setActiveTab]       = useState('all')
  const [viewMode, setViewMode]         = useState('grid') // 'grid' | 'list'

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

  useEffect(() => { fetchMyRooms() }, [])

  const handleDelete = async () => {
    if (!deleteTarget?._id) return
    try {
      setDeletingId(deleteTarget._id)
      await deleteRoomApi(deleteTarget._id)
      toast.success('Đã xoá phòng')
      setRooms(prev => prev.filter(r => r._id !== deleteTarget._id))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xoá phòng thất bại')
    } finally {
      setDeletingId('')
      setDeleteTarget(null)
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     rooms.length,
    available: rooms.filter(r => r.isAvailable && r.status === 'approved').length,
    pending:   rooms.filter(r => r.status === 'pending').length,
    flagged:   rooms.filter(r => r.status === 'flagged' || r.status === 'rejected').length,
    views:     rooms.reduce((s, r) => s + (r.viewCount || 0), 0),
  }), [rooms])

  // ── Filtered rooms ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? rooms : rooms.filter(r => r.status === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        formatAddress(r.address).toLowerCase().includes(q)
      )
    }
    return list
  }, [rooms, activeTab, search])

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phòng trọ</h1>
          <p className="text-sm text-muted-foreground">Tạo, chỉnh sửa và quản lý tin đăng của bạn</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchMyRooms} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button asChild>
            <Link to="/landlord/rooms/create">
              <Plus className="h-4 w-4" />Tạo phòng mới
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0,1,2,3].map(i => (
            <Card key={i}><CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-12" /></div>
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng tin đăng"     value={stats.total}     icon={Home}       color="blue" />
          <StatCard label="Đang cho thuê"     value={stats.available} icon={DoorOpen}   color="green"
            sub={stats.total > 0 ? `${Math.round(stats.available/stats.total*100)}% tin đã duyệt` : ''} />
          <StatCard label="Chờ duyệt / cảnh báo" value={stats.pending + stats.flagged}
            icon={stats.flagged > 0 ? AlertTriangle : Clock}
            color={stats.flagged > 0 ? 'red' : 'amber'}
            sub={stats.flagged > 0 ? `${stats.flagged} phòng vi phạm` : ''} />
          <StatCard label="Lượt xem"          value={stats.views.toLocaleString('vi')} icon={TrendingUp} color="violet" />
        </div>
      )}

      {/* Filter + Search */}
      {!loading && rooms.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex gap-0 border-b flex-1 min-w-0 overflow-x-auto">
            {FILTER_TABS.map(tab => {
              const count = tab.value === 'all' ? rooms.length : rooms.filter(r => r.status === tab.value).length
              if (count === 0 && tab.value !== 'all') return null
              return (
                <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
                    activeTab === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}>
                  {tab.label}
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                    activeTab === tab.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>{count}</span>
                </button>
              )
            })}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('list')}><LayoutList className="h-4 w-4" /></Button>
          </div>
          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, địa chỉ..."
              className="h-9 pl-8 w-48 text-sm"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0,1,2].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
                </div>
                <div className="flex gap-2"><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 flex-1" /><Skeleton className="h-8 w-8" /></div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              {rooms.length === 0 ? <Home className="h-8 w-8 text-muted-foreground" /> : <Search className="h-7 w-7 text-muted-foreground" />}
            </div>
            {rooms.length === 0 ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Bạn chưa có phòng nào</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Tạo tin đăng đầu tiên để bắt đầu nhận liên hệ từ sinh viên.</p>
                </div>
                <Button asChild><Link to="/landlord/rooms/create"><Plus className="h-4 w-4" />Tạo phòng ngay</Link></Button>
              </>
            ) : (
              <div>
                <h2 className="text-lg font-semibold">Không tìm thấy</h2>
                <p className="mt-1 text-sm text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(room => (
              <RoomCard key={room._id} room={room} onDelete={setDeleteTarget} deleting={deletingId} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(room => (
              <RoomCardList key={room._id} room={room} onDelete={setDeleteTarget} deleting={deletingId} />
            ))}
          </div>
        )
      )}

      {/* Delete dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />Xoá phòng này?
            </DialogTitle>
            <DialogDescription>
              Tin đăng <strong>"{deleteTarget?.title}"</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={Boolean(deletingId)}>
              <Trash2 className="h-4 w-4 mr-1.5" />{deletingId ? 'Đang xoá...' : 'Xoá phòng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
