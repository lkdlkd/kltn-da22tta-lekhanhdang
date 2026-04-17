import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Ruler } from 'lucide-react'
import { getSimilarRoomsApi } from '@/services/recommendService'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  phòng_trọ:       { label: 'Phòng trọ',     cls: 'bg-blue-100 text-blue-700' },
  chung_cư_mini:   { label: 'Chung cư mini',  cls: 'bg-purple-100 text-purple-700' },
  nhà_nguyên_căn:  { label: 'Nhà nguyên căn', cls: 'bg-green-100 text-green-700' },
  ký_túc_xá:       { label: 'Ký túc xá',      cls: 'bg-orange-100 text-orange-700' },
}

function RoomTypeBadge({ type }) {
  const config = TYPE_LABELS[type] || { label: type, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', config.cls)}>
      {config.label}
    </span>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SimilarSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border overflow-hidden">
          <Skeleton className="h-44 w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Room card ─────────────────────────────────────────────────────────────────
function SimilarRoomCard({ room }) {
  const image = room.images?.[0]
  const price = new Intl.NumberFormat('vi-VN').format(room.price)

  return (
    <Link
      to={`/rooms/${room.slug}`}
      className="group flex flex-col rounded-2xl border bg-card overflow-hidden
                 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-muted shrink-0">
        {image ? (
          <img
            src={image}
            alt={room.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30 text-4xl">
            🏠
          </div>
        )}
        <div className="absolute top-2 left-2">
          <RoomTypeBadge type={room.roomType} />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <p className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {room.title}
        </p>

        <p className="text-base font-bold text-primary">
          {price}
          <span className="text-xs font-normal text-muted-foreground ml-1">đ/tháng</span>
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            {room.area} m²
          </span>
          <span className="flex items-center gap-1 truncate min-w-0">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{room.address}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function SimilarRooms({ roomId, limit = 6 }) {
  const [rooms, setRooms]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    setLoading(true)
    getSimilarRoomsApi(roomId, limit)
      .then((res) => {
        if (!cancelled) setRooms(res.data?.data?.rooms || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [roomId, limit])

  if (!loading && rooms.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Phòng tương tự</h2>
        {!loading && rooms.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {rooms.length} phòng gợi ý ở gần đây
          </span>
        )}
      </div>

      {loading ? (
        <SimilarSkeleton count={limit} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <SimilarRoomCard key={room._id} room={room} />
          ))}
        </div>
      )}
    </section>
  )
}
