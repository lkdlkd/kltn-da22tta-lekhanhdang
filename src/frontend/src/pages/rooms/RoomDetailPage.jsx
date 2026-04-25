import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import {
  Navigation, Share2, ArrowLeft, X,
  MapPin, Wifi, Wind, Flame, Package, WashingMachine,
  ChefHat, Car, ShieldCheck, Camera, Trees, Sofa, Bath, Zap,
  ArrowUp, MessageCircle, Calendar, Clock,
  CheckCircle2, XCircle, SquareArrowOutUpRight,
  ChevronLeft, ChevronRight, TrendingUp,
  House, Send, ImageIcon, Expand, Play,
  GitCompare, Heart, Flag,
} from 'lucide-react'
import { getRoomBySlugApi } from '@/services/roomService'
import { createInteractionApi } from '@/services/interactionService'
import { getFavoriteIdsApi } from '@/services/favoriteService'
import { createConversationApi } from '@/services/chatService'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FavoriteButton } from '@/components/rooms/FavoriteButton'
import { CommentSection } from '@/components/rooms/CommentSection'
import { BookingDialog } from '@/components/rooms/BookingDialog'
import { ReportButton } from '@/components/rooms/ReportButton'
import { CompareButton } from '@/components/compare/CompareBar'
import { PanoramaViewer } from '@/components/rooms/PanoramaViewer'
import { SimilarRooms } from '@/components/rooms/SimilarRooms'
import { cn } from '@/lib/utils'

// ── Config ─────────────────────────────────────────────────────────────────
const ROOM_TYPE_LABELS = {
  'phòng_trọ': 'Phòng trọ',
  'chung_cư_mini': 'Chung cư mini',
  'nhà_nguyên_căn': 'Nhà nguyên căn',
  'ký_túc_xá': 'Ký túc xá',
}
const AMENITY_CONFIG = {
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
  'vệ_sinh_riêng': { label: 'VS riêng', icon: Bath },
  'điện_nước_riêng': { label: 'ĐN riêng', icon: Zap },
}

const fmtPrice = (v) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0)

const fmtAddress = (a) => {
  if (!a) return ''
  if (typeof a === 'string') return a
  return a.fullAddress || [a.street, a.ward, a.district, a.city].filter(Boolean).join(', ')
}

// ── Image Lightbox ─────────────────────────────────────────────────────────
function ImageLightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex ?? 0)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [images.length, onClose])

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-medium text-white/70">
          {idx + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image */}
      <div className="flex flex-1 items-center justify-center px-12 min-h-0" onClick={e => e.stopPropagation()}>
        <img
          src={images[idx]}
          alt={`Ảnh ${idx + 1}`}
          className="max-h-full max-w-full object-contain select-none"
        />
      </div>

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 px-4 py-3 overflow-x-auto shrink-0" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={cn('shrink-0 overflow-hidden rounded-md transition-all',
                i === idx ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70')}>
              <img src={img} alt="" className="h-12 w-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="w-full rounded-2xl" style={{ height: 340 }} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9 flex-1 rounded-lg" />)}</div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── Stat Item ──────────────────────────────────────────────────────────────
function StatItem({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3 text-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function RoomDetailPage() {
  const { slug } = useParams()
  const user = useSelector((s) => s.auth?.user)
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [panoramaSrc, setPanoramaSrc] = useState(null)
  const [lightboxIdx, setLightboxIdx] = useState(null)   // null = closed
  const [imgIdx, setImgIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('info')
  const [userLocation, setUserLocation] = useState(null)
  const [distanceText, setDistanceText] = useState('')
  const [gpsBlocked, setGpsBlocked]     = useState(false)  // user tắt GPS trong browser
  const [gpsError, setGpsError]         = useState(false)  // lỗi khác (timeout/unavailable)
  const [routePositions, setRoutePositions] = useState([])
  const [routeSummary, setRouteSummary] = useState('')
  const [routing, setRouting] = useState(false)
  const [inquiryText, setInquiryText] = useState('')
  const [inquirySending, setInquirySending] = useState(false)
  const mapRef = useRef(null)
  const socket = getSocket()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    setErrorMsg('')
    getRoomBySlugApi(slug)
      .then((r) => setRoom(r.data?.data?.room || null))
      .catch((err) => {
        const msg = err?.response?.data?.message || ''
        if (err?.response?.status === 404) {
          setErrorMsg(msg || 'Không tìm thấy phòng')
        } else {
          toast.error('Không thể tải chi tiết phòng')
        }
      })
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!room?.location?.coordinates) return
    const [roomLng, roomLat] = room.location.coordinates

    const onGpsSuccess = (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      setUserLocation({ lat, lng })
      setGpsBlocked(false); setGpsError(false)
      // Tính khoảng cách Haversine
      const R = 6371
      const dLat = ((roomLat - lat) * Math.PI) / 180
      const dLng = ((roomLng - lng) * Math.PI) / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((roomLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
      const km = R * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
      setDistanceText(km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)
    }

    const onGpsError = (err) => {
      if (err.code === err.PERMISSION_DENIED) setGpsBlocked(true)
      else setGpsError(true)
    }

    if (!navigator.geolocation) { setGpsBlocked(true); return }
    navigator.geolocation.getCurrentPosition(onGpsSuccess, onGpsError, {
      enableHighAccuracy: false, timeout: 6000, maximumAge: 60000,
    })
  }, [room])

  useEffect(() => { setImgIdx(0) }, [room?.slug])

  useEffect(() => {
    if (!room?._id || !user) return
    createInteractionApi(room._id, 'view').catch(() => { })
    getFavoriteIdsApi()
      .then((r) => setIsFavorited((r.data?.data?.roomIds || []).includes(String(room._id))))
      .catch(() => { })
  }, [room?._id, user])

  const roomPosition = useMemo(() => {
    if (!room?.location?.coordinates) return null
    const [lng, lat] = room.location.coordinates
    return [lat, lng]
  }, [room])

  const imgs = room?.images || []
  const imgs360 = room?.images360 || []
  const videos = room?.videos || []
  const selectedImg = imgs[imgIdx] || imgs[0] || ''

  const handleShare = async () => {
    const url = `${window.location.origin}/rooms/${room.slug}`
    try {
      if (navigator.share) { await navigator.share({ title: room.title, url }); return }
      await navigator.clipboard.writeText(url)
      toast.success('Đã sao chép link!')
    } catch { toast.error('Không thể sao chép') }
  }

  const handleDirections = async () => {
    if (!roomPosition) return

    const doRoute = async (loc) => {
      try {
        setRouting(true); setRouteSummary('')
        const { lat: oLat, lng: oLng } = loc
        const [dLat, dLng] = roomPosition
        const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`)
        const d = await r.json()
        const route = d?.routes?.[0]
        if (!route?.geometry?.coordinates?.length) throw new Error()
        const pos = route.geometry.coordinates.map(([ln, lt]) => [lt, ln])
        setRoutePositions(pos)
        const dist = route.distance ? `${(route.distance / 1000).toFixed(1)} km` : ''
        const dur = route.duration ? `~${Math.round(route.duration / 60)} phút` : ''
        setRouteSummary([dist, dur].filter(Boolean).join(' · '))
        mapRef.current?.fitBounds?.(pos, { padding: [30, 30] })
        setActiveTab('map')
        toast.success('Đã vẽ tuyến đường!')
      } catch {
        const p = [[loc.lat, loc.lng], roomPosition]
        setRoutePositions(p)
        setRouteSummary('Đường thẳng ước lượng')
        toast.error('Không lấy được lộ trình')
      } finally { setRouting(false) }
    }

    if (userLocation) { doRoute(userLocation); return }

    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS')
      return
    }

    setRouting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setGpsBlocked(false); setGpsError(false)
        doRoute(loc)
      },
      (err) => {
        setRouting(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGpsBlocked(true)
          toast.error('Địa điểm bị tắt. Mở Cài đặt → Trình duyệt → Quyền vị trí để bật.')
        } else {
          setGpsError(true)
          toast.error('Không lấy được vị trí. Kiểm tra kết nối mạng và GPS thiết bị.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const goImg = (dir) => setImgIdx((i) => (i + dir + imgs.length) % imgs.length)
  const userPos = userLocation ? [userLocation.lat, userLocation.lng] : null
  const goMsg = () => { if (!user) { navigate('/login'); return }; navigate(`/messages?to=${room.landlord?._id}&room=${room._id}`) }
  const goBook = () => { if (!user) { navigate('/login'); return }; setBookingOpen(true) }

  if (loading) return <PageSkeleton />
  if (errorMsg || !room) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
      <span className="text-5xl">{errorMsg?.includes('ẩn') || errorMsg?.includes('vi phạm') ? '🚫' : '🏠'}</span>
      <p className="font-semibold text-lg">{errorMsg || 'Không tìm thấy phòng'}</p>
      {(errorMsg?.includes('ẩn') || errorMsg?.includes('công khai')) && (
        <p className="text-sm text-muted-foreground max-w-xs">
          Phòng này đã bị ẩn hoặc xóa bởi quản trị viên do vi phạm nội quy.
        </p>
      )}
      <Button size="sm" asChild><Link to="/search">Tìm phòng khác</Link></Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/search" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Tìm kiếm
        </Link>
        <span>/</span>
        <span className="truncate text-foreground font-medium max-w-[280px]">{room.title}</span>
      </div>

      {/* ── IMAGE GALLERY ─────────────────────────────────────────────── */}
      <div className="space-y-2">

        {/* Main image */}
        <div className="relative overflow-hidden rounded-2xl bg-muted border group">
          {selectedImg ? (
            <>
              {/* Clickable image → lightbox */}
              <button
                type="button"
                className="block w-full focus:outline-none"
                onClick={() => setLightboxIdx(imgIdx)}
              >
                <img
                  src={selectedImg}
                  alt={room.title}
                  className="h-[260px] w-full object-cover sm:h-[400px] transition-transform duration-300 group-hover:scale-[1.01]"
                />
                {/* Expand hint on hover */}
                <span className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-full border border-white/30 bg-black/50 px-2.5 py-1 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Expand className="h-3 w-3" />Xem ảnh lớn
                </span>
              </button>
            </>
          ) : imgs360.length > 0 ? (
            /* No flat images — show 360° CTA */
            <button
              type="button"
              onClick={() => setPanoramaSrc(imgs360[0])}
              className="relative flex h-[260px] w-full flex-col items-center justify-center gap-3 sm:h-[400px] hover:bg-muted/60 transition-colors group/btn"
            >
              <img src={imgs360[0]} alt="360°" className="absolute inset-0 h-full w-full object-cover opacity-30" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/60 bg-black/40 text-3xl group-hover/btn:scale-105 transition-transform">
                  🔭
                </span>
                <span className="rounded-full border border-white/40 bg-black/50 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                  Xem ảnh 360°
                </span>
              </div>
            </button>
          ) : (
            <div className="flex h-[260px] w-full flex-col items-center justify-center gap-2 text-muted-foreground sm:h-[400px]">
              <ImageIcon className="h-12 w-12 opacity-20" />
              <span className="text-sm">Chưa có ảnh</span>
            </div>
          )}

          {/* Status badge + 360° button */}
          <div className="absolute left-3 top-3 z-10 flex gap-2">
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm border',
              room.isAvailable
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
            )}>
              {room.isAvailable
                ? <><CheckCircle2 className="h-3 w-3" />Còn trống</>
                : <><XCircle className="h-3 w-3" />Hết phòng</>}
            </span>
            {imgs360.length > 0 && selectedImg && (
              <button
                type="button"
                onClick={() => setPanoramaSrc(imgs360[0])}
                className="inline-flex items-center gap-1 rounded-full border bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm hover:bg-background transition-colors"
              >
                🔭 Xem 360°
              </button>
            )}
          </div>

          {/* Nav arrows */}
          {imgs.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goImg(-1) }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-background/90 shadow-sm hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goImg(1) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-background/90 shadow-sm hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 right-3 z-10 rounded-full border bg-background/90 px-2.5 py-0.5 text-xs font-medium shadow-sm">
                {imgIdx + 1}/{imgs.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {(imgs.length > 1 || imgs360.length > 0) && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {imgs.map((img, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={cn(
                  'shrink-0 overflow-hidden rounded-lg border transition-all',
                  i === imgIdx ? 'ring-2 ring-primary ring-offset-1' : 'opacity-55 hover:opacity-100'
                )}>
                <img src={img} alt="" className="h-14 w-20 object-cover" />
              </button>
            ))}
            {/* 360° thumbnails */}
            {imgs360.map((img, i) => (
              <button
                key={`360-${i}`}
                onClick={() => setPanoramaSrc(img)}
                title="Xem ảnh 360°"
                className="relative shrink-0 overflow-hidden rounded-lg border-2 border-primary/50 hover:border-primary transition-all"
              >
                <img src={img} alt="360°" className="h-14 w-20 object-cover opacity-70" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">360°</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── VIDEO SECTION ─────────────────────────────────────────────── */}
      {videos.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" />
              Video phòng trọ
              <Badge variant="secondary" className="ml-auto text-xs">{videos.length} video</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={cn('grid gap-3', videos.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
              {videos.map((url, i) => (
                <video
                  key={i}
                  src={url}
                  controls
                  preload="metadata"
                  className="w-full rounded-xl border bg-black object-contain max-h-[280px]"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── LEFT: Info + Tabs ───────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Title + address */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{ROOM_TYPE_LABELS[room.roomType] || 'Phòng trọ'}</Badge>
              {distanceText && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-2.5 w-2.5" />{distanceText}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{room.title}</h1>
            {fmtAddress(room.address) && (
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                {fmtAddress(room.address)}
              </p>
            )}
          </div>

          {/* GPS hints */}
          {gpsBlocked && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs dark:border-amber-800 dark:bg-amber-950/40">
              <span className="text-base leading-none mt-0.5">📍</span>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">Quyền vị trí bị tắt</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  Để xem khoảng cách và chỉ đường, hãy bật vị trí trong trình duyệt:
                </p>
                <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400 list-disc list-inside">
                  <li><span className="font-medium">Chrome:</span> Thanh địa chỉ → 🔒 → Vị trí → Cho phép</li>
                  <li><span className="font-medium">Safari iOS:</span> Cài đặt → Safari → Vị trí → Hỏi</li>
                  <li><span className="font-medium">Firefox:</span> Thanh địa chỉ → 🛡️ → Vị trí → Cho phép</li>
                </ul>
              </div>
            </div>
          )}
          {gpsError && !gpsBlocked && (
            <div className="flex items-center gap-2.5 rounded-xl border border-muted px-3.5 py-2.5 text-xs">
              <span className="text-base">🛰️</span>
              <p className="text-muted-foreground flex-1">Không lấy được vị trí. Kiểm tra GPS thiết bị hoặc kết nối mạng.</p>
              <button
                onClick={() => {
                  setGpsError(false)
                  if (!room?.location?.coordinates || !navigator.geolocation) return
                  const [roomLng, roomLat] = room.location.coordinates
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude: lat, longitude: lng } = pos.coords
                      setUserLocation({ lat, lng })
                      setGpsError(false)
                      const R = 6371
                      const dLat = ((roomLat - lat) * Math.PI) / 180
                      const dLng = ((roomLng - lng) * Math.PI) / 180
                      const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(roomLat*Math.PI/180)*Math.sin(dLng/2)**2
                      const km = R * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
                      setDistanceText(km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)
                    },
                    () => setGpsError(true),
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
                  )
                }}
                className="shrink-0 rounded-lg border px-2.5 py-1 font-medium hover:bg-muted transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Quick stats */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-4 divide-x">
                <StatItem label="Diện tích" value={`${room.area} m²`} />
                <StatItem label="Sức chứa" value={`${room.capacity} người`} />
                <StatItem label="Lượt xem" value={room.viewCount || 0} />
                <StatItem label="Ngày đăng" value={new Date(room.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="info" className="gap-1.5 text-xs sm:text-sm">
                <House className="h-3.5 w-3.5" />Thông tin
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm">
                <MapPin className="h-3.5 w-3.5" />Bản đồ
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5 text-xs sm:text-sm">
                <MessageCircle className="h-3.5 w-3.5" />Bình luận
              </TabsTrigger>
            </TabsList>

            {/* ─── Tab: Thông tin ─── */}
            <TabsContent value="info" className="mt-4 space-y-4">

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Mô tả</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-6 whitespace-pre-line">
                    {room.description || 'Chưa có mô tả.'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Địa chỉ</CardTitle>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fmtAddress(room.address))}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <SquareArrowOutUpRight className="h-3 w-3" />Google Maps
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">{fmtAddress(room.address) || 'Chưa có địa chỉ'}</p>
                </CardContent>
              </Card>

              {(room.amenities || []).length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Tiện ích</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(room.amenities || []).map((item) => {
                        const cfg = AMENITY_CONFIG[item]
                        const Icon = cfg?.icon
                        return (
                          <div key={item} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                            {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />}
                            <span className="font-medium truncate">{cfg?.label || item}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

            </TabsContent>

            {/* ─── Tab: Bản đồ ─── */}
            <TabsContent value="map" className="mt-4">
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div>
                    <p className="text-sm font-medium">
                      {userPos ? 'Vị trí bạn và phòng trọ' : 'Bản đồ phòng trọ'}
                    </p>
                    {!userPos && <p className="text-xs text-muted-foreground">Bật GPS để xem khoảng cách</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Phòng
                    </span>
                    {userPos && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />Bạn
                      </span>
                    )}
                  </div>
                </div>

                {roomPosition ? (
                  <MapContainer center={roomPosition} zoom={15} className="h-[380px] w-full" ref={mapRef}>
                    <TileLayer attribution='&copy; OpenStreetMap' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                    <CircleMarker center={roomPosition} radius={10} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}>
                      <Popup><strong>{room.title}</strong><br />{fmtPrice(room.price)}</Popup>
                    </CircleMarker>
                    {userPos && <>
                      <CircleMarker center={userPos} radius={9} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}>
                        <Popup>Vị trí của bạn</Popup>
                      </CircleMarker>
                      {routePositions.length > 1 && (
                        <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7, dashArray: '8 4' }} />
                      )}
                    </>}
                  </MapContainer>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-8 w-8 opacity-20" />
                    Phòng chưa có toạ độ
                  </div>
                )}

                {routeSummary && (
                  <div className="flex items-center gap-2 border-t px-4 py-3 text-sm">
                    <Navigation className="h-4 w-4 text-primary shrink-0" />
                    <span>Lộ trình: <strong>{routeSummary}</strong></span>
                  </div>
                )}

                {userPos && roomPosition && (
                  <div className="border-t px-4 py-3">
                    <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto"
                      onClick={handleDirections} disabled={routing}>
                      <Navigation className="h-3.5 w-3.5" />
                      {routing ? 'Đang tìm lộ trình...' : 'Chỉ đường đến phòng'}
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ─── Tab: Bình luận ─── */}
            <TabsContent value="reviews" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <CommentSection roomId={room?._id} landlordId={room?.landlord?._id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT: Sticky Sidebar ──────────────────────────────────── */}
        <div className="space-y-4 lg:sticky sticky-top-content lg:self-start">

          {/* Price + CTA card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-primary">{fmtPrice(room.price)}</span>
                <span className="text-sm text-muted-foreground">/tháng</span>
              </div>

              <Separator />

              {/* Primary CTAs */}
              <div className="space-y-2">
                <Button className="w-full gap-2" onClick={goBook}>
                  <Calendar className="h-4 w-4" />Đặt lịch xem phòng
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={goMsg}>
                  <MessageCircle className="h-4 w-4" />Nhắn tin chủ trọ
                </Button>
              </div>

              <Separator />

              {/* Secondary actions — 2×2 grid */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tùy chọn</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Favorite */}
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <FavoriteButton roomId={room._id} initialFavorited={isFavorited} size="icon" />
                    <span className="text-xs font-medium">{isFavorited ? 'Đã lưu' : 'Yêu thích'}</span>
                  </div>
                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <Share2 className="h-4 w-4 text-muted-foreground shrink-0" />Chia sẻ
                  </button>
                  {/* Directions */}
                  <button
                    onClick={handleDirections}
                    disabled={routing}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                    {routing ? 'Đang tìm...' : 'Chỉ đường'}
                  </button>
                  {/* Compare */}
                  <CompareButton room={room} />
                </div>
                {/* Report — full width, subtle */}
                <div className="pt-1">
                  <ReportButton roomId={room._id} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landlord response stats */}
          {room.landlord && (room.landlord.responseRate != null || room.landlord.avgResponseTime != null) && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Thống kê phản hồi
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {room.landlord.responseRate != null && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />Tỷ lệ trả lời
                      </span>
                      <span className="font-bold text-emerald-600">{room.landlord.responseRate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${room.landlord.responseRate}%` }} />
                    </div>
                  </div>
                )}
                {room.landlord.avgResponseTime != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Thời gian TB: <strong className="text-foreground">
                      {room.landlord.avgResponseTime < 60
                        ? `${room.landlord.avgResponseTime} phút`
                        : room.landlord.avgResponseTime < 1440
                          ? `${Math.round(room.landlord.avgResponseTime / 60)} giờ`
                          : `${Math.round(room.landlord.avgResponseTime / 1440)} ngày`}
                    </strong></span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick inquiry */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                Nhắn nhanh chủ trọ
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {['Phòng còn trống không ạ?', 'Có video không ạ?', 'Giờ giấc tự do không?', 'Điện nước tính sao ạ?'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => { if (!user) { navigate('/login'); return }; setInquiryText(chip) }}
                    className="rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium hover:border-primary hover:text-primary transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!user) { navigate('/login'); return }
                  if (!inquiryText.trim() || !room?.landlord?._id) return
                  try {
                    setInquirySending(true)
                    const res = await createConversationApi(room.landlord._id, room._id)
                    const conv = res.data?.data?.conversation
                    if (!conv) throw new Error()
                    if (!socket.connected) socket.connect()
                    socket.emit('join_conversation', conv._id)
                    socket.emit('send_message', { conversationId: conv._id, senderId: user._id, content: inquiryText.trim(), attachments: [] })
                    toast.success('Tin nhắn đã được gửi!')
                    setInquiryText('')
                    navigate('/messages')
                  } catch { toast.error('Gửi tin thất bại') }
                  finally { setInquirySending(false) }
                }}
              >
                <input
                  value={inquiryText}
                  onChange={(e) => { if (!user) { navigate('/login'); return }; setInquiryText(e.target.value) }}
                  onFocus={() => { if (!user) navigate('/login') }}
                  placeholder={user ? 'Nhập tin nhắn...' : 'Đăng nhập để nhắn tin'}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
                <Button type="submit" size="sm" className="shrink-0 gap-1" disabled={!inquiryText.trim() || inquirySending}>
                  <Send className="h-3.5 w-3.5" />
                  {inquirySending ? '...' : 'Gửi'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Landlord card */}
          {room.landlord && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Link
                    to={`/landlord/${room.landlord.username || room.landlord._id}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted border text-sm font-bold hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    {(room.landlord.name || 'C')[0].toUpperCase()}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">Chủ trọ</p>
                    <Link
                      to={`/landlord/${room.landlord.username || room.landlord._id}`}
                      className="text-sm font-semibold truncate block hover:text-primary transition-colors"
                    >
                      {room.landlord.name || 'Không rõ'}
                    </Link>
                    {room.landlord.phone && <p className="text-[11px] text-muted-foreground">{room.landlord.phone}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0" onClick={goMsg}>
                    <MessageCircle className="h-3.5 w-3.5" />Chat
                  </Button>
                </div>
                <Link
                  to={`/landlord/${room.landlord.username || room.landlord._id}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  Xem tất cả phòng của chủ trọ →
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Route summary */}
          {routeSummary && (
            <Card>
              <CardContent className="flex items-center gap-2 p-3">
                <Navigation className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium">{routeSummary}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── SIMILAR ROOMS ──────────────────────────────────────────────── */}
      {room?._id && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
          <SimilarRooms
            roomId={room._id}
            limit={6}
            targetLocation={room.location?.coordinates}
          />
        </div>
      )}

      {/* ── OVERLAYS ──────────────────────────────────────────────────── */}
      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} roomId={room?._id} roomTitle={room?.title} />
      {panoramaSrc && <PanoramaViewer src={panoramaSrc} onClose={() => setPanoramaSrc(null)} />}
      {lightboxIdx !== null && imgs.length > 0 && (
        <ImageLightbox images={imgs} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  )
}
