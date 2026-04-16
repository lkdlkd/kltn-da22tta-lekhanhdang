import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import {
  Navigation, Share2, ArrowLeft, MapPin, Wifi, Wind, Flame,
  Star, Package, WashingMachine, ChefHat, Car, ShieldCheck,
  Camera, Trees, Sofa, Bath, Zap, ArrowUp, MessageCircle,
  Calendar, Eye, Clock, CheckCircle2, XCircle,
  SquareArrowOutUpRight, ChevronLeft, ChevronRight,
  TrendingUp, Send, Video, Map, MessageSquare, Info,
  Home, PhoneCall, ExternalLink, ImageIcon,
} from 'lucide-react'
import { getRoomBySlugApi, getRoomDistanceApi } from '@/services/roomService'
import { createInteractionApi } from '@/services/interactionService'
import { getFavoriteIdsApi } from '@/services/favoriteService'
import { createConversationApi } from '@/services/chatService'
import { getSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/components/rooms/FavoriteButton'
import { CommentSection } from '@/components/rooms/CommentSection'
import { BookingDialog } from '@/components/rooms/BookingDialog'
import { ReportButton } from '@/components/rooms/ReportButton'
import { CompareButton } from '@/components/compare/CompareBar'
import { PanoramaViewer } from '@/components/rooms/PanoramaViewer'
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
const fmtResponseTime = (mins) => {
  if (mins == null) return null
  if (mins < 60) return `${mins} phút`
  if (mins < 1440) return `${Math.round(mins / 60)} giờ`
  return `${Math.round(mins / 1440)} ngày`
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 space-y-5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="w-full rounded-2xl" style={{ height: 380 }} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-4 gap-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

// ── Tab Button ─────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
      {count != null && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', active ? 'bg-primary/10' : 'bg-muted')}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function RoomDetailPage() {
  const { slug } = useParams()
  const user = useSelector((s) => s.auth?.user)
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [panoramaSrc, setPanoramaSrc] = useState(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('info')
  const [userLocation, setUserLocation] = useState(null)
  const [distanceText, setDistanceText] = useState('')
  const [routePositions, setRoutePositions] = useState([])
  const [routeSummary, setRouteSummary] = useState('')
  const [routing, setRouting] = useState(false)
  const [inquiryText, setInquiryText] = useState('')
  const [inquirySending, setInquirySending] = useState(false)
  const [mediaMode, setMediaMode] = useState('photo') // photo | video | pano
  const mapRef = useRef(null)
  const socket = getSocket()

  useEffect(() => {
    setLoading(true); setErrorMsg('')
    getRoomBySlugApi(slug)
      .then((r) => setRoom(r.data?.data?.room || null))
      .catch((err) => {
        const msg = err?.response?.data?.message || ''
        if (err?.response?.status === 404) setErrorMsg(msg || 'Không tìm thấy phòng')
        else toast.error('Không thể tải chi tiết phòng')
      })
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!room) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserLocation(loc)
      try {
        const r = await getRoomDistanceApi(room._id, loc.lat, loc.lng)
        setDistanceText(r.data?.data?.distance_text || '')
      } catch { setDistanceText('') }
    }, () => {})
  }, [room])

  useEffect(() => { setImgIdx(0) }, [room?.slug])

  useEffect(() => {
    if (!room?._id || !user) return
    createInteractionApi(room._id, 'view').catch(() => {})
    getFavoriteIdsApi()
      .then((r) => setIsFavorited((r.data?.data?.roomIds || []).includes(String(room._id))))
      .catch(() => {})
  }, [room?._id, user])

  const roomPosition = useMemo(() => {
    if (!room?.location?.coordinates) return null
    const [lng, lat] = room.location.coordinates
    return [lat, lng]
  }, [room])

  const imgs = room?.images || []
  const imgs360 = room?.images360 || []
  const videos = room?.videos || []
  const selectedImg = imgs[imgIdx] || ''

  const goImg = (dir) => setImgIdx((i) => (i + dir + imgs.length) % imgs.length)
  const userPos = userLocation ? [userLocation.lat, userLocation.lng] : null
  const goMsg = () => { if (!user) { navigate('/login'); return }; navigate(`/messages?to=${room.landlord?._id}&room=${room._id}`) }
  const goBook = () => { if (!user) { navigate('/login'); return }; setBookingOpen(true) }

  const handleShare = async () => {
    const url = `${window.location.origin}/rooms/${room.slug}`
    try {
      if (navigator.share) { await navigator.share({ title: room.title, url }); return }
      await navigator.clipboard.writeText(url)
      toast.success('Đã sao chép link!')
    } catch { toast.error('Không thể sao chép') }
  }

  const handleDirections = async () => {
    if (!userLocation) { toast.error('Bật định vị để chỉ đường'); return }
    if (!roomPosition) return
    try {
      setRouting(true); setRouteSummary('')
      const { lat: oLat, lng: oLng } = userLocation
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
      const p = [[userLocation.lat, userLocation.lng], roomPosition]
      setRoutePositions(p); setRouteSummary('Đường thẳng ước lượng')
      toast.error('Không lấy được lộ trình')
    } finally { setRouting(false) }
  }

  if (loading) return <PageSkeleton />
  if (errorMsg || !room) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-4">
      <span className="text-5xl">{errorMsg?.includes('ẩn') || errorMsg?.includes('vi phạm') ? '🚫' : '🏠'}</span>
      <p className="font-semibold">{errorMsg || 'Không tìm thấy phòng'}</p>
      <Button size="sm" asChild><Link to="/search">Tìm phòng khác</Link></Button>
    </div>
  )

  const hasVideo = videos.length > 0
  const hasPano  = imgs360.length > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 space-y-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/search" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Tìm kiếm
        </Link>
        <span>/</span>
        <span className="truncate text-foreground font-medium max-w-[240px]">{room.title}</span>
      </nav>

      {/* ━━━━━ GALLERY HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="space-y-2">
        {/* Media mode pills */}
        {(hasVideo || hasPano) && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setMediaMode('photo')}
              className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                mediaMode === 'photo' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}
            >
              <ImageIcon className="h-3 w-3" />Ảnh ({imgs.length})
            </button>
            {hasVideo && (
              <button
                onClick={() => setMediaMode('video')}
                className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  mediaMode === 'video' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}
              >
                <Video className="h-3 w-3" />Video ({videos.length})
              </button>
            )}
            {hasPano && (
              <button
                onClick={() => { setMediaMode('pano'); setPanoramaSrc(imgs360[0]) }}
                className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  mediaMode === 'pano' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted hover:bg-muted/80 text-muted-foreground')}
              >
                🔭 360° ({imgs360.length})
              </button>
            )}
          </div>
        )}

        {/* Photo gallery */}
        {mediaMode === 'photo' && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-muted group cursor-zoom-in">
              {selectedImg ? (
                <img
                  src={selectedImg}
                  alt={room.title}
                  className="h-[280px] w-full object-cover sm:h-[380px] lg:h-[420px] transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-[280px] sm:h-[380px] w-full items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                  <ImageIcon className="h-10 w-10 opacity-30" />
                  <span>Chưa có ảnh</span>
                </div>
              )}

              {/* Status badge */}
              <div className="absolute left-3 top-3 flex gap-2 flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow backdrop-blur-sm',
                  room.isAvailable ? 'bg-emerald-500/95 text-white' : 'bg-zinc-800/90 text-white')}>
                  {room.isAvailable
                    ? <><CheckCircle2 className="h-3.5 w-3.5" />Còn phòng</>
                    : <><XCircle className="h-3.5 w-3.5" />Đã thuê</>}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-xs text-white">
                  {ROOM_TYPE_LABELS[room.roomType] || 'Phòng trọ'}
                </span>
              </div>

              {/* Nav arrows */}
              {imgs.length > 1 && (
                <>
                  <button onClick={() => goImg(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all hover:scale-105 shadow">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => goImg(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all hover:scale-105 shadow">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm font-medium">
                    {imgIdx + 1} / {imgs.length}
                  </div>
                </>
              )}
              {/* 360 shortcut if no video tab */}
              {hasPano && !hasVideo && (
                <button onClick={() => { setPanoramaSrc(imgs360[0]) }}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white shadow backdrop-blur-sm hover:bg-primary transition">
                  🔭 Xem 360°
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {imgs.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={cn('shrink-0 overflow-hidden rounded-xl transition-all duration-200',
                      i === imgIdx ? 'ring-2 ring-primary ring-offset-2 scale-[0.97]' : 'opacity-60 hover:opacity-90 hover:scale-[0.98]')}>
                    <img src={img} alt="" className="h-16 w-24 object-cover" />
                  </button>
                ))}
                {imgs360.map((img, i) => (
                  <button key={`360-${i}`} onClick={() => setPanoramaSrc(img)}
                    className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-primary/50 hover:ring-primary transition-all opacity-80 hover:opacity-100">
                    <img src={img} alt="" className="h-16 w-24 object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-bold text-white">360°</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Video viewer */}
        {mediaMode === 'video' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {videos.map((url, i) => (
                <video key={i} src={url} controls
                  className="w-full rounded-2xl border bg-muted object-cover max-h-[320px] shadow-sm" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ━━━━━ MAIN CONTENT + SIDEBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

        {/* ── LEFT ─────────────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Title + meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {ROOM_TYPE_LABELS[room.roomType] || 'Phòng trọ'}
              </Badge>
              {distanceText && (
                <Badge variant="outline" className="text-xs gap-1 font-normal">
                  <MapPin className="h-2.5 w-2.5" />{distanceText} từ đây
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{room.title}</h1>
            {fmtAddress(room.address) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fmtAddress(room.address))}`}
                target="_blank" rel="noreferrer"
                className="flex items-start gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group w-fit"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span className="group-hover:underline underline-offset-2">{fmtAddress(room.address)}</span>
                <ExternalLink className="h-3 w-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            )}
          </div>

          {/* 4-stat row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Diện tích',   val: `${room.area || '—'} m²`,    icon: Home },
              { label: 'Sức chứa',   val: `${room.capacity || '—'} người`, icon: Eye },
              { label: 'Lượt xem',   val: room.viewCount || 0,           icon: Eye },
              { label: 'Ngày đăng',  val: new Date(room.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'2-digit' }), icon: Calendar },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold truncate">{val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── TABS ──────────────────────────────────────────────────── */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto scrollbar-none border-b bg-muted/20">
              <TabBtn active={activeTab==='info'}    onClick={() => setActiveTab('info')}    icon={Info}          label="Thông tin" />
              {hasVideo && <TabBtn active={activeTab==='video'} onClick={() => setActiveTab('video')} icon={Video}      label="Video" count={videos.length} />}
              <TabBtn active={activeTab==='map'}     onClick={() => setActiveTab('map')}     icon={Map}           label="Bản đồ" />
              <TabBtn active={activeTab==='reviews'} onClick={() => setActiveTab('reviews')} icon={MessageSquare} label="Bình luận" />
            </div>

            {/* Tab: Thông tin */}
            {activeTab === 'info' && (
              <div className="p-4 space-y-4">
                {/* Description */}
                <div>
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="h-3.5 w-0.5 rounded-full bg-primary inline-block" />
                    Mô tả phòng
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {room.description || 'Chưa có mô tả.'}
                  </p>
                </div>

                {/* Amenities */}
                {(room.amenities || []).length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                      <span className="h-3.5 w-0.5 rounded-full bg-primary inline-block" />
                      Tiện ích ({room.amenities.length})
                    </h2>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(room.amenities || []).map((item) => {
                        const cfg = AMENITY_CONFIG[item]
                        const Icon = cfg?.icon
                        return (
                          <div key={item} className="flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3 py-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            <span className="text-xs font-medium truncate">{cfg?.label || item}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Video */}
            {activeTab === 'video' && hasVideo && (
              <div className="p-4 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <span className="h-3.5 w-0.5 rounded-full bg-primary inline-block" />
                  Video phòng trọ
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {videos.map((url, i) => (
                    <video key={i} src={url} controls
                      className="w-full rounded-xl border bg-muted max-h-[260px] shadow-sm" />
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Bản đồ */}
            {activeTab === 'map' && (
              <div>
                {/* Map toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />Phòng
                    </span>
                    {userPos && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" />Bạn
                      </span>
                    )}
                    {distanceText && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Navigation className="h-2.5 w-2.5" />{distanceText}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline"
                      className="h-7 gap-1.5 text-xs rounded-full"
                      onClick={handleDirections} disabled={routing || !roomPosition}>
                      <Navigation className="h-3 w-3" />
                      {routing ? 'Đang tìm...' : 'Chỉ đường'}
                    </Button>
                    {fmtAddress(room.address) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fmtAddress(room.address))}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-background"
                      >
                        <SquareArrowOutUpRight className="h-3 w-3" />Maps
                      </a>
                    )}
                  </div>
                </div>

                {roomPosition ? (
                  <MapContainer center={roomPosition} zoom={15} className="h-[360px] w-full" ref={mapRef}>
                    <TileLayer attribution='&copy; OpenStreetMap' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                    <CircleMarker center={roomPosition} radius={11}
                      pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}>
                      <Popup><strong>{room.title}</strong><br />{fmtPrice(room.price)}</Popup>
                    </CircleMarker>
                    {userPos && <>
                      <CircleMarker center={userPos} radius={9}
                        pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}>
                        <Popup>Vị trí của bạn</Popup>
                      </CircleMarker>
                      {routePositions.length > 1 && (
                        <Polyline positions={routePositions}
                          pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75, dashArray: '8 4' }} />
                      )}
                    </>}
                  </MapContainer>
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground flex-col gap-2">
                    <MapPin className="h-8 w-8 opacity-30" />
                    Phòng chưa có toạ độ
                  </div>
                )}

                {routeSummary && (
                  <div className="flex items-center gap-2 border-t px-4 py-2.5 text-xs bg-blue-50 dark:bg-blue-950/30">
                    <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">
                      Lộ trình: <strong>{routeSummary}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Bình luận */}
            {activeTab === 'reviews' && (
              <div className="p-4">
                <CommentSection roomId={room?._id} landlordId={room?.landlord?._id} />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-[calc(var(--navbar-h,64px)+16px)] lg:self-start">

          {/* ── Card: Giá thuê ── */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Price header */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-4 border-b">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Giá thuê / tháng</p>
                  <span className="text-3xl font-extrabold text-primary leading-none">{fmtPrice(room.price)}</span>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm',
                  room.isAvailable
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-500 text-white'
                )}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  {room.isAvailable ? 'Còn phòng' : 'Đã thuê'}
                </span>
              </div>
              {distanceText && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" />{distanceText} từ vị trí của bạn
                </p>
              )}
            </div>

            {/* CTAs */}
            <div className="p-4 space-y-2.5">
              <Button className="w-full h-11 gap-2 font-semibold text-sm rounded-xl" onClick={goBook}>
                <Calendar className="h-4 w-4" />Đặt lịch xem phòng
              </Button>
              <Button variant="outline" className="w-full h-11 gap-2 text-sm rounded-xl" onClick={goMsg}>
                <MessageCircle className="h-4 w-4" />Nhắn tin chủ trọ
              </Button>
            </div>

            {/* Secondary action strip */}
            <div className="flex items-center justify-around border-t px-3 py-2.5 bg-muted/20">
              <FavoriteButton roomId={room._id} initialFavorited={isFavorited} size="sm" />
              <div className="h-4 w-px bg-border" />
              <button onClick={handleShare}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-2">
                <Share2 className="h-3.5 w-3.5" />Chia sẻ
              </button>
              <div className="h-4 w-px bg-border" />
              <CompareButton room={room} size="sm" />
              <div className="h-4 w-px bg-border" />
              <ReportButton roomId={room._id} size="sm" />
            </div>
          </div>

          {/* ── Card: Chủ trọ ── */}
          {room.landlord && (
            <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chủ trọ</h3>

              {/* Landlord identity */}
              <div className="flex items-center gap-3">
                <Link to={`/landlord/${room.landlord.username || room.landlord._id}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-lg shadow hover:shadow-md transition-all hover:scale-105">
                  {(room.landlord.name || 'C')[0].toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/landlord/${room.landlord.username || room.landlord._id}`}
                    className="text-sm font-bold block hover:text-primary transition-colors truncate">
                    {room.landlord.name}
                  </Link>
                  {room.landlord.username && (
                    <p className="text-[11px] text-muted-foreground">@{room.landlord.username}</p>
                  )}
                </div>
                {room.landlord.phone && (
                  <a href={`tel:${room.landlord.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border hover:border-primary hover:bg-primary/5 transition-all"
                    title={room.landlord.phone}>
                    <PhoneCall className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
              </div>

              {/* Response stats */}
              {(room.landlord.responseRate != null || room.landlord.avgResponseTime != null) && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-3 py-3 space-y-2.5">
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Độ phản hồi
                  </p>
                  {room.landlord.responseRate != null && (
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-muted-foreground">Tỷ lệ trả lời</span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{room.landlord.responseRate}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                            style={{ width: `${room.landlord.responseRate}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {room.landlord.avgResponseTime != null && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Phản hồi trong: <strong className="text-foreground">{fmtResponseTime(room.landlord.avgResponseTime)}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* View profile link */}
              <Link to={`/landlord/${room.landlord.username || room.landlord._id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                Xem tất cả phòng →
              </Link>
            </div>
          )}

          {/* ── Card: Nhắn nhanh ── */}
          <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-sm">
                ⚡
              </div>
              <h3 className="text-sm font-semibold">Nhắn nhanh chủ trọ</h3>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Phòng còn trống không ạ?',
                'Có video xem phòng không?',
                'Giờ giấc có tự do không?',
                'Giá có bao gồm điện nước?',
              ].map((chip) => (
                <button key={chip} type="button"
                  onClick={() => { if (!user) { navigate('/login'); return }; setInquiryText(chip) }}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] leading-tight transition-all',
                    inquiryText === chip
                      ? 'border-primary bg-primary/10 text-primary font-medium shadow-sm'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}>
                  {chip}
                </button>
              ))}
            </div>

            {/* Input row */}
            <form className="flex gap-2"
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
                  socket.emit('send_message', {
                    conversationId: conv._id, senderId: user._id,
                    content: inquiryText.trim(), attachments: [],
                  })
                  toast.success('Đã gửi tin nhắn!')
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
                placeholder={user ? 'Nhập câu hỏi của bạn...' : 'Đăng nhập để nhắn tin'}
                className="flex-1 min-w-0 rounded-xl border bg-muted/30 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
              />
              <Button type="submit" size="sm"
                className="rounded-xl px-3 h-auto shrink-0 aspect-square"
                disabled={!inquiryText.trim() || inquirySending}>
                {inquirySending ? '...' : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} roomId={room?._id} roomTitle={room?.title} />
      {panoramaSrc && <PanoramaViewer src={panoramaSrc} onClose={() => { setPanoramaSrc(null); setMediaMode('photo') }} />}
    </div>
  )
}
