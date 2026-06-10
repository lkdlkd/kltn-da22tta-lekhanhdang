import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet'
import {
  Bath,
  Car,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Map as MapIcon,
  MapPin,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sofa,
  Sparkles,
  WashingMachine,
  Wifi,
  Wind,
  X,
  Flame,
} from 'lucide-react'
import { LocationPickerDialog } from '@/components/common/LocationPickerDialog'
import { RoomFinderWizard } from '@/components/rooms/RoomFinderWizard'
import { RoomCard, RoomCardSkeleton, formatRoomAddress } from '@/components/rooms/RoomCard'
import { searchRoomsApi } from '@/services/roomService'
import { getCommunityRecommendApi, forYouApi } from '@/services/recommendService'
import { useSelector } from 'react-redux'
import { getFavoriteIdsApi } from '@/services/favoriteService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Sheet } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

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
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
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

function formatMoney(value) {
  if (!value) return 'Đang cập nhật'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

function formatShort(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} triệu`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return `${value}đ`
}

function calcDistance(userLoc, roomCoords) {
  if (!userLoc || !roomCoords || roomCoords.length < 2) return undefined
  const [lng2, lat2] = roomCoords
  const { lat: lat1, lng: lng1 } = userLoc
  const radius = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const km = radius * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function parseAmenities(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function Section({ title, children }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function RangeSlider({ label, min, max, step, valueMin, valueMax, onCommit, formatValue, suffix = '' }) {
  const [local, setLocal] = useState([valueMin, valueMax])
  const debounceRef = useRef(null)

  useEffect(() => {
    setLocal([valueMin, valueMax])
  }, [valueMin, valueMax])

  const handleChange = (values) => {
    setLocal(values)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommit(values[0], values[1]), 300)
  }

  return (
    <Section title={label}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-semibold">
            {formatValue ? formatValue(local[0]) : `${local[0]}${suffix}`}
          </span>
          <span className="h-px flex-1 bg-border" />
          <span className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-semibold">
            {local[1] >= max ? 'Không giới hạn' : formatValue ? formatValue(local[1]) : `${local[1]}${suffix}`}
          </span>
        </div>
        <Slider min={min} max={max} step={step} value={local} onValueChange={handleChange} minStepsBetweenThumbs={1} />
      </div>
    </Section>
  )
}

function FilterPanel({ filters, onChange, onReset, activeCount, userLocation, onRequestLocation, compact }) {
  const toggleAmenity = (value) => {
    onChange('amenities', filters.amenities.includes(value)
      ? filters.amenities.filter((item) => item !== value)
      : [...filters.amenities, value]
    )
  }

  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>
      {activeCount > 0 && (
        <Button variant="outline" size="sm" className="h-9 w-full rounded-lg text-xs" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Xóa {activeCount} bộ lọc
        </Button>
      )}

      <Section title="Loại phòng">
        <div className="flex flex-wrap gap-2">
          {ROOM_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange('roomType', type.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                filters.roomType === type.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </Section>

      <Separator />

      <RangeSlider
        label="Giá thuê / tháng"
        min={0}
        max={PRICE_MAX}
        step={100_000}
        valueMin={filters.minPrice}
        valueMax={filters.maxPrice}
        formatValue={formatShort}
        onCommit={(minValue, maxValue) => onChange('_price', { min: minValue, max: maxValue })}
      />

      <Separator />

      <RangeSlider
        label="Diện tích"
        min={0}
        max={AREA_MAX}
        step={5}
        valueMin={filters.minArea}
        valueMax={filters.maxArea}
        suffix=" m²"
        onCommit={(minValue, maxValue) => onChange('_area', { min: minValue, max: maxValue })}
      />

      <Separator />

      <Section title="Trạng thái">
        <button
          type="button"
          onClick={() => onChange('isAvailable', filters.isAvailable === 'true' ? '' : 'true')}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors',
            filters.isAvailable === 'true' ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:border-primary/40'
          )}
        >
          <span className="font-medium">Chỉ phòng còn trống</span>
          <span className={cn('h-4 w-4 rounded-full border', filters.isAvailable === 'true' && 'border-primary bg-primary')} />
        </button>
      </Section>

      <Separator />

      <Section title="Bán kính từ vị trí">
        <div className="grid grid-cols-5 gap-1.5">
          {RADIUS_OPTIONS.map((radius) => (
            <button
              key={radius.value}
              type="button"
              onClick={() => {
                onChange('radius', radius.value)
                if (radius.value && !userLocation) onRequestLocation?.()
              }}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
                filters.radius === radius.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:border-primary/40'
              )}
            >
              {radius.label}
            </button>
          ))}
        </div>
        {!userLocation && <p className="text-xs text-muted-foreground">Chọn bán kính sẽ mở hộp thoại chọn vị trí.</p>}
      </Section>

      <Separator />

      <Section title="Tiện ích">
        <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2')}>
          {AMENITIES.map(({ value, label, icon: Icon }) => {
            const selected = filters.amenities.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleAmenity(value)}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function Pagination({ page, total, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let index = 1; index <= totalPages; index += 1) {
    if (index === 1 || index === totalPages || (index >= page - 2 && index <= page + 2)) pages.push(index)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-xs text-muted-foreground">Trang {page}/{totalPages} · {total} kết quả</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((item, index) => item === '...'
          ? <span key={`ellipsis-${index}`} className="w-8 text-center text-sm text-muted-foreground">...</span>
          : (
            <Button key={item} size="icon" className="h-8 w-8 rounded-lg text-xs" variant={item === page ? 'default' : 'outline'} onClick={() => onChange(item)}>
              {item}
            </Button>
          ))}
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [userLocation, setUserLocation] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [qInput, setQInput] = useState(searchParams.get('q') || '')
  const [mapRooms, setMapRooms] = useState([])
  const [mapLoading, setMapLoading] = useState(false)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const cardRefs = useRef({})

  const user = useSelector((state) => state.auth?.user)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [recs, setRecs] = useState([])
  const [loadingRecs, setLoadingRecs] = useState(true)

  useEffect(() => {
    setLoadingRecs(true)
    const fetchRecs = user
      ? forYouApi({ limit: 12 })
      : getCommunityRecommendApi({ limit: 12 })

    fetchRecs
      .then((res) => setRecs(res.data?.data?.rooms || []))
      .catch(() => setRecs([]))
      .finally(() => setLoadingRecs(false))
  }, [user])

  useEffect(() => {
    if (!user) {
      setFavoriteIds([])
      return
    }
    getFavoriteIdsApi()
      .then((res) => setFavoriteIds(res.data?.data?.roomIds || []))
      .catch(() => { })
  }, [user, rooms, recs])

  const filters = useMemo(() => ({
    q: searchParams.get('q') || '',
    roomType: searchParams.get('roomType') || '',
    minPrice: Number(searchParams.get('minPrice') || 0),
    maxPrice: Number(searchParams.get('maxPrice') || PRICE_MAX),
    minArea: Number(searchParams.get('minArea') || 0),
    maxArea: Number(searchParams.get('maxArea') || AREA_MAX),
    amenities: parseAmenities(searchParams.get('amenities')),
    isAvailable: searchParams.get('isAvailable') || '',
    radius: searchParams.get('radius') || '',
    sort: searchParams.get('sort') || 'newest',
  }), [searchParams])

  const page = Number(searchParams.get('page') || 1)

  const activeCount = useMemo(() => {
    let count = 0
    if (filters.roomType) count += 1
    if (filters.minPrice > 0) count += 1
    if (filters.maxPrice < PRICE_MAX) count += 1
    if (filters.minArea > 0) count += 1
    if (filters.maxArea < AREA_MAX) count += 1
    if (filters.amenities.length) count += 1
    if (filters.isAvailable) count += 1
    if (filters.radius) count += 1
    return count
  }, [filters])

  const isDefaultState = filters.q === '' && activeCount === 0 && page === 1 && filters.sort === 'newest'
  const currentRooms = isDefaultState ? recs : rooms
  const currentLoading = isDefaultState ? loadingRecs : loading

  const buildParams = useCallback((limit, nextPage = page) => {
    const params = {
      ...filters,
      page: nextPage,
      limit,
      amenities: filters.amenities.length ? filters.amenities : undefined,
      minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
      maxPrice: filters.maxPrice < PRICE_MAX ? filters.maxPrice : undefined,
      minArea: filters.minArea > 0 ? filters.minArea : undefined,
      maxArea: filters.maxArea < AREA_MAX ? filters.maxArea : undefined,
    }
    if (filters.radius && userLocation) {
      params.lat = userLocation.lat
      params.lng = userLocation.lng
    }
    return params
  }, [filters, page, userLocation])

  useEffect(() => {
    if (isDefaultState) {
      setRooms([])
      setLoading(false)
      return
    }
    let ignore = false
    const fetchRooms = async () => {
      try {
        setLoading(true)
        const res = await searchRoomsApi(buildParams(12))
        if (ignore) return
        setRooms(res.data?.data?.rooms || [])
        setPagination(res.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 })
      } catch {
        if (!ignore) setRooms([])
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    fetchRooms()
    return () => {
      ignore = true
    }
  }, [searchParams, page, userLocation, buildParams, isDefaultState])

  useEffect(() => {
    if (!showMap) return
    let ignore = false
    const fetchMapRooms = async () => {
      try {
        setMapLoading(true)
        const res = await searchRoomsApi(buildParams(200, 1))
        if (!ignore) setMapRooms(res.data?.data?.rooms || [])
      } catch {
        if (!ignore) setMapRooms([])
      } finally {
        if (!ignore) setMapLoading(false)
      }
    }
    fetchMapRooms()
    return () => {
      ignore = true
    }
  }, [showMap, searchParams, userLocation, buildParams])

  const handleChange = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (key === '_price') {
        value.min > 0 ? next.set('minPrice', String(value.min)) : next.delete('minPrice')
        value.max < PRICE_MAX ? next.set('maxPrice', String(value.max)) : next.delete('maxPrice')
      } else if (key === '_area') {
        value.min > 0 ? next.set('minArea', String(value.min)) : next.delete('minArea')
        value.max < AREA_MAX ? next.set('maxArea', String(value.max)) : next.delete('maxArea')
      } else {
        const empty = value === '' || value == null || (Array.isArray(value) && !value.length)
        empty ? next.delete(key) : next.set(key, Array.isArray(value) ? JSON.stringify(value) : String(value))
      }
      next.set('page', '1')
      return next
    })
  }, [setSearchParams])

  const handleSearch = (event) => {
    event.preventDefault()
    handleChange('q', qInput)
  }

  const handleReset = () => {
    setQInput('')
    setSearchParams(new URLSearchParams())
  }

  const handlePage = (nextPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(nextPage))
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMarker = (id) => {
    setHighlightedId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const roomPositions = useMemo(() => {
    const source = showMap ? mapRooms : currentRooms
    return source
      .filter((room) => room.location?.coordinates?.length === 2)
      .map((room) => ({
        id: room._id,
        slug: room.slug,
        title: room.title,
        price: room.price,
        image: room.images?.[0],
        address: formatRoomAddress(room.address),
        lat: room.location.coordinates[1],
        lng: room.location.coordinates[0],
      }))
  }, [showMap, mapRooms, currentRooms])

  const mapCenter = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng]
    if (roomPositions.length) return [roomPositions[0].lat, roomPositions[0].lng]
    return [10.2547, 105.9722]
  }, [userLocation, roomPositions])

  const tags = useMemo(() => {
    const result = []
    if (filters.roomType) result.push({ label: ROOM_TYPES.find((item) => item.value === filters.roomType)?.label, clear: () => handleChange('roomType', '') })
    if (filters.minPrice > 0) result.push({ label: `Từ ${formatShort(filters.minPrice)}`, clear: () => handleChange('_price', { min: 0, max: filters.maxPrice }) })
    if (filters.maxPrice < PRICE_MAX) result.push({ label: `Đến ${formatShort(filters.maxPrice)}`, clear: () => handleChange('_price', { min: filters.minPrice, max: PRICE_MAX }) })
    if (filters.minArea > 0) result.push({ label: `Từ ${filters.minArea} m²`, clear: () => handleChange('_area', { min: 0, max: filters.maxArea }) })
    if (filters.maxArea < AREA_MAX) result.push({ label: `Đến ${filters.maxArea} m²`, clear: () => handleChange('_area', { min: filters.minArea, max: AREA_MAX }) })
    if (filters.isAvailable) result.push({ label: 'Còn trống', clear: () => handleChange('isAvailable', '') })
    if (filters.radius) result.push({ label: `Trong ${filters.radius} km`, clear: () => handleChange('radius', '') })
    filters.amenities.forEach((amenity) => result.push({
      label: AMENITIES.find((item) => item.value === amenity)?.label || amenity,
      clear: () => handleChange('amenities', filters.amenities.filter((item) => item !== amenity)),
    }))
    return result
  }, [filters, handleChange])

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="sticky top-14 z-20 border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Button variant="outline" size="icon" className="relative h-10 w-10 rounded-lg lg:hidden" onClick={() => setMobileFilterOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{activeCount}</span>}
          </Button>

          <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={qInput} onChange={(event) => setQInput(event.target.value)} placeholder="Tên phòng, địa chỉ, khu vực..." className="h-10 rounded-lg pl-9 pr-9" />
              {qInput && (
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setQInput(''); handleChange('q', '') }}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" className="h-10 rounded-lg">Tìm</Button>
          </form>

          <div className="hidden items-center gap-2 md:flex">
            <select value={filters.sort} onChange={(event) => handleChange('sort', event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg text-primary" onClick={() => setWizardOpen(true)} title="Gợi ý tìm phòng">
              <Sparkles className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-2 rounded-lg border bg-card p-1">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-md" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-md" onClick={() => setViewMode('list')}><LayoutList className="h-4 w-4" /></Button>
            </div>
            <Button variant={showMap ? 'default' : 'outline'} size="icon" className="h-10 w-10 rounded-lg" onClick={() => setShowMap((value) => !value)}>
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-4 pb-3 sm:px-6 lg:px-8">
          <span className={cn('text-sm font-semibold', currentLoading ? 'text-muted-foreground' : 'text-foreground')}>
            {currentLoading 
              ? 'Đang tìm...' 
              : isDefaultState 
                ? (user ? 'Gợi ý dành riêng cho bạn' : 'Gợi ý nổi bật từ cộng đồng') 
                : `${pagination.total} phòng phù hợp`}
          </span>
          {tags.map((tag, index) => (
            <button key={`${tag.label}-${index}`} type="button" onClick={tag.clear} className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
              {tag.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {activeCount > 0 && <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={handleReset}>Xóa tất cả</button>}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-start gap-5">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-[128px] max-h-[calc(100svh-144px)] overflow-y-auto rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" />Bộ lọc</p>
                {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
              </div>
              <FilterPanel filters={filters} onChange={handleChange} onReset={handleReset} activeCount={activeCount} userLocation={userLocation} onRequestLocation={() => setLocationPickerOpen(true)} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2 md:hidden">
              <select value={filters.sort} onChange={(event) => handleChange('sort', event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs outline-none">
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                {viewMode === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs" onClick={() => setWizardOpen(true)}><Sparkles className="h-3.5 w-3.5" />Gợi ý</Button>
              <Button variant={showMap ? 'default' : 'outline'} size="sm" className="h-9 rounded-lg text-xs" onClick={() => setShowMap((value) => !value)}><MapIcon className="h-3.5 w-3.5" />Bản đồ</Button>
            </div>

            {currentLoading ? (
              <div className={cn('grid', viewMode === 'list' || showMap ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3')}>
                {Array.from({ length: 6 }).map((_, index) => <RoomCardSkeleton key={index} view={viewMode === 'list' || showMap ? 'list' : 'grid'} />)}
              </div>
            ) : currentRooms.length === 0 ? (
              <div className="space-y-6">
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Search className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">Không tìm thấy phòng phù hợp</p>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Thử đổi từ khóa, mở rộng khoảng giá hoặc bỏ bớt tiện ích để xem thêm kết quả.</p>
                    </div>
                    <Button variant="outline" className="rounded-lg" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4" />
                      Đặt lại bộ lọc
                    </Button>
                  </CardContent>
                </Card>

                {recs.length > 0 && (
                  <div className="rounded-xl border bg-card p-5">
                    <h3 className="mb-4 text-sm font-bold flex items-center gap-2 text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {user ? 'Gợi ý có thể bạn quan tâm' : 'Phòng trọ gợi ý từ cộng đồng'}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {recs.slice(0, 3).map((room) => (
                        <RoomCard
                          key={room._id}
                          room={room}
                          view="grid"
                          initialFavorited={favoriteIds.includes(String(room._id))}
                          amenitiesMap={Object.fromEntries(AMENITIES.map((item) => [item.value, item.label]))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className={cn('grid', viewMode === 'list' || showMap ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3')}>
                  {currentRooms.map((room) => (
                    <div key={room._id} ref={(element) => { cardRefs.current[room._id] = element }}>
                      <RoomCard
                        room={room}
                        view={viewMode === 'list' || showMap ? 'list' : 'grid'}
                        highlighted={highlightedId === room._id}
                        distanceText={calcDistance(userLocation, room.location?.coordinates)}
                        initialFavorited={favoriteIds.includes(String(room._id))}
                        amenitiesMap={Object.fromEntries(AMENITIES.map((item) => [item.value, item.label]))}
                      />
                    </div>
                  ))}
                </div>
                {!isDefaultState && (
                  <Pagination page={page} total={pagination.total} totalPages={pagination.totalPages} onChange={handlePage} />
                )}
              </>
            )}
          </main>

          {showMap && (
            <aside className="hidden w-[400px] shrink-0 overflow-hidden rounded-lg border bg-card md:block xl:w-[460px]" style={{ height: 'calc(100svh - 132px)' }}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {mapLoading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <MapIcon className="h-4 w-4 text-primary" />}
                  {roomPositions.length} phòng trên bản đồ
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Phòng</span>
                  {userLocation && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Bạn</span>}
                </div>
              </div>
              <MapContainer center={mapCenter} zoom={13} className="h-full w-full" key={mapCenter.join(',')}>
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {userLocation && (
                  <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={9} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.95, weight: 2 }}>
                    <Popup>Vị trí của bạn</Popup>
                  </CircleMarker>
                )}
                {roomPositions.map((position) => (
                  <CircleMarker key={position.id} center={[position.lat, position.lng]} radius={highlightedId === position.id ? 12 : 8} pathOptions={{ color: highlightedId === position.id ? '#0369a1' : '#0f766e', fillColor: highlightedId === position.id ? '#0ea5e9' : '#14b8a6', fillOpacity: 0.95, weight: 3 }} eventHandlers={{ click: () => handleMarker(position.id) }}>
                    <Tooltip permanent direction="top" offset={[0, -8]} opacity={1}>
                      <span className="text-[11px] font-bold text-primary">{formatShort(position.price)}</span>
                    </Tooltip>
                    <Popup minWidth={220}>
                      <div className="w-56 space-y-2">
                        {position.image && <img src={position.image} alt="" className="h-24 w-full rounded-md object-cover" />}
                        <Link to={`/rooms/${position.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-primary">{position.title}</Link>
                        {position.address && <p className="line-clamp-2 text-xs text-muted-foreground">{position.address}</p>}
                        <p className="text-sm font-bold text-primary">{formatMoney(position.price)}/tháng</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </aside>
          )}
        </div>
      </div>

      {showMap && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-background md:hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">{roomPositions.length} phòng trên bản đồ</p>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => setShowMap(false)}><X className="h-4 w-4" />Đóng</Button>
          </div>
          <MapContainer center={mapCenter} zoom={13} className="flex-1" key={`mobile-${mapCenter.join(',')}`}>
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {userLocation && <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={9} pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.95, weight: 2 }} />}
            {roomPositions.map((position) => (
              <CircleMarker key={position.id} center={[position.lat, position.lng]} radius={highlightedId === position.id ? 12 : 8} pathOptions={{ color: highlightedId === position.id ? '#0369a1' : '#0f766e', fillColor: highlightedId === position.id ? '#0ea5e9' : '#14b8a6', fillOpacity: 0.95, weight: 3 }} eventHandlers={{ click: () => handleMarker(position.id) }}>
                <Tooltip permanent direction="top" offset={[0, -8]} opacity={1}>
                  <span className="text-[11px] font-bold text-primary">{formatShort(position.price)}</span>
                </Tooltip>
                <Popup minWidth={220}>
                  <div className="w-56 space-y-2">
                    {position.image && <img src={position.image} alt="" className="h-24 w-full rounded-md object-cover" />}
                    <Link to={`/rooms/${position.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-primary">{position.title}</Link>
                    {position.address && <p className="line-clamp-2 text-xs text-muted-foreground">{position.address}</p>}
                    <p className="text-sm font-bold text-primary">{formatMoney(position.price)}/tháng</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      <Sheet open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} title="Bộ lọc tìm kiếm">
        <FilterPanel filters={filters} onChange={handleChange} onReset={handleReset} activeCount={activeCount} compact userLocation={userLocation} onRequestLocation={() => setLocationPickerOpen(true)} />
        <Button className="mt-5 w-full rounded-lg" onClick={() => setMobileFilterOpen(false)}>
          Xem {pagination.total > 0 ? `${pagination.total} phòng` : 'kết quả'}
        </Button>
      </Sheet>

      <RoomFinderWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <LocationPickerDialog open={locationPickerOpen} onClose={() => setLocationPickerOpen(false)} onSelect={(coords) => setUserLocation(coords)} />
    </div>
  )
}
