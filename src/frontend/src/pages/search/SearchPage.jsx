import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import {
  Search, SlidersHorizontal, Map as MapIcon, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { searchRoomsApi } from '@/services/roomService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Sheet } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

// ── Hằng số ────────────────────────────────────────────────────────────
const ROOM_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại phòng' },
  { value: 'phòng_trọ', label: 'Phòng trọ' },
  { value: 'chung_cư_mini', label: 'Chung cư mini' },
  { value: 'nhà_nguyên_căn', label: 'Nhà nguyên căn' },
  { value: 'ký_túc_xá', label: 'Ký túc xá' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'views', label: 'Xem nhiều nhất' },
]

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'Wifi' },
  { value: 'điều_hòa', label: 'Điều hòa' },
  { value: 'máy_giặt', label: 'Máy giặt' },
  { value: 'tủ_lạnh', label: 'Tủ lạnh' },
  { value: 'bếp', label: 'Bếp' },
  { value: 'chỗ_để_xe', label: 'Chỗ để xe' },
  { value: 'an_ninh', label: 'An ninh' },
  { value: 'nóng_lạnh', label: 'Nóng lạnh' },
  { value: 'nội_thất', label: 'Nội thất' },
  { value: 'vệ_sinh_riêng', label: 'Vệ sinh riêng' },
]

const RADIUS_OPTIONS = [
  { value: '', label: 'Không giới hạn' },
  { value: '1', label: '≤ 1 km' },
  { value: '3', label: '≤ 3 km' },
  { value: '5', label: '≤ 5 km' },
  { value: '10', label: '≤ 10 km' },
]

const PRICE_MAX = 10_000_000
const AREA_MAX = 120

function formatCurrency(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}tr`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

// ── Filter Panel (dùng chung cho sidebar desktop & Sheet mobile) ──────
function FilterPanel({ filters, onChange, onReset, activeCount }) {
  const handleAmenityToggle = (val) => {
    const cur = filters.amenities
    onChange('amenities', cur.includes(val) ? cur.filter((a) => a !== val) : [...cur, val])
  }

  return (
    <div className="space-y-5">
      {/* Reset */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <X className="h-3 w-3" /> Xoá {activeCount} bộ lọc
        </button>
      )}

      {/* Loại phòng */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loại phòng</Label>
        <select
          value={filters.roomType}
          onChange={(e) => onChange('roomType', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <Separator />

      {/* Giá thuê */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Giá thuê
        </Label>
        <Slider
          min={0}
          max={PRICE_MAX}
          step={100_000}
          value={[filters.minPrice, filters.maxPrice]}
          onValueChange={([min, max]) => { onChange('minPrice', min); onChange('maxPrice', max) }}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(filters.minPrice)}</span>
          <span>{filters.maxPrice >= PRICE_MAX ? 'Không giới hạn' : formatCurrency(filters.maxPrice)}/tháng</span>
        </div>
      </div>

      <Separator />

      {/* Diện tích */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Diện tích (m²)
        </Label>
        <Slider
          min={0}
          max={AREA_MAX}
          step={5}
          value={[filters.minArea, filters.maxArea]}
          onValueChange={([min, max]) => { onChange('minArea', min); onChange('maxArea', max) }}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filters.minArea} m²</span>
          <span>{filters.maxArea >= AREA_MAX ? 'Không giới hạn' : `${filters.maxArea} m²`}</span>
        </div>
      </div>

      <Separator />

      {/* Bán kính GPS */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bán kính từ bạn</Label>
        <select
          value={filters.radius}
          onChange={(e) => onChange('radius', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {RADIUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <Separator />

      {/* Trạng thái */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</Label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.isAvailable === 'true'}
            onChange={(e) => onChange('isAvailable', e.target.checked ? 'true' : '')}
            className="h-4 w-4 rounded accent-primary"
          />
          Chỉ hiện phòng còn trống
        </label>
      </div>

      <Separator />

      {/* Tiện ích */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tiện ích</Label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.map((a) => {
            const selected = filters.amenities.includes(a.value)
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => handleAmenityToggle(a.value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                }`}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Room Card Skeleton ──────────────────────────────────────────────────
function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}

// ── Pagination ──────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = i + 1
        return (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(p)}
            className="h-9 w-9 p-0"
          >
            {p}
          </Button>
        )
      })}
      {totalPages > 7 && <span className="text-muted-foreground text-sm">... {totalPages}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ── Main SearchPage ─────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  q: '',
  roomType: '',
  minPrice: 0,
  maxPrice: PRICE_MAX,
  minArea: 0,
  maxArea: AREA_MAX,
  amenities: [],
  isAvailable: '',
  radius: '',
  sort: 'newest',
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [qInput, setQInput] = useState(searchParams.get('q') || '')
  const cardRefs = useRef({})

  // ── Đọc filter từ URL params ────────────────────────────────────────
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

  // ── Đếm số bộ lọc đang active ───────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.roomType) count++
    if (filters.minPrice > 0) count++
    if (filters.maxPrice < PRICE_MAX) count++
    if (filters.minArea > 0) count++
    if (filters.maxArea < AREA_MAX) count++
    if (filters.amenities.length > 0) count++
    if (filters.isAvailable) count++
    if (filters.radius) count++
    return count
  }, [filters])

  // ── Lấy GPS user ────────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null)
    )
  }, [])

  // ── Fetch khi filter/page thay đổi ──────────────────────────────────
  useEffect(() => {
    const controller = new AbortController()
    const fetch = async () => {
      try {
        setLoading(true)
        const params = {
          ...filters,
          page,
          limit: 12,
          amenities: filters.amenities.length ? filters.amenities : undefined,
          minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
          maxPrice: filters.maxPrice < PRICE_MAX ? filters.maxPrice : undefined,
          minArea: filters.minArea > 0 ? filters.minArea : undefined,
          maxArea: filters.maxArea < AREA_MAX ? filters.maxArea : undefined,
        }
        // Thêm lat/lng nếu user đã cho phép GPS và có chọn radius
        if (filters.radius && userLocation) {
          params.lat = userLocation.lat
          params.lng = userLocation.lng
        }
        const res = await searchRoomsApi(params)
        setRooms(res.data?.data?.rooms || [])
        setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 })
      } catch (error) {
        if (error.name !== 'CanceledError') setRooms([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
    return () => controller.abort()
  }, [searchParams, page, userLocation])

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === '' || value === null || value === undefined ||
          (Array.isArray(value) && value.length === 0)) {
        next.delete(key)
      } else {
        next.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
      }
      next.set('page', '1')
      return next
    })
  }, [setSearchParams])

  const handleSearch = (e) => {
    e.preventDefault()
    handleFilterChange('q', qInput)
  }

  const handleReset = () => {
    setQInput('')
    setSearchParams(new URLSearchParams())
  }

  const handlePageChange = (p) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMarkerClick = (roomId) => {
    setHighlightedId(roomId)
    const el = cardRefs.current[roomId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // ── Room positions cho map ───────────────────────────────────────────
  const roomPositions = useMemo(() =>
    rooms
      .filter((r) => r.location?.coordinates?.length === 2)
      .map((r) => ({
        id: r._id,
        slug: r.slug,
        title: r.title,
        price: r.price,
        lat: r.location.coordinates[1],
        lng: r.location.coordinates[0],
      })),
    [rooms]
  )

  const mapCenter = roomPositions.length > 0
    ? [roomPositions[0].lat, roomPositions[0].lng]
    : [10.2547, 105.9722]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar Filter (Desktop) ────────────────────────────────── */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r bg-background p-4 lg:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Bộ lọc</h2>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} đang bật</Badge>
          )}
        </div>
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          activeCount={activeFilterCount}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="shrink-0 border-b bg-background px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Mở bộ lọc"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Tìm theo tên phòng, địa chỉ, mô tả..."
                className="pl-9"
              />
            </div>

            <Button type="submit">Tìm</Button>

            {/* Sort */}
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="hidden h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:flex"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Toggle bản đồ */}
            <Button
              type="button"
              variant={showMap ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowMap((v) => !v)}
              title={showMap ? 'Ẩn bản đồ' : 'Hiện bản đồ'}
              className="hidden shrink-0 sm:flex"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </form>

          {/* Info row */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {loading ? (
              <span>Đang tìm kiếm...</span>
            ) : (
              <span>
                {pagination.total > 0
                  ? `Tìm thấy ${pagination.total} phòng`
                  : 'Không tìm thấy phòng nào'}
              </span>
            )}
            {filters.q && (
              <Badge variant="secondary" className="gap-1">
                "{filters.q}"
                <button onClick={() => { setQInput(''); handleFilterChange('q', '') }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {activeFilterCount > 0 && (
              <button onClick={handleReset} className="text-primary hover:underline">
                Xoá tất cả bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Card List + Map */}
        <div className="flex flex-1 overflow-hidden">
          {/* Card list */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <RoomCardSkeleton key={i} />)}
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="text-5xl">🔍</div>
                <h2 className="text-lg font-semibold">Không tìm thấy phòng nào</h2>
                <p className="text-sm text-muted-foreground">
                  Thử thay đổi từ khoá hoặc bỏ bớt bộ lọc
                </p>
                <Button variant="outline" onClick={handleReset}>Xoá bộ lọc</Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {rooms.map((room) => (
                    <div
                      key={room._id}
                      ref={(el) => { cardRefs.current[room._id] = el }}
                      className={`transition-all duration-200 ${
                        highlightedId === room._id ? 'ring-2 ring-primary rounded-xl' : ''
                      }`}
                    >
                      <RoomCard room={room} />
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Pagination
                    page={page}
                    totalPages={pagination.totalPages}
                    onChange={handlePageChange}
                  />
                </div>
              </>
            )}
          </div>

          {/* Bản đồ (toggle) */}
          {showMap && (
            <div className="hidden w-[420px] shrink-0 border-l lg:block xl:w-[480px]">
              <MapContainer
                center={mapCenter}
                zoom={13}
                className="h-full w-full"
                key={mapCenter.join(',')}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />

                {/* Marker user */}
                {userLocation && (
                  <CircleMarker
                    center={[userLocation.lat, userLocation.lng]}
                    radius={9}
                    pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
                  >
                    <Popup>Vị trí của bạn</Popup>
                  </CircleMarker>
                )}

                {/* Marker phòng */}
                {roomPositions.map((pos) => (
                  <CircleMarker
                    key={pos.id}
                    center={[pos.lat, pos.lng]}
                    radius={highlightedId === pos.id ? 13 : 9}
                    pathOptions={{
                      color: highlightedId === pos.id ? '#dc2626' : '#ef4444',
                      fillColor: highlightedId === pos.id ? '#dc2626' : '#f87171',
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                    eventHandlers={{ click: () => handleMarkerClick(pos.id) }}
                  >
                    <Popup>
                      <Link to={`/rooms/${pos.slug}`} className="font-medium hover:underline">
                        {pos.title}
                      </Link>
                      <br />
                      <span className="text-xs text-gray-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(pos.price)}
                      </span>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Sheet ─────────────────────────────────────── */}
      <Sheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Bộ lọc"
      >
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          activeCount={activeFilterCount}
        />
        <div className="mt-4">
          <Button className="w-full" onClick={() => setMobileFilterOpen(false)}>
            Xem {pagination.total} kết quả
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
