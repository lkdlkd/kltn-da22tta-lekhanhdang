import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Sparkles, MapPin, RotateCcw, RefreshCw, LogIn, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { RoomCard } from '@/components/rooms/RoomCard'
import { LocationPickerDialog } from '@/components/common/LocationPickerDialog'
import { cn } from '@/lib/utils'
import { selectIsAuthenticated } from '@/features/auth/authSlice'
import { forYouApi, wizardRecommendApi } from '@/services/recommendService'

// ── Distance helpers ───────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function getRoomDistanceText(room, userLat, userLng) {
  if (!userLat || !userLng) return null
  const coords = room?.location?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  const km = haversineKm(userLat, userLng, lat, lng)
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km * 10) / 10} km`
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RecommendPage() {
  const isAuth = useSelector(selectIsAuthenticated)

  const [loading, setLoading]   = useState(true)
  const [rooms, setRooms]       = useState([])
  const [displayGps, setDisplayGps] = useState(null)
  const [apiGps, setApiGps]     = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchForYou = useCallback(async (location = null) => {
    setLoading(true)
    try {
      const res = await forYouApi({ limit: 12, ...(location ?? {}) })
      setRooms(res.data?.data?.rooms || [])
    } catch { toast.error('Không tải được gợi ý'); setRooms([]) }
    finally { setLoading(false) }
  }, [])

  const fetchTopForGuest = useCallback(async (location = null) => {
    setLoading(true)
    try {
      const res = await wizardRecommendApi({ limit: 12, ...(location ?? {}) })
      setRooms(res.data?.data?.rooms || [])
    } catch { toast.error('Không tải được gợi ý'); setRooms([]) }
    finally { setLoading(false) }
  }, [])

  const doFetch = useCallback((loc = null) => {
    if (isAuth) fetchForYou(loc)
    else        fetchTopForGuest(loc)
  }, [isAuth, fetchForYou, fetchTopForGuest])

  useEffect(() => { doFetch(null) }, [isAuth]) // eslint-disable-line

  // ── Location select ────────────────────────────────────────────────────────
  const handleLocationSelect = (coords) => {
    setApiGps(coords)
    setDisplayGps(coords)
    doFetch(coords)
    toast.success('Đã cập nhật vị trí')
  }

  const clearGPS = () => {
    setApiGps(null)
    doFetch(null)
  }

  // ── Label ──────────────────────────────────────────────────────────────────
  const sourceLabel = apiGps
    ? 'Phòng gần bạn nhất'
    : isAuth ? 'Gợi ý dành riêng cho bạn' : 'Phổ biến nhất hôm nay'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gợi ý cho bạn</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAuth
                ? 'Cá nhân hóa theo thói quen xem phòng của bạn'
                : 'Đăng nhập để nhận gợi ý riêng theo sở thích'}
            </p>
          </div>
          <Button
            size="sm" variant="outline"
            className="gap-1.5"
            onClick={() => doFetch(apiGps)}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Làm mới
          </Button>
        </div>

        <Separator />

        {/* ── Guest banner ── */}
        {!isAuth && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              Đăng nhập để hệ thống học theo phòng bạn đã xem và yêu thích.
            </p>
            <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
              <Link to="/login"><LogIn className="h-3.5 w-3.5" /> Đăng nhập</Link>
            </Button>
          </div>
        )}

        {/* ── Location bar ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Vị trí</span>

          {apiGps ? (
            <>
              <Badge variant="secondary" className="gap-1.5 ml-1">
                <MapPin className="h-3 w-3 text-primary" />
                Đang dùng vị trí — ưu tiên phòng gần nhất
              </Badge>
              <Button
                size="sm" variant="ghost"
                className="gap-1 h-7 text-xs ml-auto text-muted-foreground hover:text-destructive"
                onClick={clearGPS}
              >
                <X className="h-3 w-3" /> Xoá vị trí
              </Button>
              <Button
                size="sm" variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={() => setPickerOpen(true)}
              >
                <MapPin className="h-3 w-3" /> Đổi vị trí
              </Button>
            </>
          ) : (
            <Button
              size="sm" variant="outline"
              className="gap-1.5 ml-auto"
              onClick={() => setPickerOpen(true)}
            >
              <MapPin className="h-3.5 w-3.5" /> Bật vị trí — xem phòng gần bạn
            </Button>
          )}
        </div>

        {/* ── Results header ── */}
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
            <span className="text-4xl">{apiGps ? '📍' : '🏠'}</span>
            <div className="text-center space-y-1.5 max-w-xs">
              <p className="text-sm font-semibold">
                {apiGps ? 'Không có phòng nào gần bạn' : 'Chưa có gợi ý phù hợp'}
              </p>
              <p className="text-xs text-muted-foreground">
                {apiGps
                  ? 'Thử xoá vị trí để xem gợi ý theo sở thích.'
                  : 'Hãy xem thêm một vài phòng để hệ thống học sở thích của bạn.'}
              </p>
            </div>
            {apiGps && (
              <Button size="sm" onClick={clearGPS} variant="outline" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Xoá vị trí
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(r => (
              <RoomCard
                key={r._id}
                room={r}
                distanceText={getRoomDistanceText(r, displayGps?.lat, displayGps?.lng)}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Location picker dialog ── */}
      <LocationPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleLocationSelect}
      />
    </div>
  )
}
