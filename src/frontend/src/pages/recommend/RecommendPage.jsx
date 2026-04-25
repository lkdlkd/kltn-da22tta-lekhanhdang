import { useEffect, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  Sparkles, MapPin, Loader2, Check, RotateCcw,
  Save, SlidersHorizontal, ChevronDown, ChevronUp, RefreshCw, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { RoomCard } from '@/components/rooms/RoomCard'
import { cn } from '@/lib/utils'
import { selectCurrentUser, selectIsAuthenticated, updateUser } from '@/features/auth/authSlice'
import { forYouApi, wizardRecommendApi } from '@/services/recommendService'
import { updatePreferencesApi } from '@/services/userService'

// ── Constants ─────────────────────────────────────────────────────────────────
const ROOM_TYPES = [
  { value: null,              label: 'Tất cả',        emoji: '🏘️' },
  { value: 'phòng_trọ',      label: 'Phòng trọ',     emoji: '🛏️' },
  { value: 'chung_cư_mini',  label: 'Chung cư mini',  emoji: '🏢' },
  { value: 'nhà_nguyên_căn', label: 'Nhà nguyên căn', emoji: '🏠' },
  { value: 'ký_túc_xá',     label: 'Ký túc xá',      emoji: '🎓' },
]
const PRICE_RANGES = [
  { label: '< 1 triệu',  min: 0,         max: 1_000_000  },
  { label: '1–2 triệu',  min: 1_000_000, max: 2_000_000  },
  { label: '2–3 triệu',  min: 2_000_000, max: 3_000_000  },
  { label: '3–5 triệu',  min: 3_000_000, max: 5_000_000  },
  { label: '> 5 triệu',  min: 5_000_000, max: 20_000_000 },
  { label: 'Linh hoạt',  min: 0,         max: 20_000_000 },
]
const AREA_OPTIONS    = [10, 15, 20, 25, 30, 40]
const CAP_OPTIONS     = [{ v: 1, l: '1 người' }, { v: 2, l: '2 người' }, { v: 3, l: '3+ người' }]
const RADIUS_OPTIONS  = [1, 3, 5, 10]
const AMENITY_OPTIONS = [
  { value: 'wifi',           label: 'Wifi',       emoji: '📶' },
  { value: 'điều_hòa',      label: 'Điều hòa',   emoji: '❄️' },
  { value: 'nóng_lạnh',     label: 'Nóng lạnh',  emoji: '🚿' },
  { value: 'tủ_lạnh',       label: 'Tủ lạnh',    emoji: '🧊' },
  { value: 'máy_giặt',      label: 'Máy giặt',   emoji: '🫧' },
  { value: 'bếp',           label: 'Bếp nấu',    emoji: '🍳' },
  { value: 'chỗ_để_xe',     label: 'Chỗ để xe',  emoji: '🏍️' },
  { value: 'an_ninh',       label: 'An ninh',     emoji: '🔒' },
  { value: 'ban_công',      label: 'Ban công',    emoji: '🌿' },
  { value: 'nội_thất',      label: 'Nội thất',    emoji: '🛋️' },
  { value: 'vệ_sinh_riêng', label: 'VS riêng',    emoji: '🚽' },
  { value: 'thang_máy',     label: 'Thang máy',   emoji: '🛗' },
]
const EMPTY_CRITERIA = {
  roomType: null, priceMin: 0, priceMax: 20_000_000,
  areaMin: 0, capacity: 1, amenities: [], lat: null, lng: null, radius: 5,
}

// ── Distance helpers ───────────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatDistance(km) {
  if (km === null || km === undefined) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${Math.round(km * 10) / 10} km`
}

function getRoomDistanceText(room, userLat, userLng) {
  if (!userLat || !userLng) return null
  const coords = room?.location?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  return formatDistance(haversineKm(userLat, userLng, lat, lng))
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all shrink-0',
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/60'
      )}>
      {children}
      {active && <Check className="h-3 w-3 ml-1 text-primary" />}
    </button>
  )
}

// ── Filter Panel ──────────────────────────────────────────────────────────────
function FilterPanel({ criteria, onChange, onApply, onReset, saving, isAuth, onGps }) {
  const [locating, setLocating] = useState(false)
  const activePrice = PRICE_RANGES.find(r => r.min === criteria.priceMin && r.max === criteria.priceMax)

  const getGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS. Vui lòng dùng Chrome / Firefox / Safari.')
      return
    }
    setLocating(true)

    const onSuccess = (pos) => {
      const gps = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      onChange(gps)
      onGps?.(gps)
      setLocating(false)
    }

    const onError = (err, isRetry = false) => {
      if (!isRetry && err.code === err.TIMEOUT) {
        // Thử lại với độ chính xác thấp hơn (nhanh hơn)
        navigator.geolocation.getCurrentPosition(onSuccess, (e) => onError(e, true), {
          enableHighAccuracy: false, timeout: 10000, maximumAge: 60000,
        })
        return
      }
      setLocating(false)
      switch (err.code) {
        case err.PERMISSION_DENIED:
          toast.error('Bạn đã tắt GPS. Vui lòng cấp quyền vị trí trong cài đặt trình duyệt.')
          break
        case err.POSITION_UNAVAILABLE:
          toast.error('Không xác định được vị trí. Kiểm tra kết nối mạng / GPS thiết bị.')
          break
        case err.TIMEOUT:
          toast.error('Hết thời gian lấy GPS. Vui lòng thử lại.')
          break
        default:
          toast.error('Không lấy được vị trí.')
      }
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,   // độ chính xác cao (GPS chip)
      timeout: 8000,              // tối đa 8s trước khi retry
      maximumAge: 30000,          // dùng cache GPS tối đa 30s
    })
  }
  const toggleAmenity = v => onChange({
    amenities: criteria.amenities.includes(v)
      ? criteria.amenities.filter(a => a !== v)
      : [...criteria.amenities, v],
  })

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loại phòng</p>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_TYPES.map(({ value, label, emoji }) => (
            <Chip key={String(value)} active={criteria.roomType === value} onClick={() => onChange({ roomType: value })}>
              {emoji} {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngân sách / tháng</p>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_RANGES.map(r => (
            <Chip key={r.label} active={activePrice?.label === r.label}
              onClick={() => onChange({ priceMin: r.min, priceMax: r.max })}>{r.label}</Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diện tích tối thiểu</p>
          <div className="flex flex-wrap gap-1.5">
            {AREA_OPTIONS.map(a => (
              <Chip key={a} active={criteria.areaMin === a} onClick={() => onChange({ areaMin: a })}>{a} m²</Chip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Số người ở</p>
          <div className="flex flex-wrap gap-1.5">
            {CAP_OPTIONS.map(({ v, l }) => (
              <Chip key={v} active={criteria.capacity === v} onClick={() => onChange({ capacity: v })}>{l}</Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tiện ích mong muốn</p>
        <div className="flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.map(({ value, label, emoji }) => (
            <Chip key={value} active={criteria.amenities.includes(value)} onClick={() => toggleAmenity(value)}>
              {emoji} {label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Khu vực (GPS)</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={criteria.lat ? 'default' : 'outline'}
            className="gap-1.5 h-8" onClick={getGPS} disabled={locating}>
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {criteria.lat ? '✅ Có GPS' : 'Dùng GPS'}
          </Button>
          {criteria.lat && (
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map(r => (
                <Chip key={r} active={criteria.radius === r} onClick={() => onChange({ radius: r })}>{r} km</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" /> Xóa lọc
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onApply} disabled={saving}>
          {saving
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang áp dụng...</>
            : <><Save className="h-3.5 w-3.5" /> {isAuth ? 'Lưu & áp dụng' : 'Áp dụng'}</>}
        </Button>
      </div>
    </div>
  )
}

// ── Skeleton Grid ─────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="rounded-2xl border overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecommendPage() {
  const dispatch = useDispatch()
  const isAuth   = useSelector(selectIsAuthenticated)
  const user     = useSelector(selectCurrentUser)

  const [source, setSource]       = useState('popular')
  const [loading, setLoading]     = useState(true)
  const [rooms, setRooms]         = useState(null)
  const [expanded, setExpanded]   = useState(false)
  const [hasFilter, setHasFilter] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [criteria, setCriteria]   = useState({ ...EMPTY_CRITERIA, ...(user?.preferences || {}) })
  const [userGps, setUserGps]     = useState({ lat: null, lng: null }) // GPS riêng cho hiển thị khoảng cách

  /**
   * API 3 — /for-you (logged in users)
   * Backend tự suy ra sở thích từ lịch sử Interaction.
   * extra = criteria bổ sung từ user (tùy chọn)
   */
  const fetchForYou = useCallback(async (extra = {}) => {
    setLoading(true)
    try {
      const res = await forYouApi({ ...extra, limit: 12 })
      setRooms(res.data?.data?.rooms || [])
      setSource('popular')
    } catch { toast.error('Không tải được gợi ý') }
    finally { setLoading(false) }
  }, [])

  /**
   * API 2 — /wizard với EMPTY_CRITERIA (guest users)
   * Trả về top phòng phổ biến theo _behavior
   */
  const fetchTopForGuest = useCallback(async () => {
    setLoading(true)
    try {
      const res = await wizardRecommendApi({ ...EMPTY_CRITERIA, limit: 12 })
      setRooms(res.data?.data?.rooms || [])
      setSource('popular')
    } catch { toast.error('Không tải được gợi ý') }
    finally { setLoading(false) }
  }, [])

  // On mount
  useEffect(() => {
    if (isAuth) {
      // Logged-in: dùng API 3 — backend tự lo behavior history
      fetchForYou({})
    } else {
      // Guest: dùng API 2 — top phổ biến
      fetchTopForGuest()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth])

  // Sync criteria từ user preferences
  useEffect(() => {
    if (user?.preferences) setCriteria(p => ({ ...p, ...user.preferences }))
  }, [user?._id])

  // Apply filter
  const handleApply = async () => {
    if (isAuth) {
      setSaving(true)
      try {
        const res = await updatePreferencesApi(criteria)
        if (res.data?.data?.user) dispatch(updateUser(res.data.data.user))
        toast.success('Đã lưu tiêu chí!')
      } catch { toast.error('Lưu thất bại') }
      finally { setSaving(false) }
    }
    setHasFilter(true)
    setExpanded(false)
    if (isAuth) fetchForYou(criteria)
    else fetchTopForGuest()
  }

  const handleReset = () => {
    setCriteria(EMPTY_CRITERIA)
    setHasFilter(false)
    setExpanded(false)
    if (isAuth) fetchForYou({})
    else fetchTopForGuest()
  }

  const handleRefresh = () => {
    if (isAuth) fetchForYou(hasFilter ? criteria : {})
    else fetchTopForGuest()
  }

  const sourceLabel = hasFilter
    ? '🎯 Theo tiêu chí của bạn'
    : isAuth
      ? '✨ Gợi ý dành riêng cho bạn'
      : '🔥 Phổ biến nhất hôm nay'

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Gợi ý cho bạn</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            {isAuth
              ? 'Tự động cập nhật theo thói quen xem phòng. Thêm tiêu chí nếu muốn chính xác hơn.'
              : 'Đăng nhập để nhận gợi ý cá nhân hóa theo lịch sử xem phòng của bạn.'}
          </p>
        </div>

        {/* Guest CTA */}
        {!isAuth && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Gợi ý chưa được cá nhân hóa</p>
              <p className="text-xs text-muted-foreground">Đăng nhập để hệ thống học theo phòng bạn đã xem và yêu thích.</p>
            </div>
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link to="/login"><Sparkles className="h-3.5 w-3.5" /> Đăng nhập</Link>
            </Button>
          </div>
        )}

        {/* Optional filter panel */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex w-full items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold">Lọc thêm tiêu chí</span>
              {hasFilter && <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Đang lọc</Badge>}
              <span className="text-xs text-muted-foreground">(tùy chọn)</span>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {expanded && (
            <>
              <Separator />
              <FilterPanel
                criteria={criteria}
                onChange={patch => setCriteria(p => ({ ...p, ...patch }))}
                onApply={handleApply}
                onReset={handleReset}
                saving={saving}
                isAuth={isAuth}
                onGps={gps => setUserGps(gps)}
              />
            </>
          )}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-semibold truncate">{sourceLabel}</p>
            {rooms !== null && !loading && <Badge variant="outline" className="text-xs shrink-0">{rooms.length} phòng</Badge>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasFilter && (
              <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-muted-foreground text-xs" onClick={handleReset}>
                <RotateCcw className="h-3 w-3" /> Xóa lọc
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Làm mới
            </Button>
          </div>
        </div>

        {/* Results */}
        {loading ? <SkeletonGrid />
          : rooms?.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 rounded-2xl border border-dashed text-center">
              <span className="text-5xl">🏘️</span>
              <p className="text-sm text-muted-foreground max-w-xs">
                Không tìm thấy phòng phù hợp. Thử xóa bớt tiêu chí.
              </p>
              <Button size="sm" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Xóa bộ lọc
              </Button>
            </div>
          ) : rooms !== null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map(r => (
                <RoomCard
                  key={r._id}
                  room={r}
                  distanceText={getRoomDistanceText(r, userGps.lat || criteria.lat, userGps.lng || criteria.lng)}
                />
              ))}
            </div>
          ) : null}
      </div>
    </div>
  )
}
