import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
import {
  Navigation, Share2, Users, Expand, House, ArrowLeft,
  Heart, Flag, GitCompare, MapPin, Wifi, Wind, Flame,
  Package, WashingMachine, ChefHat, Car, ShieldCheck,
  Camera, Trees, Sofa, Bath, Zap, ArrowUp, MessageCircle,
} from 'lucide-react'
import { getRoomBySlugApi, getRoomDistanceApi } from '@/services/roomService'
import { createInteractionApi } from '@/services/interactionService'
import { getFavoriteIdsApi } from '@/services/favoriteService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FavoriteButton } from '@/components/rooms/FavoriteButton'
import { ReviewSection } from '@/components/rooms/ReviewSection'
import { BookingDialog } from '@/components/rooms/BookingDialog'
import { ReportButton } from '@/components/rooms/ReportButton'
import { CompareButton } from '@/components/compare/CompareBar'

const roomTypeLabels = {
  'phòng_trọ': 'Phòng trọ',
  'chung_cư_mini': 'Chung cư mini',
  'nhà_nguyên_căn': 'Nhà nguyên căn',
  'ký_túc_xá': 'Ký túc xá',
}

const amenityConfig = {
  wifi:               { label: 'Wifi',            icon: Wifi },
  'điều_hòa':         { label: 'Điều hòa',        icon: Wind },
  'nóng_lạnh':        { label: 'Nóng lạnh',       icon: Flame },
  'tủ_lạnh':          { label: 'Tủ lạnh',         icon: Package },
  'máy_giặt':         { label: 'Máy giặt',        icon: WashingMachine },
  bếp:                { label: 'Bếp',             icon: ChefHat },
  'chỗ_để_xe':        { label: 'Chỗ để xe',       icon: Car },
  'an_ninh':          { label: 'An ninh',         icon: ShieldCheck },
  camera:             { label: 'Camera',          icon: Camera },
  'thang_máy':        { label: 'Thang máy',       icon: ArrowUp },
  'ban_công':         { label: 'Ban công',        icon: Trees },
  'nội_thất':         { label: 'Nội thất',        icon: Sofa },
  'vệ_sinh_riêng':    { label: 'Vệ sinh riêng',  icon: Bath },
  'điện_nước_riêng':  { label: 'Điện nước riêng', icon: Zap },
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatAddress(address) {
  if (!address) return 'Chưa có địa chỉ'
  if (typeof address === 'string') return address
  return address.fullAddress || [address.street, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

export default function RoomDetailPage() {
  const { slug } = useParams()
  const user = useSelector((state) => state.auth?.user)
  const navigate = useNavigate()
  const [isFavorited, setIsFavorited] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [distanceText, setDistanceText] = useState('')
  const [routePositions, setRoutePositions] = useState([])
  const [routeSummary, setRouteSummary] = useState('')
  const [routing, setRouting] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const mapRef = useRef(null)

  // ── Fetch phòng theo slug ──────────────────────────────────────────
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const res = await getRoomBySlugApi(slug)
        setRoom(res.data?.data?.room || null)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể tải chi tiết phòng')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [slug])

  // ── Lấy vị trí user & tính khoảng cách ───────────────────────────
  useEffect(() => {
    if (!room) return
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(location)
        try {
          const res = await getRoomDistanceApi(room._id, location.lat, location.lng)
          setDistanceText(res.data?.data?.distance_text || '')
        } catch {
          setDistanceText('')
        }
      },
      () => setUserLocation(null)
    )
  }, [room])

  // ── Reset ảnh khi đổi phòng ───────────────────────────────────────
  useEffect(() => {
    setSelectedImageIndex(0)
  }, [room?.slug])

  // ── Ghi nhận interaction view + load favorite status ─────────────
  useEffect(() => {
    if (!room?._id) return
    if (user) {
      createInteractionApi(room._id, 'view').catch(() => {})
      getFavoriteIdsApi()
        .then((res) => {
          const ids = res.data?.data?.roomIds || []
          setIsFavorited(ids.includes(String(room._id)))
        })
        .catch(() => {})
    }
  }, [room?._id, user])


  // ── Computed ──────────────────────────────────────────────────────
  const roomPosition = useMemo(() => {
    if (!room?.location?.coordinates) return null
    const [lng, lat] = room.location.coordinates
    return [lat, lng]
  }, [room])

  const roomImages = room?.images || []
  const selectedImage = roomImages[selectedImageIndex] || roomImages[0] || ''
  const hasMultipleImages = roomImages.length > 1

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Card className="overflow-hidden">
          <div className="grid lg:grid-cols-4">
            <Skeleton className="lg:col-span-2 h-[360px]" />
            <div className="lg:col-span-2 p-6 space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-36" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </Card>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-6xl">🏠</div>
        <h1 className="text-2xl font-bold">Không tìm thấy phòng</h1>
        <p className="text-muted-foreground">
          Phòng này có thể đã bị xoá hoặc đường dẫn không đúng.
        </p>
        <Button asChild>
          <Link to="/search">Tìm phòng khác</Link>
        </Button>
      </div>
    )
  }

  const userPosition = userLocation ? [userLocation.lat, userLocation.lng] : null

  // ── Handlers ──────────────────────────────────────────────────────
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/rooms/${room.slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: room.title, text: room.title, url: shareUrl })
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Đã sao chép link!')
    } catch {
      toast.error('Không thể sao chép link')
    }
  }

  const handleDirections = async () => {
    if (!roomPosition) return
    if (!userLocation) {
      toast.error('Vui lòng bật định vị để chỉ đường trực tiếp trên bản đồ')
      return
    }
    try {
      setRouting(true)
      setRouteSummary('')
      const { lat: oLat, lng: oLng } = userLocation
      const [dLat, dLng] = roomPosition
      const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`
      const response = await fetch(url)
      const data = await response.json()
      const route = data?.routes?.[0]
      if (!route?.geometry?.coordinates?.length) throw new Error('Không tìm thấy tuyến đường phù hợp')
      const positions = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      setRoutePositions(positions)
      const distanceKm = route.distance ? (route.distance / 1000).toFixed(1) : null
      const durationMin = route.duration ? Math.round(route.duration / 60) : null
      setRouteSummary([distanceKm ? `${distanceKm} km` : null, durationMin ? `${durationMin} phút` : null].filter(Boolean).join(' · '))
      if (mapRef.current?.fitBounds) mapRef.current.fitBounds(positions, { padding: [40, 40] })
      toast.success('Đã hiển thị tuyến đường trên bản đồ')
      setActiveTab('map')
    } catch {
      setRoutePositions([userPosition, roomPosition])
      setRouteSummary('Không lấy được lộ trình chi tiết, hiển thị đường thẳng ước lượng')
      toast.error('Không thể lấy tuyến đường chi tiết, đã hiển thị đường ước lượng')
    } finally {
      setRouting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">

      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/search">
            <ArrowLeft className="h-4 w-4" />
            Quay lại tìm kiếm
          </Link>
        </Button>
      </div>

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-2">

          {/* Cột ảnh */}
          <div className="bg-muted">
            <div className="relative overflow-hidden">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={room.title}
                  className="h-[260px] w-full object-cover sm:h-[320px] lg:h-[400px]"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground sm:h-[320px] lg:h-[400px]">
                  Chưa có ảnh đại diện
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {hasMultipleImages && (
              <div className="grid grid-cols-6 gap-1.5 p-3 sm:grid-cols-8">
                {roomImages.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-md border-2 bg-background transition-all duration-150 ${
                      selectedImageIndex === index
                        ? 'border-primary shadow-md scale-95'
                        : 'border-transparent hover:border-primary/50 hover:scale-95'
                    }`}
                    aria-label={`Xem ảnh ${index + 1}`}
                  >
                    <img src={img} alt={`${room.title}-${index}`} className="h-12 w-full object-cover sm:h-14" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cột thông tin */}
          <div className="flex flex-col">
            <CardHeader className="space-y-3 pb-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{roomTypeLabels[room.roomType] || room.roomType || 'Phòng trọ'}</Badge>
                <Badge variant={room.isAvailable ? 'success' : 'muted'}>
                  {room.isAvailable ? 'Còn trống' : 'Đã thuê'}
                </Badge>
                {distanceText && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {distanceText}
                  </Badge>
                )}
              </div>

              <CardTitle className="text-2xl leading-tight">{room.title}</CardTitle>
              <CardDescription className="leading-6">{formatAddress(room.address)}</CardDescription>
              <p className="text-3xl font-bold text-primary">{formatCurrency(room.price)}</p>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 pt-0 pb-5 flex-1">
              {/* Stats nhỏ */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Diện tích</p>
                  <p className="mt-0.5 font-semibold">{room.area} m²</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Sức chứa</p>
                  <p className="mt-0.5 font-semibold">{room.capacity} người</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Trạng thái</p>
                  <p className={`mt-0.5 font-semibold text-xs ${room.isAvailable ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {room.isAvailable ? 'Còn trống' : 'Đã thuê'}
                  </p>
                </div>
              </div>

              {/* Nút chính */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDirections} disabled={routing} className="gap-2">
                  <Navigation className="h-4 w-4" />
                  {routing ? 'Đang tìm đường...' : 'Chỉ đường'}
                </Button>
                <Button variant="secondary" onClick={handleShare} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Chia sẻ
                </Button>
              </div>

              {/* Nút hành động */}
              <div className="flex flex-wrap gap-2">
                <FavoriteButton roomId={room._id} initialFavorited={isFavorited} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!user) { navigate('/login'); return }
                    navigate(`/messages?to=${room.landlord?._id}&room=${room._id}`)
                  }}
                  className="gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  Liên hệ chủ trọ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!user) { navigate('/login'); return }
                    setBookingOpen(true)
                  }}
                  className="gap-1.5"
                >
                  <span>📅</span>
                  Đặt lịch xem
                </Button>
                <CompareButton room={room} />
                <ReportButton roomId={room._id} />
              </div>

              {/* Lộ trình summary */}
              {routeSummary && (
                <p className="text-sm text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                  🗺️ Lộ trình: <span className="font-medium text-foreground">{routeSummary}</span>
                </p>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="map">Bản đồ</TabsTrigger>
          <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
        </TabsList>

        {/* Tab Thông tin */}
        <TabsContent value="info">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Mô tả */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Mô tả chi tiết</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-7 text-muted-foreground">{room.description || 'Chưa có mô tả chi tiết.'}</p>

                {/* Tiện ích */}
                {(room.amenities || []).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-3 text-sm font-semibold">Tiện ích</p>
                      <div className="flex flex-wrap gap-2">
                        {(room.amenities || []).map((item) => {
                          const config = amenityConfig[item]
                          const Icon = config?.icon
                          return (
                            <Badge key={item} variant="outline" className="gap-1.5 px-3 py-1 font-normal">
                              {Icon && <Icon className="h-3.5 w-3.5" />}
                              {config?.label || item}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Thông tin nhanh */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <House className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Loại phòng</p>
                    <p className="font-medium">{roomTypeLabels[room.roomType] || room.roomType || 'Chưa rõ'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Expand className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Diện tích</p>
                    <p className="font-medium">{room.area} m²</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sức chứa</p>
                    <p className="font-medium">{room.capacity} người</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Địa chỉ chi tiết</p>
                  <p className="font-medium text-sm">{room.address?.street || room.address || 'Chưa có'}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[room.address?.ward, room.address?.district, room.address?.city || 'Vĩnh Long'].filter(Boolean).join(' — ')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Bản đồ */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Bản đồ vị trí</CardTitle>
              <CardDescription>
                {userPosition
                  ? 'Hiển thị vị trí của bạn và phòng trọ trên bản đồ'
                  : 'Bật GPS để xem khoảng cách và tuyến đường thực tế'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roomPosition ? (
                <MapContainer
                  center={roomPosition}
                  zoom={15}
                  className="h-[400px] w-full rounded-lg"
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                  />

                  {/* Marker phòng */}
                  <CircleMarker center={roomPosition} radius={11} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}>
                    <Popup>
                      <strong>{room.title}</strong>
                      <br />
                      {formatCurrency(room.price)}
                    </Popup>
                  </CircleMarker>

                  {/* Marker user + Polyline */}
                  {userPosition && (
                    <>
                      <CircleMarker center={userPosition} radius={11} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}>
                        <Popup>Vị trí của bạn</Popup>
                      </CircleMarker>
                      {routePositions.length > 1 && (
                        <Polyline positions={routePositions} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }} />
                      )}
                    </>
                  )}
                </MapContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground rounded-lg border border-dashed">
                  Phòng này chưa có dữ liệu toạ độ trên bản đồ.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Đánh giá */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Đánh giá của sinh viên</CardTitle>
              <CardDescription>Chỉ hiển thị đánh giá đã được admin duyệt.</CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewSection roomId={room?._id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Dialog */}
      <BookingDialog
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        roomId={room?._id}
        roomTitle={room?.title}
      />
    </div>
  )
}
