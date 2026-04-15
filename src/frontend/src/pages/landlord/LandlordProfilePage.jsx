import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  MapPin, MessageCircle, Home, CheckCircle2,
  CalendarDays, Phone, LayoutGrid, List, Building2,
  BadgeCheck, Info, Camera, TrendingUp, Clock,
} from 'lucide-react'
import { getLandlordPublicProfileApi } from '@/services/userService'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomCard } from '@/components/rooms/RoomCard'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtPrice = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0)

const fmtAddr = (a) => {
  if (!a) return 'Vĩnh Long'
  if (typeof a === 'string') return a
  return a.fullAddress || [a.ward, a.district, a.city].filter(Boolean).join(', ')
}

// ── Room List Item ─────────────────────────────────────────────────────────
function RoomListItem({ room }) {
  return (
    <Link
      to={`/rooms/${room.slug}`}
      className="group flex gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="relative h-[72px] w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
        {room.images?.[0]
          ? <img src={room.images[0]} alt={room.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Chưa có ảnh</div>}
        <span className={cn(
          'absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
          room.isAvailable ? 'bg-emerald-500 text-white' : 'bg-zinc-500/80 text-white'
        )}>
          {room.isAvailable ? 'Trống' : 'Đã thuê'}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <p className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{room.title}</p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />{fmtAddr(room.address)}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {fmtPrice(room.price)}<span className="text-[11px] font-normal text-muted-foreground">/th</span>
          </span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{room.area} m²</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div>
      <Skeleton className="h-52 w-full rounded-none sm:h-64 lg:h-72" />
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-end gap-4 -mt-12 mb-4">
          <Skeleton className="h-28 w-28 rounded-full shrink-0 border-4 border-background" />
          <div className="flex-1 pb-2 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="h-px bg-border mb-3" />
        <div className="flex gap-6">
          <Skeleton className="hidden lg:block h-80 w-[280px] rounded-xl shrink-0" />
          <div className="flex-1 space-y-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function LandlordProfilePage() {
  const { username } = useParams()
  const user = useSelector((s) => s.auth?.user)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rooms') // 'rooms' | 'about'
  const [view, setView] = useState('grid')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    getLandlordPublicProfileApi(username)
      .then((r) => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <PageSkeleton />

  if (!data) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">🏠</div>
      <h2 className="text-lg font-semibold">Không tìm thấy chủ trọ</h2>
      <p className="text-sm text-muted-foreground">Trang hồ sơ này không tồn tại hoặc đã bị xoá.</p>
      <Button variant="outline" asChild><Link to="/search">Tìm phòng trọ</Link></Button>
    </div>
  )

  const { landlord, rooms, stats } = data
  const goMsg = () => { if (!user) { navigate('/login'); return }; navigate(`/messages?to=${landlord._id}`) }
  const joinedDate = new Date(landlord.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  const filteredRooms = rooms.filter((r) =>
    filter === 'available' ? r.isAvailable : filter === 'rented' ? !r.isAvailable : true
  )

  const TABS = [
    { key: 'rooms', label: 'Phòng trọ', count: rooms.length },
    { key: 'about', label: 'Giới thiệu' },
  ]

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-muted/10">

      {/* ━━━ COVER STRIP (neutral) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="h-36 bg-muted/40 border-b sm:h-44 lg:h-52" />

      {/* ━━━ PROFILE SECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-card border-b shadow-sm">
        <div className="mx-auto max-w-5xl px-4">

          {/* Avatar + Name row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3">

            {/* Left: avatar + identity */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar — overlaps cover */}
              <div className="relative -mt-14 shrink-0 sm:-mt-16">
                {landlord.avatar ? (
                  <img
                    src={landlord.avatar}
                    alt={landlord.name}
                    className="h-28 w-28 rounded-full border-4 border-card object-cover shadow-md sm:h-32 sm:w-32"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-card bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl font-extrabold shadow-md sm:h-32 sm:w-32">
                    {(landlord.name || 'C')[0].toUpperCase()}
                  </div>
                )}
                {/* Online dot */}
                <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-card bg-emerald-500 shadow-sm" />
              </div>

              {/* Name + meta */}
              <div className="sm:pb-3 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{landlord.name}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/80 dark:bg-blue-900/40 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    <BadgeCheck className="h-3 w-3" />Chủ trọ
                  </span>
                </div>
                {landlord.username && (
                  <p className="text-sm font-mono text-muted-foreground">@{landlord.username}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {stats.totalRooms} phòng trọ · {stats.availableRooms} còn trống
                </p>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex flex-wrap gap-2 sm:pb-3">
              <Button className="gap-2 rounded-lg font-semibold px-5" onClick={goMsg}>
                <MessageCircle className="h-4 w-4" />Nhắn tin
              </Button>
              {landlord.phone && (
                <Button variant="outline" className="gap-2 rounded-lg" asChild>
                  <a href={`tel:${landlord.phone}`}>
                    <Phone className="h-4 w-4" />{landlord.phone}
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* ── TAB NAV (Facebook-style) ─────────────────────────────── */}
          <div className="flex items-center gap-1 border-t">
            {TABS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold transition-colors',
                  activeTab === key
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t-full'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-t-lg'
                )}
              >
                {label}
                {count !== undefined && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    activeTab === key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━ CONTENT (2-col layout like Facebook) ━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

          {/* ── LEFT SIDEBAR: Giới thiệu ──────────────────────────── */}
          <aside className={cn(
            'w-full lg:sticky sticky-top-content lg:w-[300px] shrink-0 space-y-3',
            activeTab === 'about' ? 'block' : 'hidden lg:block'
          )}>
            <div className="rounded-xl bg-card border p-4 space-y-3">
              <h2 className="text-base font-bold">Giới thiệu</h2>

              <div className="space-y-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <span>Tham gia từ <strong className="text-foreground">{joinedDate}</strong></span>
                </div>
                {landlord.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    <a href={`tel:${landlord.phone}`} className="hover:text-primary transition-colors font-medium text-foreground">
                      {landlord.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Tổng phòng', val: stats.totalRooms, color: 'text-blue-600' },
                  { label: 'Còn trống', val: stats.availableRooms, color: 'text-emerald-600' },
                  { label: 'Điểm TB', val: Number(stats.avgRating) > 0 ? Number(stats.avgRating).toFixed(1) : '—', color: 'text-amber-500' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-lg bg-muted/30 p-2">
                    <div className={cn('text-xl font-extrabold', color)}>{val}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Response rate */}
              {(landlord.responseRate != null || landlord.avgResponseTime != null) && (
                <>
                  <div className="h-px bg-border" />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tỷ lệ phản hồi</p>
                    {landlord.responseRate != null && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Tỷ lệ rep tin nhắn</span>
                            <span className="text-sm font-bold text-emerald-600">{landlord.responseRate}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${landlord.responseRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {landlord.avgResponseTime != null && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span>Thời gian TB: <strong className="text-foreground">
                          {landlord.avgResponseTime < 60
                            ? `${landlord.avgResponseTime} phút`
                            : landlord.avgResponseTime < 1440
                            ? `${Math.round(landlord.avgResponseTime / 60)} giờ`
                            : `${Math.round(landlord.avgResponseTime / 1440)} ngày`}
                        </strong></span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick links */}
            <div className="rounded-xl bg-card border p-4 space-y-1">
              <h2 className="text-sm font-bold mb-2">Lọc nhanh</h2>
              {[
                { key: 'all', label: '🏠 Tất cả phòng', count: rooms.length },
                { key: 'available', label: '✅ Còn trống', count: stats.availableRooms },
                { key: 'rented', label: '🔒 Đã thuê', count: rooms.length - stats.availableRooms },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => { setFilter(key); setActiveTab('rooms') }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                    filter === key && activeTab === 'rooms'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{count}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* ── RIGHT: Danh sách phòng ────────────────────────────── */}
          <div className={cn('flex-1 min-w-0 space-y-3', activeTab === 'about' ? 'hidden lg:block' : 'block')}>

            {/* Toolbar */}
            <div className="rounded-xl bg-card border p-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {filter === 'all' ? `Tất cả phòng (${rooms.length})`
                  : filter === 'available' ? `Còn trống (${stats.availableRooms})`
                    : `Đã thuê (${rooms.length - stats.availableRooms})`}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-lg border bg-muted/40 p-0.5">
                  {[
                    { val: 'grid', Icon: LayoutGrid },
                    { val: 'list', Icon: List },
                  ].map(({ val, Icon }) => (
                    <button key={val} onClick={() => setView(val)}
                      className={cn('rounded-md p-1.5 transition-colors', view === val ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Room list */}
            {filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 round-xl border bg-card border-dashed rounded-xl gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl">🏠</div>
                <p className="text-sm text-muted-foreground">
                  {filter === 'available' ? 'Chưa có phòng trống.' : filter === 'rented' ? 'Chưa có phòng đã thuê.' : 'Chủ trọ chưa đăng phòng nào.'}
                </p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredRooms.map((r) => <RoomCard key={r._id} room={r} />)}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRooms.map((r) => <RoomListItem key={r._id} room={r} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
