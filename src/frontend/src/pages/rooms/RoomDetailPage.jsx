import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import {
  Navigation, Share2, Users, Expand, House, ArrowLeft,
  MapPin, Wifi, Wind, Flame, Star, Package, WashingMachine,
  ChefHat, Car, ShieldCheck, Camera, Trees, Sofa, Bath, Zap,
  ArrowUp, MessageCircle, Calendar, Eye, Clock,
  CheckCircle2, XCircle, SquareArrowOutUpRight, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { getRoomBySlugApi, getRoomDistanceApi } from '@/services/roomService'
import { createInteractionApi } from '@/services/interactionService'
import { getFavoriteIdsApi } from '@/services/favoriteService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  // legacy object fallback
  return a.fullAddress || [a.street, a.ward, a.district, a.city].filter(Boolean).join(', ')
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="w-full rounded-xl" style={{ height: 320 }} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">{[0,1,2,3].map(i=><Skeleton key={i} className="h-8 flex-1 rounded-full"/>)}</div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
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
  const [imgIdx, setImgIdx] = useState(0)
  const [activeTab, setActiveTab] = useState('info')
  const [userLocation, setUserLocation] = useState(null)
  const [distanceText, setDistanceText] = useState('')
  const [routePositions, setRoutePositions] = useState([])
  const [routeSummary, setRouteSummary] = useState('')
  const [routing, setRouting] = useState(false)
  const mapRef = useRef(null)

  const [errorMsg, setErrorMsg] = useState('')

  // fetching
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
    if (!room) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        try {
          const r = await getRoomDistanceApi(room._id, loc.lat, loc.lng)
          setDistanceText(r.data?.data?.distance_text || '')
        } catch { setDistanceText('') }
      },
      () => {}
    )
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
      setRoutePositions(p)
      setRouteSummary('Đường thẳng ước lượng')
      toast.error('Không lấy được lộ trình')
    } finally { setRouting(false) }
  }

  const goImg = (dir) => setImgIdx((i) => (i + dir + imgs.length) % imgs.length)
  const userPos = userLocation ? [userLocation.lat, userLocation.lng] : null
  const goMsg = () => { if (!user) { navigate('/login'); return }; navigate(`/messages?to=${room.landlord?._id}&room=${room._id}`) }
  const goBook = () => { if (!user) { navigate('/login'); return }; setBookingOpen(true) }

  if (loading) return <PageSkeleton />
  if (errorMsg || !room) return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-4">
      <span className="text-5xl">{errorMsg?.includes('ẩn') || errorMsg?.includes('vi phạm') ? '🚫' : '🏠'}</span>
      <p className="font-semibold">{errorMsg || 'Không tìm thấy phòng'}</p>
      {(errorMsg?.includes('ẩn') || errorMsg?.includes('công khai')) && (
        <p className="text-sm text-muted-foreground max-w-xs">
          Phòng này đã bị ẩn hoặc xóa bởi quản trị viên do vi phạm nội quy.
        </p>
      )}
      <Button size="sm" asChild><Link to="/search">Tìm phòng khác</Link></Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/search" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />Tìm kiếm
        </Link>
        <span>/</span>
        <span className="truncate text-foreground font-medium max-w-[240px]">{room.title}</span>
      </div>

      {/* ── IMAGE GALLERY ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-muted group">
        {selectedImg ? (
          <img
            src={selectedImg}
            alt={room.title}
            className="h-[260px] w-full object-cover sm:h-[340px] transition-transform duration-300 group-hover:scale-[1.01]"
          />
        ) : (
          <div className="flex h-[260px] w-full items-center justify-center text-muted-foreground text-sm sm:h-[340px]">
            Chưa có ảnh
          </div>
        )}

        {/* overlay top-left badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm shadow',
            room.isAvailable ? 'bg-emerald-500/90 text-white' : 'bg-zinc-700/80 text-white')}>
            {room.isAvailable
              ? <><CheckCircle2 className="h-3 w-3" />Còn trống</>
              : <><XCircle className="h-3 w-3" />Đã thuê</>}
          </span>
          {imgs360.length > 0 && (
            <button
              type="button"
              onClick={() => setPanoramaSrc(imgs360[0])}
              className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow backdrop-blur-sm hover:bg-primary transition-colors"
            >
              🔭 360°
            </button>
          )}
        </div>

        {/* nav arrows */}
        {imgs.length > 1 && (
          <>
            <button onClick={() => goImg(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => goImg(1)} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              {imgIdx + 1}/{imgs.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {imgs.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {imgs.map((img, i) => (
            <button key={i} onClick={() => setImgIdx(i)}
              className={cn('shrink-0 overflow-hidden rounded-lg transition-all',
                i === imgIdx ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60 hover:opacity-100')}>
              <img src={img} alt="" className="h-14 w-20 object-cover" />
            </button>
          ))}
          {imgs360.map((img, i) => (
            <button key={`360-${i}`} onClick={() => setPanoramaSrc(img)}
              className="relative shrink-0 overflow-hidden rounded-lg ring-1 ring-primary/50 hover:ring-primary transition-all">
              <img src={img} alt="" className="h-14 w-20 object-cover opacity-80" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] font-bold text-white">360°</span>
            </button>
          ))}
        </div>
      )}

      {/* Video section */}
      {(room?.videos?.length > 0) && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            🎬 Video phòng trọ
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {room.videos.map((url, i) => (
              <video
                key={i}
                src={url}
                controls
                className="w-full rounded-xl border bg-muted object-cover max-h-[260px]"
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── LEFT: Info + Tabs ───────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Title row */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge variant="secondary" className="text-xs">{ROOM_TYPE_LABELS[room.roomType] || 'Phòng trọ'}</Badge>
              {distanceText && (
                <Badge variant="outline" className="text-xs gap-1"><MapPin className="h-2.5 w-2.5" />{distanceText}</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{room.title}</h1>
            {fmtAddress(room.address) && (
              <p className="flex items-start gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                {fmtAddress(room.address)}
              </p>
            )}
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 divide-x rounded-xl border bg-muted/30 text-center text-sm overflow-hidden">
            {[
              { label: 'Diện tích', val: `${room.area} m²` },
              { label: 'Sức chứa', val: `${room.capacity} ng` },
              { label: 'Lượt xem', val: room.viewCount || 0 },
              { label: 'Ngày đăng', val: new Date(room.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' }) },
            ].map(({ label, val }) => (
              <div key={label} className="py-3">
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="font-semibold mt-0.5 text-xs sm:text-sm">{val}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="info" className="text-xs gap-1"><House className="h-3 w-3" />Thông tin</TabsTrigger>
              <TabsTrigger value="map" className="text-xs gap-1"><Navigation className="h-3 w-3" />Bản đồ</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs gap-1"><MessageCircle className="h-3 w-3" />Bình luận</TabsTrigger>
            </TabsList>

            {/* Tab: Thông tin */}
            <TabsContent value="info" className="mt-3 space-y-3">
              {/* Description */}
              <div className="rounded-xl border bg-card p-4">
                <h2 className="text-sm font-semibold mb-2">Mô tả</h2>
                <p className="text-sm text-muted-foreground leading-6 whitespace-pre-line">
                  {room.description || 'Chưa có mô tả.'}
                </p>
              </div>

              {/* Amenities */}
              {(room.amenities || []).length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <h2 className="text-sm font-semibold mb-3">Tiện ích</h2>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {(room.amenities || []).map((item) => {
                      const cfg = AMENITY_CONFIG[item]
                      const Icon = cfg?.icon
                      return (
                        <div key={item} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2 text-xs">
                          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />}
                          <span className="font-medium truncate">{cfg?.label || item}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Address */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold">Địa chỉ</h2>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fmtAddress(room.address))}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <SquareArrowOutUpRight className="h-3 w-3" />Google Maps
                  </a>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {fmtAddress(room.address) || 'Chưa có địa chỉ'}
                </p>
              </div>
            </TabsContent>

            {/* Tab: Bản đồ */}
            <TabsContent value="map" className="mt-3">
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                  <p className="text-xs font-medium">
                    {userPos ? 'Vị trí bạn và phòng trọ' : 'Bật GPS để xem khoảng cách'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Phòng</span>
                    {userPos && <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />Bạn</span>}
                  </div>
                </div>
                {roomPosition ? (
                  <MapContainer center={roomPosition} zoom={15} className="h-[350px] w-full" ref={mapRef}>
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
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    Phòng chưa có toạ độ
                  </div>
                )}
                {routeSummary && (
                  <div className="flex items-center gap-2 border-t px-4 py-2 text-xs bg-blue-50 dark:bg-blue-950/30">
                    <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">Lộ trình: <strong>{routeSummary}</strong></span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Bình luận */}
            <TabsContent value="reviews" className="mt-3">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <CommentSection roomId={room?._id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT: Sticky Sidebar ──────────────────────────────────── */}
        <div className="space-y-3 lg:sticky sticky-top-content lg:self-start">

          {/* Price card */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div>
              <span className="text-2xl font-extrabold text-primary">{fmtPrice(room.price)}</span>
              <span className="text-sm text-muted-foreground ml-1">/tháng</span>
            </div>

            {/* CTA buttons */}
            <div className="space-y-2">
              <Button className="w-full gap-2" onClick={goBook}>
                <Calendar className="h-4 w-4" />Đặt lịch xem phòng
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={goMsg}>
                <MessageCircle className="h-4 w-4" />Nhắn tin chủ trọ
              </Button>
            </div>

            <Separator />

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-2">
              <FavoriteButton roomId={room._id} initialFavorited={isFavorited} size="sm" />
              <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs rounded-full" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" />Chia sẻ
              </Button>
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 h-8 text-xs rounded-full"
                onClick={handleDirections} disabled={routing}
              >
                <Navigation className="h-3.5 w-3.5" />
                {routing ? 'Đang tìm...' : 'Chỉ đường'}
              </Button>
              <CompareButton room={room} />
              <ReportButton roomId={room._id} />
            </div>
          </div>

          {/* Landlord card */}
          {room.landlord && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Link to={`/landlord/${room.landlord.username || room.landlord._id}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm hover:ring-2 hover:ring-primary/40 transition-all">
                  {(room.landlord.name || 'C')[0].toUpperCase()}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Chủ trọ</p>
                  <Link to={`/landlord/${room.landlord.username || room.landlord._id}`}
                    className="text-sm font-semibold truncate block hover:text-primary transition-colors">
                    {room.landlord.name || 'Không rõ'}
                  </Link>
                  {room.landlord.phone && <p className="text-[11px] text-muted-foreground">{room.landlord.phone}</p>}
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs rounded-full shrink-0" onClick={goMsg}>
                  <MessageCircle className="h-3 w-3" />Chat
                </Button>
              </div>
              <Link to={`/landlord/${room.landlord.username || room.landlord._id}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                Xem tất cả phòng của chủ trọ →
              </Link>
            </div>
          )}


          {/* Route summary */}
          {routeSummary && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs">
              <Navigation className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">{routeSummary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} roomId={room?._id} roomTitle={room?.title} />
      {panoramaSrc && <PanoramaViewer src={panoramaSrc} onClose={() => setPanoramaSrc(null)} />}
    </div>
  )
}
