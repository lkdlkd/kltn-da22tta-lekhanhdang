import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  Sparkles, MapPin, Loader2, RotateCcw, RefreshCw, Eye, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomCard } from '@/components/rooms/RoomCard'
import { cn } from '@/lib/utils'
import { selectIsAuthenticated } from '@/features/auth/authSlice'
import { forYouApi, wizardRecommendApi } from '@/services/recommendService'


// ── Distance helpers ──────────────────────────────────────────────────────────
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
  if (km == null) return null
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

// ── Skeleton Grid ─────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecommendPage() {
  const isAuth = useSelector(selectIsAuthenticated)

  const [loading, setLoading]   = useState(true)
  const [rooms, setRooms]       = useState([])
  const [locating, setLocating] = useState(false)
  const [displayGps, setDisplayGps] = useState(null) // GPS ẩn — chỉ hiển thị khoảng cách
  const [apiGps, setApiGps]     = useState(null)     // GPS gửi API — chỉ khi user bấm "Gần tôi"

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchForYou = useCallback(async (location = null) => {
    setLoading(true)
    try {
      const payload = { limit: 12, ...(location ?? {}) }
      const res = await forYouApi(payload)
      setRooms(res.data?.data?.rooms || [])
    } catch { toast.error('Không tải được gợi ý'); setRooms([]) }
    finally { setLoading(false) }
  }, [])

  const fetchTopForGuest = useCallback(async (location = null) => {
    setLoading(true)
    try {
      const payload = { limit: 12, ...(location ?? {}) }
      const res = await wizardRecommendApi(payload)
      setRooms(res.data?.data?.rooms || [])
    } catch { toast.error('Không tải được gợi ý'); setRooms([]) }
    finally { setLoading(false) }
  }, [])

  const doFetch = useCallback((loc = null) => {
    if (isAuth) fetchForYou(loc)
    else        fetchTopForGuest(loc)
  }, [isAuth, fetchForYou, fetchTopForGuest])

  useEffect(() => { doFetch(null) }, [isAuth]) // eslint-disable-line

  // ── GPS ───────────────────────────────────────────────────────────────────

  const requestGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS. Vui lòng dùng Chrome / Firefox / Safari.')
      return
    }
    setLocating(true)

    const onSuccess = (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setApiGps(coords)
      setDisplayGps(coords)
      setLocating(false)
      doFetch(coords)
    }

    const onError = (err) => {
      setLocating(false)
      if (err.code === 1) toast.error('Bạn đã từ chối GPS.')
      else if (err.code === 2) toast.error('Không xác định được vị trí.')
      else if (err.code === 3) toast.error('Hết thời gian lấy GPS.')
      else toast.error('Không lấy được vị trí.')
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true, timeout: 15000, maximumAge: 0,
    })
  }

  const clearGPS = () => {
    setApiGps(null)
    doFetch(null)
  }

  const sourceLabel = apiGps
    ? '📍 Phòng gần bạn nhất'
    : isAuth
      ? '✨ Gợi ý dành riêng cho bạn'
      : '🔥 Phổ biến nhất hôm nay'

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-md shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-tight sm:text-2xl">Gợi ý cho bạn</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAuth ? 'Cá nhân hóa theo thói quen xem phòng của bạn' : 'Đăng nhập để nhận gợi ý riêng theo sở thích'}
              </p>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            className="gap-1.5 h-8 shrink-0"
            onClick={() => doFetch(apiGps)}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Làm mới
          </Button>
        </div>

        {/* ── Guest CTA ── */}
        {!isAuth && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
            <Eye className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground flex-1 min-w-0">
              Đăng nhập để hệ thống học theo phòng bạn đã xem và yêu thích.
            </p>
            <Button asChild size="sm" className="shrink-0 gap-1.5 h-8">
              <Link to="/login"><Sparkles className="h-3.5 w-3.5" /> Đăng nhập</Link>
            </Button>
          </div>
        )}

        {/* ── Location bar ── */}
        <div className={cn(
          'rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3 transition-colors',
          apiGps ? 'bg-primary/5 border-primary/25' : 'bg-card'
        )}>
          <span className="text-sm font-medium text-muted-foreground shrink-0">📍 Vị trí</span>

          {!apiGps ? (
            <Button
              size="sm" variant="outline"
              className="gap-2 h-8 border-primary/40 text-primary hover:bg-primary/5"
              onClick={requestGPS}
              disabled={locating}
            >
              {locating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lấy vị trí...</>
                : <><MapPin className="h-3.5 w-3.5" /> Gần tôi</>}
            </Button>
          ) : (
            <>
              <Badge variant="secondary" className="gap-1.5 font-medium">
                <MapPin className="h-3 w-3 text-primary" />
                Đã bật — ưu tiên phòng gần nhất
              </Badge>
              <Button
                size="sm" variant="ghost"
                className="gap-1.5 h-7 text-xs text-muted-foreground ml-auto hover:text-destructive"
                onClick={clearGPS}
              >
                <X className="h-3 w-3" /> Tắt GPS
              </Button>
            </>
          )}
        </div>

        {/* ── Results label ── */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{sourceLabel}</p>
          {!loading && rooms.length > 0 && (
            <Badge variant="outline" className="text-xs tabular-nums">{rooms.length} phòng</Badge>
          )}
        </div>

        {/* ── Results ── */}
        {loading ? (
          <SkeletonGrid />
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 rounded-xl border border-dashed">
            <span className="text-5xl">{apiGps ? '📍' : '🏠'}</span>
            <div className="text-center space-y-1 max-w-xs">
              <p className="text-sm font-medium">
                {apiGps ? 'Không có phòng nào gần bạn' : 'Chưa có gợi ý phù hợp'}
              </p>
              <p className="text-xs text-muted-foreground">
                {apiGps
                  ? 'Thử tắt GPS để xem gợi ý theo sở thích của bạn.'
                  : 'Hãy xem thêm một vài phòng để hệ thống học sở thích của bạn.'}
              </p>
            </div>
            {apiGps && (
              <Button size="sm" onClick={clearGPS} variant="outline" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Tắt GPS
              </Button>
            )}
          </div>
        ) : rooms !== null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(r => (
              <RoomCard
                key={r._id}
                room={r}
                distanceText={getRoomDistanceText(r, displayGps?.lat, displayGps?.lng)}
              />
            ))}
          </div>
        ) : null}

      </div>
    </div>
  )
}
