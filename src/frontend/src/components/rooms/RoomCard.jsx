import { Link } from 'react-router-dom'
import { Eye, MapPin, Maximize2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FavoriteButton } from '@/components/rooms/FavoriteButton'
import { CompareButton } from '@/components/compare/CompareBar'

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
  // legacy object fallback
  return address.fullAddress || [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

export function RoomCard({ room, distanceText }) {
  if (!room) return null

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      {/* Ảnh */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {room.images?.[0] ? (
          <img
            src={room.images[0]}
            alt={room.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Chưa có ảnh
          </div>
        )}

        {/* Badge trạng thái góc trên trái — chỉ hiện khi field isAvailable có giá trị rõ ràng */}
        {room.isAvailable !== undefined && (
          <div className="absolute left-2 top-2">
            <Badge
              variant={room.isAvailable ? 'success' : 'muted'}
              className="shadow-sm"
            >
              {room.isAvailable ? 'Còn trống' : 'Hết phòng'}
            </Badge>
          </div>
        )}

        {/* Nút yêu thích + so sánh góc trên phải */}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <CompareButton room={room} />
          <FavoriteButton roomId={room._id} size="icon" />
        </div>
      </div>

      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="line-clamp-2 text-base leading-snug">{room.title}</CardTitle>
        <CardDescription className="line-clamp-1 text-xs">{formatAddress(room.address)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Giá + Diện tích */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-primary">{formatCurrency(room.price)}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Maximize2 className="h-3 w-3" />
            <span>{room.area} m²</span>
          </div>
        </div>

        {/* Khoảng cách */}
        {distanceText ? (
          <div className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Cách bạn {distanceText}</span>
          </div>
        ) : null}

        {/* Nút xem */}
        <Button asChild className="w-full" size="sm">
          <Link to={`/rooms/${room.slug}`}>
            <Eye className="h-4 w-4" />
            Xem chi tiết
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
