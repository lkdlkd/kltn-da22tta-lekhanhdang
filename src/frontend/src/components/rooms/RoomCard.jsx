import { Link } from 'react-router-dom'
import { Eye, Home, MapPin, Maximize2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompareButton } from '@/components/compare/CompareBar'
import { FavoriteButton } from '@/components/rooms/FavoriteButton'
import { cn } from '@/lib/utils'

export function formatRoomPrice(value) {
  if (!value) return 'Đang cập nhật'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatRoomAddress(address) {
  if (!address) return ''
  if (typeof address === 'string') return address
  return address.fullAddress || [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

function StatusBadge({ value }) {
  if (value === undefined || value === null) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        'border text-[10px] font-semibold shadow-sm',
        value
          ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/70 dark:text-sky-300'
          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
      )}
    >
      {value ? 'Còn trống' : 'Đã cho thuê'}
    </Badge>
  )
}

export function RoomCardSkeleton({ view = 'grid' }) {
  const list = view === 'list'

  return (
    <Card className="overflow-hidden rounded-lg">
      <CardContent className={cn('p-0', list && 'grid sm:grid-cols-[220px_1fr]')}>
        <Skeleton className={cn('rounded-none', list ? 'aspect-[16/10] sm:aspect-auto' : 'aspect-[4/3]')} />
        <div className="space-y-3 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function RoomCard({
  room,
  view = 'grid',
  highlighted = false,
  distanceText,
  distanceLabel = 'Cách bạn',
  showActions = true,
  showFavorite = true,
  showCompare = true,
  showViewButton = true,
  initialFavorited = false,
  actionSlot,
  amenitiesMap,
  className,
}) {
  if (!room) return null

  const list = view === 'list'
  const address = formatRoomAddress(room.address)
  const image = room.images?.[0]
  const amenityLimit = list ? 6 : 4

  return (
    <Card
      className={cn(
        'group h-full overflow-hidden rounded-lg transition-colors hover:border-primary/40 hover:shadow-sm',
        highlighted && 'ring-2 ring-primary',
        className
      )}
    >
      <CardContent className={cn('flex h-full flex-col p-0', list && 'sm:grid sm:grid-cols-[220px_1fr]')}>
        <div className={cn('relative overflow-hidden bg-muted', list ? 'aspect-[16/10] sm:aspect-auto' : 'aspect-[4/3]')}>
          <Link to={`/rooms/${room.slug}`} className="block h-full w-full" aria-label={room.title}>
            {image ? (
              <img
                src={image}
                alt={room.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Home className="h-8 w-8" />
                <span className="text-xs">Chưa có ảnh</span>
              </div>
            )}
          </Link>

          <div className="absolute left-2 top-2">
            <StatusBadge value={room.isAvailable} />
          </div>

          {showActions && (
            <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
              {showCompare && <CompareButton room={room} size="icon" />}
              {showFavorite && <FavoriteButton roomId={room._id} size="icon" initialFavorited={initialFavorited} />}
              {actionSlot}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
          <div className="min-w-0">
            <Link to={`/rooms/${room.slug}`} className="line-clamp-2 text-xs sm:text-sm font-semibold leading-5 hover:text-primary">
              {room.title}
            </Link>
            {address && (
              <p className="mt-1 flex items-start gap-1 text-[10px] sm:text-xs leading-4 text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="line-clamp-2">{address}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
            <span className="text-sm sm:text-base font-bold text-primary">{formatRoomPrice(room.price)}</span>
            {room.area ? <span className="inline-flex items-center gap-0.5"><Maximize2 className="h-3 w-3" />{room.area} m²</span> : null}
            {room.capacity ? <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{room.capacity} người</span> : null}
          </div>

          {distanceText && (
            <div className="inline-flex w-fit items-center gap-1 rounded-lg border bg-primary/5 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-primary">
              <MapPin className="h-3 w-3" />
              {distanceLabel} {distanceText}
            </div>
          )}

          {room.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {room.amenities.slice(0, list ? 6 : 2).map((amenity) => (
                <span key={amenity} className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
                  {amenitiesMap?.[amenity] || String(amenity).replace(/_/g, ' ')}
                </span>
              ))}
              {room.amenities.length > (list ? 6 : 2) && (
                <span className="px-1 py-0.5 text-[9px] sm:text-[10px] text-muted-foreground">+{room.amenities.length - (list ? 6 : 2)}</span>
              )}
            </div>
          )}

          {showViewButton && (
            <Button asChild size="sm" variant="default" className="mt-auto h-7 sm:h-8 rounded-lg text-xs hidden sm:flex">
              <Link to={`/rooms/${room.slug}`}>
                <Eye className="h-3.5 w-3.5" />
                Xem chi tiết
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
