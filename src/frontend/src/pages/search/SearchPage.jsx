import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import {
  Search, SlidersHorizontal, Map as MapIcon, X,
  ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw,
  Wifi, Wind, WashingMachine, Package, ChefHat, Car,
  ShieldCheck, Flame, Sofa, Bath, LayoutGrid, DollarSign, Maximize2,
} from 'lucide-react'
import { searchRoomsApi } from '@/services/roomService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Sheet } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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

/* ── FilterSection wrapper ────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">{title}</p>
      {children}
    </div>
  )
}

/* ── PillButton ───────────────────────────────────────────────────────────── */
function Pill({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 select-none',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground/70 hover:border-primary/50 hover:text-foreground',
        className
      )}
    >
      {children}
    </button>
  )
}

/* ── RangeSlider: local state + debounced URL commit ─────────────────────── */
function RangeSlider({ label, icon: Icon, min, max, step, valueMin, valueMax, onCommit, formatVal, suffix = '' }) {
  const [local, setLocal] = useState([valueMin, valueMax])
  const debounceRef = useRef(null)

  // Sync từ URL về local khi filter reset từ bên ngoài
  useEffect(() => {
    setLocal([valueMin, valueMax])
  }, [valueMin, valueMax])

  const handleChange = (vals) => {
    setLocal(vals)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommit(vals[0], vals[1]), 400)
  }

  const isDefault = local[0] === min && local[1] === max

  return (
    <Section title={label}>
      <div className="space-y-3 px-0.5">
        {/* Value display */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground min-w-0">
            <span className="truncate">{formatVal ? formatVal(local[0]) : `${local[0]}${suffix}`}</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1 text-xs font-semibold text-foreground min-w-0">
            <span className="truncate">
              {local[1] >= max
                ? 'Không giới hạn'
                : formatVal ? formatVal(local[1]) : `${local[1]}${suffix}`}
            </span>
          </div>
        </div>

        {/* Slider */}
        <Slider
          min={min}
          max={max}
          step={step}
          value={local}
          onValueChange={handleChange}
          minStepsBetweenThumbs={1}
          className="py-1"
        />

        {/* Min/max labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatVal ? formatVal(min) : `${min}${suffix}`}</span>
          <span>{formatVal ? formatVal(max) : `${max}${suffix}`}+</span>
        </div>
      </div>
    </Section>
  )
}

/* ── FilterPanel ──────────────────────────────────────────────────────────── */
function FilterPanel({ filters, onChange, onReset, activeCount, compact = false }) {
  const toggleAmenity = (val) => {
    const cur = filters.amenities
    onChange('amenities', cur.includes(val) ? cur.filter(a => a !== val) : [...cur, val])
  }

  // Atomic commit — 1 setSearchParams call cho cả min+max
  const commitPrice = useCallback((mn, mx) => {
    onChange('_price', { min: mn, max: mx })
  }, [onChange])

  const commitArea = useCallback((mn, mx) => {
    onChange('_area', { min: mn, max: mx })
  }, [onChange])

  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>

      {/* Reset row */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors w-full justify-center"
        >
          <RotateCcw className="h-3 w-3" />
          Xoá {activeCount} bộ lọc đang bật
        </button>
      )}

      {/* Loại phòng */}
      <Section title="Loại phòng">
        <div className="flex flex-wrap gap-1.5">
          {ROOM_TYPES.map(t => (
            <Pill key={t.value} active={filters.roomType === t.value} onClick={() => onChange('roomType', t.value)}>
              {t.label}
            </Pill>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Giá thuê */}
      <RangeSlider
        label="Giá thuê / tháng"
        min={0} max={PRICE_MAX} step={100_000}
        valueMin={filters.minPrice} valueMax={filters.maxPrice}
        formatVal={fmtShort}
        onCommit={commitPrice}
      />

      <Separator />

      {/* Diện tích */}
      <RangeSlider
        label="Diện tích (m²)"
        min={0} max={AREA_MAX} step={5}
        valueMin={filters.minArea} valueMax={filters.maxArea}
        suffix=" m²"
        onCommit={commitArea}
      />

      <Separator />

      {/* Trạng thái + Bán kính */}
      <Section title="Trạng thái">
        <label className="flex cursor-pointer items-center gap-2.5 py-0.5 group">
          <span className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
            filters.isAvailable === 'true'
              ? 'border-primary bg-primary'
              : 'border-border bg-background group-hover:border-primary/50'
          )}
            onClick={() => onChange('isAvailable', filters.isAvailable === 'true' ? '' : 'true')}
          >
            {filters.isAvailable === 'true' && (
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span
            className="text-sm select-none cursor-pointer"
            onClick={() => onChange('isAvailable', filters.isAvailable === 'true' ? '' : 'true')}
          >
            Chỉ phòng còn trống
          </span>
        </label>
      </Section>

      <Separator />

      {/* Bán kính GPS */}
      <Section title="Bán kính từ vị trí bạn">
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map(r => (
            <Pill key={r.value} active={filters.radius === r.value} onClick={() => onChange('radius', r.value)}>
              {r.label}
            </Pill>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Cần bật GPS để lọc theo khoảng cách</p>
      </Section>

      <Separator />

      {/* Tiện ích */}
      <Section title="Tiện ích">
        <div className="grid grid-cols-2 gap-1.5">
          {AMENITIES.map(({ value, label, icon: Icon }) => {
            const on = filters.amenities.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleAmenity(value)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all duration-150',
                  on
                    ? 'border-primary bg-primary/8 text-primary'
                    : 'border-border bg-background text-foreground/70 hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} />
                {label}
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

/* ── SearchPage ───────────────────────────────────────────────────────────── */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [qInput, setQInput] = useState(searchParams.get('q') || '')
  const cardRefs = useRef({})

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

  /* GPS */
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { }
    )
  }, [])

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

  /* Map data */
  const roomPos = useMemo(() =>
    rooms.filter(r => r.location?.coordinates?.length === 2).map(r => ({
      id: r._id, slug: r.slug, title: r.title, price: r.price,
      lat: r.location.coordinates[1], lng: r.location.coordinates[0],
    })), [rooms])

  const mapCenter = roomPos.length ? [roomPos[0].lat, roomPos[0].lng] : [10.2547, 105.9722]

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
    <div
      className="flex flex-col"
      style={{ height: 'calc(100svh - var(--navbar-h))' }}
    >
      {/* ┌─ TOPBAR ──────────────────────────────────────────────────────┐ */}
      <div className="z-20 shrink-0 border-b bg-background shadow-sm">
        {/* Search row */}
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">

          {/* Mobile filter trigger */}
          <div className="relative sm:hidden shrink-0">
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
          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 sm:px-4">
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
      {/* └──────────────────────────────────────────────────────────────┘ */}

      {/* ┌─ BODY ────────────────────────────────────────────────────────┐ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — desktop lg+ */}
        <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 flex-col border-r bg-background overflow-y-auto scrollbar-none">
          <div className="p-4 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-sm">Bộ lọc</p>
              {activeCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {activeCount}
                </span>
              )}
            </div>
            <FilterPanel filters={filters} onChange={handleChange} onReset={handleReset} activeCount={activeCount} />
          </div>
        </aside>

        {/* ── Card list ── */}
        <div className="flex-1 overflow-y-auto scrollbar-none">

          {/* Mobile toolbar: sort + map */}
          <div className="flex items-center gap-2 border-b px-3 py-2 sm:hidden bg-muted/30">
            <select value={filters.sort} onChange={(e) => handleChange('sort', e.target.value)}
              className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-lg shrink-0"
              onClick={() => setShowMap(v => !v)}>
              <MapIcon className="h-3.5 w-3.5" />
              {showMap ? 'Danh sách' : 'Bản đồ'}
            </Button>
          </div>

          {/* Grid */}
          {loading ? (
            <div className={cn(
              'grid gap-3 p-3 sm:gap-4 sm:p-4 sm:grid-cols-2',
              showMap ? 'lg:grid-cols-2 xl:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-3'
            )}>
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-4xl">🔍</div>
              <div>
                <h2 className="font-semibold text-base">Không tìm thấy phòng nào</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">Thử thay đổi từ khoá hoặc xoá bớt bộ lọc.</p>
              </div>
              <Button variant="outline" className="gap-2 rounded-full" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <div className={cn(
                'grid gap-3 sm:gap-4 sm:grid-cols-2',
                showMap ? 'lg:grid-cols-2 xl:grid-cols-2' : 'lg:grid-cols-3 xl:grid-cols-3'
              )}>
                {rooms.map(room => (
                  <div
                    key={room._id}
                    ref={el => { cardRefs.current[room._id] = el }}
                    className={cn('rounded-xl transition-all duration-200',
                      highlightedId === room._id && 'ring-2 ring-primary shadow-md')}
                  >
                    <RoomCard room={room} />
                  </div>
                ))}
              </div>
              <Pagination page={page} total={pagination.total} totalPages={pagination.totalPages} onChange={handlePage} />
            </div>
          )}
        </div>

        {/* ── Map panel — desktop right ── */}
        {showMap && (
          <div className="hidden sm:flex w-[400px] xl:w-[480px] shrink-0 flex-col border-l">
            <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/20 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">
                {roomPos.length} phòng trên bản đồ
              </span>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block border border-red-700" />Phòng</span>
                {userLocation && <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block border border-blue-700" />Bạn</span>}
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
                  pathOptions={{
                    color: '#b91c1c',
                    fillColor: highlightedId === pos.id ? '#dc2626' : '#f87171',
                    fillOpacity: 0.95, weight: 2,
                  }}
                  eventHandlers={{ click: () => handleMarker(pos.id) }}>
                  <Popup>
                    <Link to={`/rooms/${pos.slug}`} className="font-semibold text-sm hover:underline block leading-snug">
                      {pos.title}
                    </Link>
                    <span className="text-xs text-muted-foreground mt-0.5 block">{fmtVND(pos.price)}/tháng</span>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
      {/* └──────────────────────────────────────────────────────────────┘ */}

      {/* Mobile map fullscreen */}
      {showMap && (
        <div className="sm:hidden fixed inset-0 z-40 flex flex-col bg-background" style={{ top: 'var(--navbar-h)' }}>
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
        <FilterPanel filters={filters} onChange={handleChange} onReset={handleReset} activeCount={activeCount} compact />
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
    </div>
  )
}
