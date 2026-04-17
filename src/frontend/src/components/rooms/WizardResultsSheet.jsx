import { Link } from 'react-router-dom'
import { RefreshCw, MapPin, Ruler, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const TYPE_LABELS = {
  phòng_trọ:       { label: 'Phòng trọ',     cls: 'bg-blue-100 text-blue-700' },
  chung_cư_mini:   { label: 'Chung cư mini',  cls: 'bg-purple-100 text-purple-700' },
  nhà_nguyên_căn:  { label: 'Nhà nguyên căn', cls: 'bg-green-100 text-green-700' },
  ký_túc_xá:       { label: 'Ký túc xá',      cls: 'bg-orange-100 text-orange-700' },
}

function RoomCard({ room }) {
  const price = new Intl.NumberFormat('vi-VN').format(room.price)
  const typeCfg = TYPE_LABELS[room.roomType] || { label: room.roomType, cls: 'bg-muted text-muted-foreground' }

  return (
    <Link
      to={`/rooms/${room.slug}`}
      className="group flex gap-3 rounded-xl border bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all"
    >
      {/* Thumbnail */}
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        {room.images?.[0] ? (
          <img
            src={room.images[0]}
            alt={room.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🏠</div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {room.title}
          </p>
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', typeCfg.cls)}>
            {typeCfg.label}
          </span>
        </div>

        <p className="text-base font-bold text-primary">
          {price}
          <span className="text-xs font-normal text-muted-foreground ml-1">đ/tháng</span>
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1">
            <Ruler className="h-3 w-3" />{room.area} m²
          </span>
          {room.averageRating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {room.averageRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1 min-w-0 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{room.address}</span>
          </span>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </Link>
  )
}

export function WizardResultsSheet({ open, rooms, onClose, onRetry }) {
  const titleNode = (
    <div className="flex items-center justify-between w-full pr-4">
      <span className="flex items-center gap-2">
        <span className="text-xl">🏠</span>
        <span>
          Tìm được <span className="text-primary">{rooms.length}</span> phòng phù hợp
        </span>
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Sửa tiêu chí
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
          <Link to="/search" onClick={onClose}>Xem tất cả →</Link>
        </Button>
      </div>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} side="right" title={titleNode}>
      <div className="space-y-3 pb-6">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <span className="text-5xl">😔</span>
            <p className="text-sm">Không tìm thấy phòng phù hợp với tiêu chí của bạn.</p>
            <Button variant="outline" onClick={onRetry} className="gap-2 mt-1">
              <RefreshCw className="h-4 w-4" /> Thử lại với tiêu chí khác
            </Button>
          </div>
        ) : (
          rooms.map((room) => <RoomCard key={room._id} room={room} />)
        )}
      </div>
    </Sheet>
  )
}
