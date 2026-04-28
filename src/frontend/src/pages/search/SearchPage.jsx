import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import {
  Search, SlidersHorizontal, Map as MapIcon, X,
  ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw,
  Wifi, Wind, WashingMachine, Package, ChefHat, Car,
  ShieldCheck, Flame, Sofa, Bath, LayoutGrid, Sparkles, LayoutList,
  MapPin,
} from 'lucide-react'
import { RoomFinderWizard } from '@/components/rooms/RoomFinderWizard'
import { searchRoomsApi } from '@/services/roomService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Sheet } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LocationPickerDialog } from '@/components/common/LocationPickerDialog'

/* ── Constants ─────────────────────────────────────────────────────────── */
const PRICE_MAX = 10_000_000
const AREA_MAX = 120

const ROOM_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'phòng_trọ', label: 'Phòng trọ' },
  { value: 'chung_cư_mini', label: 'Chung cư mini' },
  { value: 'nhà_nguyên_căn', label: 'Nhà nguyên căn' },
  { value: 'ký_túc_xá', label: 'Ký túc xá' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá: thấp → cao' },
  { value: 'price_desc', label: 'Giá: cao → thấp' },
  { value: 'views', label: 'Xem nhiều nhất' },
]

const AMENITIES = [
  { value: 'wifi', label: 'Wifi', icon: Wifi },
  { value: 'điều_hòa', label: 'Điều hòa', icon: Wind },
  { value: 'máy_giặt', label: 'Máy giặt', icon: WashingMachine },
  { value: 'tủ_lạnh', label: 'Tủ lạnh', icon: Package },
  { value: 'bếp', label: 'Bếp', icon: ChefHat },
  { value: 'chỗ_để_xe', label: 'Gửi xe', icon: Car },
  { value: 'an_ninh', label: 'An ninh', icon: ShieldCheck },
  { value: 'nóng_lạnh', label: 'Nóng lạnh', icon: Flame },
  { value: 'nội_thất', label: 'Nội thất', icon: Sofa },
  { value: 'vệ_sinh_riêng', label: 'VS riêng', icon: Bath },
]

const RADIUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: '1', label: '1 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
]

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmtShort = (v) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)} tr`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return `${v}đ`
}
const fmtVND = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

/* ── Haversine distance ────────────────────────────────────────────────── */
function calcDistance(userLoc, roomCoords) {
  // roomCoords: [lng, lat] (GeoJSON), userLoc: {lat, lng}
  if (!userLoc || !roomCoords || roomCoords.length < 2) return undefined
  const [lng2, lat2] = roomCoords
  const { lat: lat1, lng: lng1 } = userLoc
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const km = R * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

/* ── RangeSlider ─────────────────────────────────────────────────────────── */
function RangeSlider({ label, min, max, step, valueMin, valueMax, onCommit, formatVal, suffix = '' }) {
  const [local, setLocal] = useState([valueMin, valueMax])
  const debounceRef = useRef(null)

  useEffect(() => { setLocal([valueMin, valueMax]) }, [valueMin, valueMax])

  const handleChange = (vals) => {
    setLocal(vals)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommit(vals[0], vals[1]), 400)
  }

  return (
    <Section title={label}>
      <div className="space-y-3 px-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground min-w-0">
            <span className="truncate">{formatVal ? formatVal(local[0]) : `${local[0]}${suffix}`}</span>
          </div>
          <div className="h-px flex-1 bg-border/60" />
          <div className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground min-w-0">
            <span className="truncate">
              {local[1] >= max ? 'Không giới hạn' : formatVal ? formatVal(local[1]) : `${local[1]}${suffix}`}
            </span>
          </div>
        </div>
        <Slider min={min} max={max} step={step} value={local}
          onValueChange={handleChange} minStepsBetweenThumbs={1} className="py-1" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatVal ? formatVal(min) : `${min}${suffix}`}</span>
          <span>{formatVal ? formatVal(max) : `${max}${suffix}`}+</span>
        </div>
      </div>
    </Section>
  )
}

/* ── FilterPanel ─────────────────────────────────────────────────────────── */
function FilterPanel({ filters, onChange, onReset, activeCount, compact = false, userLocation, onRequestLocation }) {
  const toggleAmenity = (val) => {
    const cur = filters.amenities
    onChange('amenities', cur.includes(val) ? cur.filter(a => a !== val) : [...cur, val])
  }

  const commitPrice = useCallback((mn, mx) => onChange('_price', { min: mn, max: mx }), [onChange])
  const commitArea = useCallback((mn, mx) => onChange('_area', { min: mn, max: mx }), [onChange])

  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>

      {/* Reset button */}
      {activeCount > 0 && (
        <button type="button" onClick={onReset}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
          <RotateCcw className="h-3 w-3" />
          Xoá {activeCount} bộ lọc
        </button>
      )}

      {/* Loại phòng */}
      <Section title="Loại phòng">
        <div className="flex flex-wrap gap-1.5">
          {ROOM_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => onChange('roomType', t.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                filters.roomType === t.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Giá thuê */}
      <RangeSlider label="Giá thuê / tháng"
        min={0} max={PRICE_MAX} step={100_000}
        valueMin={filters.minPrice} valueMax={filters.maxPrice}
        formatVal={fmtShort} onCommit={commitPrice} />

      <Separator />

      {/* Diện tích */}
      <RangeSlider label="Diện tích (m²)"
        min={0} max={AREA_MAX} step={5}
        valueMin={filters.minArea} valueMax={filters.maxArea}
        suffix=" m²" onCommit={commitArea} />

      <Separator />

      {/* Trạng thái */}
      <Section title="Trạng thái">
        <button type="button"
          onClick={() => onChange('isAvailable', filters.isAvailable === 'true' ? '' : 'true')}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-all',
            filters.isAvailable === 'true'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-foreground hover:border-primary/40'
          )}>
          <span className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
            filters.isAvailable === 'true' ? 'border-primary bg-primary' : 'border-muted-foreground/40'
          )}>
            {filters.isAvailable === 'true' && (
              <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="text-xs font-medium">Chỉ phòng còn trống</span>
        </button>
      </Section>

      <Separator />

      {/* Bán kính */}
      <Section title="Bán kính từ vị trí bạn">
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map(r => (
            <button key={r.value} type="button"
              onClick={() => {
                onChange('radius', r.value)
                if (r.value && !userLocation) onRequestLocation?.()
              }}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all text-center',
                filters.radius === r.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}>
              {r.label}
            </button>
          ))}
        </div>
        {!userLocation && (
          <p className="text-[10px] text-muted-foreground">
            Chọn bán kính sẽ mở hộp thoại chọn vị trí
          </p>
        )}
      </Section>

      <Separator />

      {/* Tiện ích */}
      <Section title="Tiện ích">
        <div className={cn('grid gap-1.5', compact ? 'grid-cols-3' : 'grid-cols-2')}>
          {AMENITIES.map(({ value, label, icon: Icon }) => {
            const on = filters.amenities.includes(value)
            return (
              <button key={value} type="button" onClick={() => toggleAmenity(value)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all duration-150',
                  on
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                )}>
                <Icon className={cn('h-3.5 w-3.5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} />
                <span className="leading-tight truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

/* ── CardSkeleton ─────────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" />
        <div className="flex justify-between pt-1"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-14" /></div>
      </div>
    </div>
  )
}

/* ── Pagination ───────────────────────────────────────────────────────────── */
function Pagination({ page, total, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i)
    else if (pages[pages.length - 1] !== '…') pages.push('…')
  }
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-xs text-muted-foreground">Trang {page} / {totalPages} · {total} kết quả</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg"
          onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="w-8 text-center text-sm text-muted-foreground">…</span>
          : <Button key={p} size="icon" className="h-8 w-8 rounded-lg text-xs"
            variant={p === page ? 'default' : 'outline'} onClick={() => onChange(p)}>{p}</Button>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg"
          onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ── SearchRoomListCard — card nằm ngang ────────────────────────────────── */
function SearchRoomListCard({ room, highlighted, distanceText }) {

  const addr = typeof room.address === 'string'
    ? room.address
    : room.address?.fullAddress
    || [room.address?.street, room.address?.ward, room.address?.district, room.address?.city].filter(Boolean).join(', ')

  return (
    <Link to={`/rooms/${room.slug}`} className="block">
      <Card className={cn(
        'group overflow-hidden transition-all duration-200 hover:shadow-md',
        highlighted && 'ring-2 ring-primary shadow-md'
      )}>
        <CardContent className="flex gap-0 p-0">
          {/* Thumbnail */}
          <div className="relative w-36 sm:w-52 shrink-0 overflow-hidden bg-muted">
            {room.images?.[0] ? (
              <img src={room.images[0]} alt={room.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground/30">
                <span className="text-3xl">🏠</span>
              </div>
            )}
            {room.isAvailable !== undefined && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className={cn(
                  'text-[10px] h-5 backdrop-blur-sm shadow-sm',
                  room.isAvailable
                    ? 'border-sky-200 bg-sky-50/90 text-sky-700'
                    : 'border-slate-200 bg-slate-50/90 text-slate-600'
                )}>
                  {room.isAvailable ? 'Còn trống' : 'Đã cho thuê'}
                </Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 min-w-0 flex-col justify-between p-3 gap-1.5">
            {/* Title + Address */}
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">{room.title}</h3>
              {addr && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  <MapPin className="h-3 w-3 shrink-0" />{addr}
                </p>
              )}
            </div>

            {/* Stats inline */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="font-bold text-primary">{fmtVND(room.price)}/tháng</span>
              {room.area && <span className="text-muted-foreground">{room.area} m²</span>}
              {room.capacity && <span className="text-muted-foreground">{room.capacity} người</span>}
              {room.roomType && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{room.roomType.replace(/_/g, ' ')}</Badge>
              )}
            </div>

            {/* Distance badge */}
            {distanceText && (
              <div className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1 text-xs font-medium text-primary w-fit">
                <MapPin className="h-3 w-3 shrink-0" />
                Cách bạn {distanceText}
              </div>
            )}

            {/* Amenities preview */}
            {room.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {room.amenities.slice(0, 4).map(a => (
                  <span key={a} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{a.replace(/_/g, ' ')}</span>
                ))}
                {room.amenities.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{room.amenities.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/* ── SearchPage ───────────────────────────────────────────────────────────── */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [userLocation, setUserLocation] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [qInput, setQInput] = useState(searchParams.get('q') || '')
  const cardRefs = useRef({})
  // Riêng cho bản đồ — không bị giới hạn phân trang
  const [mapRooms, setMapRooms] = useState([])
  const [mapLoading, setMapLoading] = useState(false)

  /* filters ── URL-driven */
  const filters = useMemo(() => ({
    q: searchParams.get('q') || '',
    roomType: searchParams.get('roomType') || '',
    minPrice: Number(searchParams.get('minPrice') || 0),
    maxPrice: Number(searchParams.get('maxPrice') || PRICE_MAX),
    minArea: Number(searchParams.get('minArea') || 0),
    maxArea: Number(searchParams.get('maxArea') || AREA_MAX),
    amenities: searchParams.get('amenities') ? JSON.parse(searchParams.get('amenities')) : [],
    isAvailable: searchParams.get('isAvailable') || '',
    radius: searchParams.get('radius') || '',
    sort: searchParams.get('sort') || 'newest',
  }), [searchParams])

  const page = Number(searchParams.get('page') || 1)

  const activeCount = useMemo(() => {
    let n = 0
    if (filters.roomType) n++
    if (filters.minPrice > 0) n++
    if (filters.maxPrice < PRICE_MAX) n++
    if (filters.minArea > 0) n++
    if (filters.maxArea < AREA_MAX) n++
    if (filters.amenities.length) n++
    if (filters.isAvailable) n++
    if (filters.radius) n++
    return n
  }, [filters])

  /* Mở LocationPickerDialog — gọi từ nút chọn bán kính hoặc nút GPS */
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)

  /* Fetch */
  useEffect(() => {
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setLoading(true)
          const params = {
            ...filters, page, limit: 12,
            amenities: filters.amenities.length ? filters.amenities : undefined,
            minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
            maxPrice: filters.maxPrice < PRICE_MAX ? filters.maxPrice : undefined,
            minArea: filters.minArea > 0 ? filters.minArea : undefined,
            maxArea: filters.maxArea < AREA_MAX ? filters.maxArea : undefined,
          }
          if (filters.radius && userLocation) { params.lat = userLocation.lat; params.lng = userLocation.lng }
          const res = await searchRoomsApi(params)
          setRooms(res.data?.data?.rooms || [])
          setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 })
        } catch (e) { if (e.name !== 'CanceledError') setRooms([]) }
        finally { setLoading(false) }
      })()
    return () => ctrl.abort()
  }, [searchParams, page, userLocation])

  /* Fetch ALL matching rooms for map pins (không phân trang) */
  useEffect(() => {
    if (!showMap) return
    const ctrl = new AbortController()
      ; (async () => {
        try {
          setMapLoading(true)
          const params = {
            ...filters, page: 1, limit: 200,
            amenities: filters.amenities.length ? filters.amenities : undefined,
            minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
            maxPrice: filters.maxPrice < PRICE_MAX ? filters.maxPrice : undefined,
            minArea: filters.minArea > 0 ? filters.minArea : undefined,
            maxArea: filters.maxArea < AREA_MAX ? filters.maxArea : undefined,
          }
          if (filters.radius && userLocation) { params.lat = userLocation.lat; params.lng = userLocation.lng }
          const res = await searchRoomsApi(params, { signal: ctrl.signal })
          setMapRooms(res.data?.data?.rooms || [])
        } catch (e) { if (e.name !== 'CanceledError') setMapRooms([]) }
        finally { setMapLoading(false) }
      })()
    return () => ctrl.abort()
  }, [showMap, searchParams, userLocation])

  /* Handlers */
  const handleChange = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)

      // Atomic batch: _price = {min, max} — single call thay vì 2 lần riêng lẻ
      if (key === '_price') {
        const { min, max } = value
        min > 0 ? next.set('minPrice', String(min)) : next.delete('minPrice')
        max < PRICE_MAX ? next.set('maxPrice', String(max)) : next.delete('maxPrice')
        next.set('page', '1')
        return next
      }
      // Atomic batch: _area = {min, max}
      if (key === '_area') {
        const { min, max } = value
        min > 0 ? next.set('minArea', String(min)) : next.delete('minArea')
        max < AREA_MAX ? next.set('maxArea', String(max)) : next.delete('maxArea')
        next.set('page', '1')
        return next
      }

      const empty = value === '' || value == null || (Array.isArray(value) && !value.length)
      empty ? next.delete(key) : next.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
      next.set('page', '1')
      return next
    })
  }, [setSearchParams])

  const handleSearch = (e) => { e.preventDefault(); handleChange('q', qInput) }
  const handleReset = () => { setQInput(''); setSearchParams(new URLSearchParams()) }
  const handlePage = (p) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleMarker = (id) => {
    setHighlightedId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  /* Map data — dùng mapRooms khi bản đồ mở để hiển thị TẤT CẢ pin */
  const roomPos = useMemo(() => {
    const source = showMap ? mapRooms : rooms
    return source
      .filter(r => r.location?.coordinates?.length === 2)
      .map(r => ({
        id: r._id, slug: r.slug, title: r.title, price: r.price,
        lat: r.location.coordinates[1], lng: r.location.coordinates[0],
      }))
  }, [showMap, mapRooms, rooms])

  const mapCenter = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng]
    if (roomPos.length) return [roomPos[0].lat, roomPos[0].lng]
    return [10.2547, 105.9722] // TP. Vĩnh Long
  }, [userLocation, roomPos])

  /* Active filter tags */
  const tags = useMemo(() => {
    const list = []
    if (filters.roomType) list.push({ label: ROOM_TYPES.find(t => t.value === filters.roomType)?.label, clear: () => handleChange('roomType', '') })
    if (filters.minPrice > 0) list.push({ label: `Từ ${fmtShort(filters.minPrice)}`, clear: () => handleChange('minPrice', 0) })
    if (filters.maxPrice < PRICE_MAX) list.push({ label: `Đến ${fmtShort(filters.maxPrice)}`, clear: () => handleChange('maxPrice', PRICE_MAX) })
    if (filters.minArea > 0) list.push({ label: `≥ ${filters.minArea} m²`, clear: () => handleChange('minArea', 0) })
    if (filters.maxArea < AREA_MAX) list.push({ label: `≤ ${filters.maxArea} m²`, clear: () => handleChange('maxArea', AREA_MAX) })
    if (filters.isAvailable) list.push({ label: 'Còn trống', clear: () => handleChange('isAvailable', '') })
    if (filters.radius) list.push({ label: `≤ ${filters.radius} km`, clear: () => handleChange('radius', '') })
    filters.amenities.forEach(a => list.push({
      label: AMENITIES.find(x => x.value === a)?.label,
      clear: () => handleChange('amenities', filters.amenities.filter(x => x !== a))
    }))
    return list
  }, [filters, handleChange])

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-14 z-20 shrink-0 border-b bg-background">
        {/* Search row */}
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-2.5">

          {/* Mobile/tablet filter trigger — show below lg */}
          <div className="relative lg:hidden shrink-0">
            <Button variant="outline" size="icon" className="h-9 w-9 relative"
              onClick={() => setMobileFilterOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              {activeCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Tên phòng, địa chỉ, khu vực..."
                className="h-9 pl-9 pr-8 text-sm rounded-lg"
              />
              {qInput && (
                <button type="button"
                  onClick={() => { setQInput(''); handleChange('q', '') }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" className="h-9 px-4 rounded-lg shrink-0">Tìm</Button>
          </form>

          {/* Sort — sm+ */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filters.sort}
              onChange={(e) => handleChange('sort', e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Wizard button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg shrink-0 border-primary/40 text-primary hover:bg-primary/5 hidden sm:flex"
            onClick={() => setWizardOpen(true)}
            title="Tìm nhanh bằng AI"
          >
            <Sparkles className="h-4 w-4" />
          </Button>

          {/* View mode toggle — sm+ */}
          <div className="hidden sm:flex items-center rounded-lg border border-input overflow-hidden shrink-0">
            <button type="button"
              onClick={() => setViewMode('grid')}
              className={cn('flex h-9 w-9 items-center justify-center transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}
              title="Dạng lưới">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button"
              onClick={() => setViewMode('list')}
              className={cn('flex h-9 w-9 items-center justify-center transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}
              title="Dạng danh sách">
              <LayoutList className="h-4 w-4" />
            </button>
          </div>

          {/* Map toggle — sm+ */}
          <Button
            type="button"
            variant={showMap ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9 rounded-lg shrink-0 hidden sm:flex"
            onClick={() => setShowMap(v => !v)}
            title={showMap ? 'Ẩn bản đồ' : 'Hiện bản đồ'}
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Active tags + result count row */}
        {(tags.length > 0 || !loading) && (
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-1.5 px-4 pb-2">
            <span className={cn('text-xs shrink-0 font-medium', loading ? 'text-muted-foreground animate-pulse' : 'text-foreground')}>
              {loading ? 'Đang tìm...' : `${pagination.total} phòng`}
            </span>
            {tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {tag.label}
                <button onClick={tag.clear} className="hover:text-primary/60 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {activeCount > 0 && (
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                Xoá tất cả
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-4 flex-1">
        <div className="flex gap-5 items-start">

          {/* Sidebar — desktop lg+ sticky */}
          <aside className="hidden lg:block w-60 xl:w-64 shrink-0 sticky self-start top-[116px]">
            <div className="rounded-xl border bg-card p-4 max-h-[calc(100svh-132px)] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="font-semibold text-sm">Bộ lọc</p>
                </div>
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{activeCount}</span>
                )}
              </div>
              <FilterPanel
                filters={filters}
                onChange={handleChange}
                onReset={handleReset}
                activeCount={activeCount}
                userLocation={userLocation}
                onRequestLocation={() => setLocationPickerOpen(true)}
              />
            </div>
          </aside>

          {/* Main: room list + map panel */}
          <div className="flex flex-1 min-w-0 gap-4 items-start">
            <div className="flex-1 min-w-0">
              {/* Toolbar — below lg only: sort + view toggle + map + AI */}
              <div className="flex items-center gap-2 mb-3 lg:hidden">
                <select value={filters.sort} onChange={(e) => handleChange('sort', e.target.value)} className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {/* View toggle */}
                <div className="flex items-center rounded-md border border-input overflow-hidden shrink-0">
                  <button type="button" onClick={() => setViewMode('grid')}
                    className={cn('flex h-8 w-8 items-center justify-center transition-colors',
                      viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}
                    title="Dạng lưới">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setViewMode('list')}
                    className={cn('flex h-8 w-8 items-center justify-center transition-colors',
                      viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted')}
                    title="Dạng danh sách">
                    <LayoutList className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-lg shrink-0" onClick={() => setShowMap(v => !v)}>
                  <MapIcon className="h-3.5 w-3.5" />{showMap ? 'DS' : 'Bản đồ'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0 border-primary/40 text-primary hover:bg-primary/5" onClick={() => setWizardOpen(true)}>
                  <Sparkles className="h-3.5 w-3.5" />AI
                </Button>
              </div>
              {loading ? (
                <div className={cn(
                  'grid gap-4 mt-4',
                  viewMode === 'list' || showMap ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'
                )}>
                  {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-muted text-4xl">🔍</div>
                  <h2 className="font-semibold text-base">Không tìm thấy phòng nào</h2>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">Thử thay đổi từ khoá hoặc xoá bớt bộ lọc để xem thêm kết quả.</p>
                  <Button variant="outline" className="gap-2 rounded-full" onClick={handleReset}><RotateCcw className="h-3.5 w-3.5" />Đặt lại bộ lọc</Button>
                </div>
              ) : (
                <div className="mt-4">
                  {viewMode === 'list' && !showMap ? (
                    /* ── List view: card nằm ngang ── */
                    <div className="flex flex-col gap-3">
                      {rooms.map(room => (
                        <div key={room._id} ref={el => { cardRefs.current[room._id] = el }}>
                          <SearchRoomListCard
                            room={room}
                            highlighted={highlightedId === room._id}
                            distanceText={calcDistance(userLocation, room.location?.coordinates)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* ── Grid view: card dọc ── */
                    <div className={cn(
                      'grid gap-4',
                      showMap ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3'
                    )}>
                      {rooms.map(room => (
                        <div key={room._id} ref={el => { cardRefs.current[room._id] = el }}
                          className={cn(
                            'rounded-xl transition-all duration-200',
                            highlightedId === room._id && 'ring-2 ring-primary shadow-md'
                          )}>
                          <RoomCard
                            room={room}
                            distanceText={calcDistance(userLocation, room.location?.coordinates)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <Pagination page={page} total={pagination.total} totalPages={pagination.totalPages} onChange={handlePage} />
                </div>
              )}
            </div>

            {/* Map panel — desktop sticky */}
            {showMap && (
              <div className="hidden sm:flex w-[380px] xl:w-[440px] shrink-0 flex-col rounded-xl border overflow-hidden sticky self-start top-[116px]"
                style={{ height: 'calc(100svh - 130px)' }}>
                <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/20 shrink-0">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {mapLoading
                      ? <><span className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />Đang tải bản đồ…</>
                      : <><MapIcon className="h-3.5 w-3.5 text-primary" />{roomPos.length} phòng trên bản đồ</>
                    }
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Phòng</span>
                    {userLocation && <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />Bạn</span>}
                  </div>
                </div>
                <MapContainer center={mapCenter} zoom={13} className="flex-1 w-full" key={mapCenter.join(',')}>
                  <TileLayer attribution='&copy; OpenStreetMap' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                  {userLocation && (
                    <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={9}
                      pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.95, weight: 2 }}>
                      <Popup>Vị trí của bạn</Popup>
                    </CircleMarker>
                  )}
                  {roomPos.map(pos => (
                    <CircleMarker key={pos.id} center={[pos.lat, pos.lng]}
                      radius={highlightedId === pos.id ? 14 : 9}
                      pathOptions={{ color: '#b91c1c', fillColor: highlightedId === pos.id ? '#dc2626' : '#f87171', fillOpacity: 0.95, weight: 2 }}
                      eventHandlers={{ click: () => handleMarker(pos.id) }}>
                      <Popup>
                        <Link to={`/rooms/${pos.slug}`} className="font-semibold text-sm hover:underline block leading-snug">{pos.title}</Link>
                        <span className="text-xs text-muted-foreground mt-0.5 block">{fmtVND(pos.price)}/tháng</span>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>{/* end main flex */}
        </div>{/* end flex gap-5 */}
      </div>{/* end max-w-7xl */}

      {/* Mobile map fullscreen */}
      {showMap && (
        <div className="sm:hidden fixed inset-0 z-40 flex flex-col bg-background" style={{ top: '56px' }}>
          <div className="flex items-center justify-between border-b px-4 py-2.5 bg-background shrink-0">
            <span className="text-sm font-semibold">{roomPos.length} phòng trên bản đồ</span>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowMap(false)}>
              <X className="h-3.5 w-3.5" />Đóng
            </Button>
          </div>
          <MapContainer center={mapCenter} zoom={13} className="flex-1">
            <TileLayer attribution='&copy; OpenStreetMap' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
            {userLocation && (
              <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={9}
                pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.95, weight: 2 }}>
                <Popup>Vị trí của bạn</Popup>
              </CircleMarker>
            )}
            {roomPos.map(pos => (
              <CircleMarker key={pos.id} center={[pos.lat, pos.lng]} radius={10}
                pathOptions={{ color: '#b91c1c', fillColor: '#f87171', fillOpacity: 0.95, weight: 2 }}
                eventHandlers={{ click: () => { setShowMap(false); handleMarker(pos.id) } }}>
                <Popup>
                  <Link to={`/rooms/${pos.slug}`} className="font-semibold hover:underline block">{pos.title}</Link>
                  <span className="text-xs text-muted-foreground">{fmtVND(pos.price)}/tháng</span>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Mobile filter sheet */}
      <Sheet open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} title="Bộ lọc tìm kiếm">
        <FilterPanel
          filters={filters}
          onChange={handleChange}
          onReset={handleReset}
          activeCount={activeCount}
          compact
          userLocation={userLocation}
          onRequestLocation={() => setLocationPickerOpen(true)}
        />
        <div className="mt-5 space-y-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select value={filters.sort} onChange={(e) => handleChange('sort', e.target.value)}
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button className="w-full rounded-xl gap-2" onClick={() => setMobileFilterOpen(false)}>
            <LayoutGrid className="h-4 w-4" />
            Xem {pagination.total > 0 ? `${pagination.total} phòng` : 'kết quả'}
          </Button>
        </div>
      </Sheet>

      {/* Wizard */}
      <RoomFinderWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />

      {/* LocationPickerDialog — dùng cho filter bán kính */}
      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(coords) => setUserLocation(coords)}
      />
    </div>
  )
}
