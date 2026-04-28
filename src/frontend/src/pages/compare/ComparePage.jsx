import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GitCompare, MapPin, Wifi, Wind, Flame, Package, WashingMachine, ChefHat, Car, ShieldCheck, Camera, Trees, Sofa, Bath, Zap, ArrowUp, X, ExternalLink, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { compareRoomsApi } from '@/services/compareService'
import { useCompareStore } from '@/store/compareStore'
import { FavoriteButton } from '@/components/rooms/FavoriteButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LocationPickerDialog } from '@/components/common/LocationPickerDialog'

const amenityConfig = {
  wifi: { label: 'Wifi', icon: Wifi },
  'điều_hòa': { label: 'Điều hòa', icon: Wind },
  'nóng_lạnh': { label: 'Nóng lạnh', icon: Flame },
  'tủ_lạnh': { label: 'Tủ lạnh', icon: Package },
  'máy_giặt': { label: 'Máy giặt', icon: WashingMachine },
  bếp: { label: 'Bếp', icon: ChefHat },
  'chỗ_để_xe': { label: 'Chỗ để xe', icon: Car },
  'an_ninh': { label: 'An ninh', icon: ShieldCheck },
  camera: { label: 'Camera', icon: Camera },
  'thang_máy': { label: 'Thang máy', icon: ArrowUp },
  'ban_công': { label: 'Ban công', icon: Trees },
  'nội_thất': { label: 'Nội thất', icon: Sofa },
  'vệ_sinh_riêng': { label: 'Vệ sinh riêng', icon: Bath },
  'điện_nước_riêng': { label: 'Điện nước riêng', icon: Zap },
}
const ALL_AMENITIES = Object.keys(amenityConfig)

function formatCurrency(v) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0)
}

function Row({ label, children, className }) {
  return (
    <tr className={cn('border-b last:border-0', className)}>
      <td className="w-36 shrink-0 bg-muted/30 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide align-top">
        {label}
      </td>
      {children}
    </tr>
  )
}

function Cell({ children, highlight, className }) {
  return (
    <td className={cn('px-4 py-3 align-top text-sm', highlight && 'bg-primary/5 font-semibold', className)}>
      {children}
    </td>
  )
}

export default function ComparePage() {
  const navigate = useNavigate()
  const { rooms: compareList, removeRoom, clearRooms } = useCompareStore()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)

  useEffect(() => {
    if (compareList.length < 2) return
    setLoading(true)
    const ids = compareList.map((r) => r._id)
    compareRoomsApi(ids, userLocation?.lat, userLocation?.lng)
      .then((res) => setRooms(res.data?.data?.rooms || []))
      .catch(() => toast.error('Không thể tải dữ liệu so sánh'))
      .finally(() => setLoading(false))
  }, [compareList, userLocation])

  if (compareList.length < 2) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <GitCompare className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-xl font-bold">Chưa đủ phòng để so sánh</h1>
        <p className="text-sm text-muted-foreground">Chọn ít nhất 2 phòng từ trang tìm kiếm để so sánh.</p>
        <Button onClick={() => navigate('/search')}>Tìm phòng</Button>
      </div>
    )
  }

  // Highlight helpers
  const minPrice = rooms.length ? Math.min(...rooms.map((r) => r.price || Infinity)) : 0
  const maxArea = rooms.length ? Math.max(...rooms.map((r) => r.area || 0)) : 0

  const colCount = rooms.length || compareList.length

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 pb-28">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <GitCompare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">So sánh phòng trọ</h1>
            <p className="text-sm text-muted-foreground">{compareList.length} phòng đang so sánh</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!userLocation ? (
            <Button variant="outline" size="sm" onClick={() => setLocationPickerOpen(true)} className="gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" /> Bật vị trí
            </Button>
          ) : (
            <button
              onClick={() => setLocationPickerOpen(true)}
              className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" /> Đang hiển thị khoảng cách · Đổi vị trí
            </button>
          )}
          <Button variant="outline" size="sm" onClick={() => { clearRooms(); navigate('/search') }}>
            <X className="h-4 w-4" /> Xoá tất cả
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[600px]">
          <colgroup>
            <col className="w-36" />
            {Array.from({ length: colCount }).map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr className="border-b">
              <th className="bg-muted/30 px-4 py-3"></th>
              {loading
                ? Array.from({ length: compareList.length }).map((_, i) => (
                  <th key={i} className="px-4 py-3"><Skeleton className="h-32 w-full rounded-lg" /></th>
                ))
                : rooms.map((room) => (
                  <th key={room._id} className="px-4 py-3 text-left">
                    <div className="space-y-2">
                      <div className="relative">
                        {room.images?.[0] ? (
                          <img src={room.images[0]} alt={room.title} className="h-36 w-full rounded-lg object-cover" />
                        ) : (
                          <div className="h-36 w-full rounded-lg bg-muted flex items-center justify-center text-2xl">🏠</div>
                        )}
                        <button
                          onClick={() => removeRoom(room._id)}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 shadow hover:bg-destructive hover:text-white transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-semibold text-sm leading-snug line-clamp-2">{room.title}</p>
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {/* Giá */}
            <Row label="Giá thuê">
              {loading
                ? Array.from({ length: compareList.length }).map((_, i) => <Cell key={i}><Skeleton className="h-6 w-28" /></Cell>)
                : rooms.map((room) => (
                  <Cell key={room._id} highlight={room.price === minPrice}>
                    <span className={cn('text-base font-bold', room.price === minPrice ? 'text-emerald-600' : 'text-primary')}>
                      {formatCurrency(room.price)}
                    </span>
                    {room.price === minPrice && <span className="ml-1.5 text-xs font-normal text-emerald-600">✓ Rẻ nhất</span>}
                  </Cell>
                ))}
            </Row>

            {/* Diện tích */}
            <Row label="Diện tích">
              {loading
                ? Array.from({ length: compareList.length }).map((_, i) => <Cell key={i}><Skeleton className="h-5 w-20" /></Cell>)
                : rooms.map((room) => (
                  <Cell key={room._id} highlight={room.area === maxArea}>
                    {room.area} m²
                    {room.area === maxArea && <span className="ml-1.5 text-xs text-blue-600">✓ Rộng nhất</span>}
                  </Cell>
                ))}
            </Row>

            {/* Khoảng cách */}
            {rooms.some((r) => r.distance_km !== undefined) && (
              <Row label="Khoảng cách">
                {rooms.map((room) => (
                  <Cell key={room._id}>
                    {room.distance_km !== undefined ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {room.distance_km} km
                      </span>
                    ) : '—'}
                  </Cell>
                ))}
              </Row>
            )}

            {/* Trạng thái */}
            <Row label="Trạng thái">
              {loading
                ? Array.from({ length: compareList.length }).map((_, i) => <Cell key={i}><Skeleton className="h-5 w-20" /></Cell>)
                : rooms.map((room) => (
                  <Cell key={room._id}>
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      room.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                      {room.isAvailable ? '✅ Còn trống' : '❌ Hết phòng'}
                    </span>
                  </Cell>
                ))}
            </Row>

            {/* Tiện ích */}
            {ALL_AMENITIES.map((key) => {
              const config = amenityConfig[key]
              if (!rooms.length) return null
              // Chỉ hiện nếu ít nhất 1 phòng có tiện ích này
              if (!rooms.some((r) => (r.amenities || []).includes(key))) return null
              const Icon = config.icon
              return (
                <Row key={key} label={config.label}>
                  {rooms.map((room) => {
                    const has = (room.amenities || []).includes(key)
                    return (
                      <Cell key={room._id}>
                        <span className={has ? 'text-emerald-600' : 'text-muted-foreground/40'}>
                          {has ? '✅' : '❌'}
                        </span>
                      </Cell>
                    )
                  })}
                </Row>
              )
            })}

            {/* Actions */}
            <Row label="">
              {loading
                ? Array.from({ length: compareList.length }).map((_, i) => <Cell key={i}><Skeleton className="h-9 w-full" /></Cell>)
                : rooms.map((room) => (
                  <Cell key={room._id}>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" asChild>
                        <Link to={`/rooms/${room.slug}`}>
                          <ExternalLink className="h-3.5 w-3.5" /> Xem chi tiết
                        </Link>
                      </Button>
                      <FavoriteButton roomId={room._id} size="sm" className="w-full justify-center" />
                    </div>
                  </Cell>
                ))}
            </Row>
          </tbody>
        </table>
      </div>

      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(coords) => { setUserLocation(coords); toast.success('Đã cập nhật vị trí') }}
      />
    </div>
  )
}
