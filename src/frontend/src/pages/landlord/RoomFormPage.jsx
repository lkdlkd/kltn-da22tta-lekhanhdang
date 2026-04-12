import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import {
  ArrowLeft, Save, MapPinned, Image as ImageIcon, FileText,
  Wifi, Wind, Flame, Package, WashingMachine, ChefHat,
  Car, ShieldCheck, Camera, ArrowUp, Trees, Sofa, Bath, Zap,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { createRoomApi, getRoomByIdApi, updateRoomApi } from '@/services/roomService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const roomTypeOptions = [
  { value: 'phòng_trọ', label: 'Phòng trọ' },
  { value: 'chung_cư_mini', label: 'Chung cư mini' },
  { value: 'nhà_nguyên_căn', label: 'Nhà nguyên căn' },
  { value: 'ký_túc_xá', label: 'Ký túc xá' },
]

const amenityOptions = [
  { value: 'wifi',              label: 'Wifi',             icon: Wifi },
  { value: 'điều_hòa',         label: 'Điều hòa',         icon: Wind },
  { value: 'nóng_lạnh',        label: 'Nóng lạnh',        icon: Flame },
  { value: 'tủ_lạnh',          label: 'Tủ lạnh',          icon: Package },
  { value: 'máy_giặt',         label: 'Máy giặt',         icon: WashingMachine },
  { value: 'bếp',              label: 'Bếp',              icon: ChefHat },
  { value: 'chỗ_để_xe',        label: 'Chỗ để xe',        icon: Car },
  { value: 'an_ninh',          label: 'An ninh',          icon: ShieldCheck },
  { value: 'camera',           label: 'Camera',           icon: Camera },
  { value: 'thang_máy',        label: 'Thang máy',        icon: ArrowUp },
  { value: 'ban_công',         label: 'Ban công',         icon: Trees },
  { value: 'nội_thất',         label: 'Nội thất',         icon: Sofa },
  { value: 'vệ_sinh_riêng',    label: 'Vệ sinh riêng',   icon: Bath },
  { value: 'điện_nước_riêng',  label: 'Điện nước riêng', icon: Zap },
]

// ── Step Indicator ─────────────────────────────────────────────────────
const STEPS = [
  { label: 'Thông tin cơ bản', icon: FileText },
  { label: 'Vị trí & địa chỉ', icon: MapPinned },
  { label: 'Tiện ích & ảnh',   icon: ImageIcon },
]

function StepIndicator() {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, index) => {
        const Icon = step.icon
        const isLast = index === STEPS.length - 1
        return (
          <div key={step.label} className="flex items-center gap-0 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-center leading-tight hidden sm:block">{step.label}</span>
            </div>
            {!isLast && (
              <div className="h-0.5 flex-1 bg-primary/30 mx-1 mb-4 hidden sm:block" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Utility functions ──────────────────────────────────────────────────
const isWardLike = (value = '') => /^(phường|xã|thị trấn|ward|commune|township)/i.test(value.trim())
const isDistrictLike = (value = '') => /^(quận|huyện|thành phố|thị xã|district|city|municipality)/i.test(value.trim())
const pickFirst = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || ''

const reverseGeocodeLocation = async (lat, lng) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
  )
  if (!response.ok) throw new Error('Không thể xác định địa chỉ từ vị trí đã chọn')
  const data = await response.json()
  const address = data.address || {}
  const roadName = [address.house_number, address.road, address.quarter].filter(Boolean).join(', ').trim()
  const street = pickFirst(roadName, address.name, address.residential, address.amenity, address.city, address.town, address.village, address.suburb, data.display_name)
  const wardCandidate = pickFirst(address.county, address.suburb, address.neighbourhood, address.city_district)
  const ward = pickFirst(isWardLike(wardCandidate) ? wardCandidate : '', address.suburb, address.neighbourhood, address.city_district, isWardLike(address.county) ? address.county : '')
  const district = pickFirst(address.town, address.village, address.city, address.city_district, address.municipality, isDistrictLike(address.county) ? address.county : '', address.state_district)
  const city = pickFirst(address.city, address.town, address.village, address.state, 'Vĩnh Long')
  const fullAddress = pickFirst(data.display_name, [street, ward, district, city].filter(Boolean).join(', '))
  return { street, district, ward, city, fullAddress }
}

// ── Map sub-components ─────────────────────────────────────────────────
function LocationPicker({ value, onPick }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  if (!value) return null
  return <CircleMarker center={[value.lat, value.lng]} radius={11} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }} />
}

function MapViewport({ location }) {
  const map = useMap()
  useEffect(() => {
    if (!location) return
    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 15), { animate: true, duration: 0.5 })
  }, [location, map])
  return null
}

// ── Image preview list ─────────────────────────────────────────────────
function PreviewList({ title, urls, onRemove }) {
  if (!urls.length) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {urls.map((url, index) => (
          <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border bg-muted">
            <img src={url} alt={`${title}-${index}`} className="h-28 w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onRemove(index)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                Xoá
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Form ──────────────────────────────────────────────────────────
export default function RoomFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = Boolean(id)

  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    area: '',
    capacity: '1',
    roomType: 'phòng_trọ',
    address: { street: '', ward: '', district: '', city: 'Vĩnh Long', fullAddress: '' },
    isAvailable: true,
    amenities: [],
    location: null,
  })
  const [existingImages, setExistingImages] = useState([])
  const [existingImages360, setExistingImages360] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [image360Files, setImage360Files] = useState([])

  const imagePreviewUrls = useMemo(() => imageFiles.map((file) => URL.createObjectURL(file)), [imageFiles])
  const image360PreviewUrls = useMemo(() => image360Files.map((file) => URL.createObjectURL(file)), [image360Files])

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
      image360PreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls, image360PreviewUrls])

  useEffect(() => {
    if (!isEditMode) return
    const fetchRoom = async () => {
      try {
        setLoading(true)
        const res = await getRoomByIdApi(id)
        const room = res.data?.data?.room
        if (!room) return
        const [lng, lat] = room.location?.coordinates || []
        setForm({
          title: room.title || '',
          description: room.description || '',
          price: String(room.price || ''),
          area: String(room.area || ''),
          capacity: String(room.capacity || 1),
          roomType: room.roomType || 'phòng_trọ',
          address: typeof room.address === 'string'
            ? { street: room.address, ward: '', district: '', city: 'Vĩnh Long', fullAddress: room.address }
            : { street: room.address?.street || '', ward: room.address?.ward || '', district: room.address?.district || '', city: room.address?.city || 'Vĩnh Long', fullAddress: room.address?.fullAddress || '' },
          isAvailable: room.isAvailable ?? true,
          amenities: room.amenities || [],
          location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
        })
        setExistingImages(room.images || [])
        setExistingImages360(room.images360 || [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể tải dữ liệu phòng')
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [id, isEditMode])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    if (name.startsWith('address.')) {
      const key = name.split('.')[1]
      setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAmenityToggle = (amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  const applyLocationSelection = async (location) => {
    setForm((prev) => ({ ...prev, location }))
    try {
      const resolved = await reverseGeocodeLocation(location.lat, location.lng)
      setForm((prev) => ({
        ...prev,
        location,
        address: {
          ...prev.address,
          street: resolved.street || prev.address.street,
          ward: resolved.ward || prev.address.ward,
          district: resolved.district || prev.address.district,
          city: resolved.city || prev.address.city,
          fullAddress: resolved.fullAddress || prev.address.fullAddress,
        },
      }))
    } catch (error) {
      toast.error(error.message || 'Không thể tự động điền địa chỉ từ vị trí')
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ lấy vị trí hiện tại')
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await applyLocationSelection({ lat: position.coords.latitude, lng: position.coords.longitude })
        } finally {
          setLocationLoading(false)
        }
      },
      (error) => {
        toast.error(error.message || 'Không thể lấy vị trí hiện tại')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.location) {
      toast.error('Vui lòng chọn vị trí trên bản đồ')
      return
    }
    try {
      setSaving(true)
      const payload = new FormData()
      payload.append('title', form.title)
      payload.append('description', form.description)
      payload.append('price', form.price)
      payload.append('area', form.area)
      payload.append('capacity', form.capacity)
      payload.append('roomType', form.roomType)
      payload.append('address', JSON.stringify(form.address))
      payload.append('lat', String(form.location.lat))
      payload.append('lng', String(form.location.lng))
      payload.append('isAvailable', String(form.isAvailable))
      payload.append('amenities', JSON.stringify(form.amenities))
      payload.append('images', JSON.stringify(existingImages))
      payload.append('images360', JSON.stringify(existingImages360))
      imageFiles.forEach((file) => payload.append('images', file))
      image360Files.forEach((file) => payload.append('images360', file))

      if (isEditMode) {
        await updateRoomApi(id, payload)
        toast.success('Cập nhật phòng thành công')
      } else {
        await createRoomApi(payload)
        toast.success('Đăng tin phòng thành công')
      }
      navigate('/landlord/rooms')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lưu phòng thất bại')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Card><CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-24" />
        </CardContent></Card>
        <Card><CardContent className="p-6 space-y-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-[320px] rounded-lg" />
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Chỉnh sửa phòng' : 'Đăng phòng mới'}</h1>
          <p className="text-sm text-muted-foreground">
            Điền đầy đủ thông tin để sinh viên dễ dàng tìm thấy phòng của bạn.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/landlord/rooms">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="px-6 py-5">
          <StepIndicator />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── SECTION 1: Thông tin cơ bản ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </div>
            <CardDescription>Tên phòng, loại phòng, giá, diện tích, sức chứa, mô tả.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Tên phòng <span className="text-destructive">*</span></Label>
              <Input id="title" name="title" value={form.title} onChange={handleChange} placeholder="VD: Phòng trọ sạch sẽ gần ĐH Cửu Long" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomType">Loại phòng</Label>
              <select
                id="roomType"
                name="roomType"
                value={form.roomType}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {roomTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 flex items-end">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  name="isAvailable"
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span>Phòng còn trống</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Giá thuê (VND/tháng) <span className="text-destructive">*</span></Label>
              <Input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="VD: 2500000" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Diện tích (m²) <span className="text-destructive">*</span></Label>
              <Input id="area" name="area" type="number" min="1" value={form.area} onChange={handleChange} placeholder="VD: 25" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Sức chứa (người) <span className="text-destructive">*</span></Label>
              <Input id="capacity" name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Mô tả chi tiết <span className="text-destructive">*</span></Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                placeholder="Mô tả về phòng, khu vực, tiện ích xung quanh..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 2: Địa chỉ & Vị trí ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
              <CardTitle>Địa chỉ và vị trí</CardTitle>
            </div>
            <CardDescription>
              Click vào bản đồ để ghim toạ độ phòng, hoặc dùng vị trí hiện tại để tự điền địa chỉ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleUseCurrentLocation} disabled={locationLoading}>
                <MapPinned className="h-4 w-4" />
                {locationLoading ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
              </Button>
              {form.location && (
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã chọn: {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address.street">Địa chỉ chi tiết <span className="text-destructive">*</span></Label>
                <Input id="address.street" name="address.street" value={form.address.street} onChange={handleChange} placeholder="VD: 123 Đường Nguyễn Huệ" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.ward">Phường/Xã</Label>
                <Input id="address.ward" name="address.ward" value={form.address.ward} onChange={handleChange} placeholder="VD: Phường 1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.district">Quận/Huyện</Label>
                <Input id="address.district" name="address.district" value={form.address.district} onChange={handleChange} placeholder="VD: TP. Vĩnh Long" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.city">Tỉnh/Thành phố</Label>
                <Input id="address.city" name="address.city" value={form.address.city} onChange={handleChange} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="address.fullAddress">Địa chỉ đầy đủ (tự động điền)</Label>
                <Input id="address.fullAddress" name="address.fullAddress" value={form.address.fullAddress} onChange={handleChange} placeholder="Tự động điền khi chọn vị trí trên bản đồ" />
              </div>
            </div>

            {/* Bản đồ */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                👆 Click vào bản đồ để ghim vị trí phòng. Địa chỉ sẽ tự động được điền.
              </p>
              <MapContainer
                center={form.location ? [form.location.lat, form.location.lng] : [10.2547, 105.9722]}
                zoom={13}
                className="h-[360px] w-full rounded-lg border"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                <MapViewport location={form.location} />
                <LocationPicker value={form.location} onPick={applyLocationSelection} />
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 3: Tiện ích ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
              <CardTitle>Tiện ích</CardTitle>
            </div>
            <CardDescription>Chọn các tiện ích có sẵn trong phòng để tăng chất lượng tin đăng.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="secondary">Đã chọn {form.amenities.length} tiện ích</Badge>
              {form.amenities.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, amenities: [] }))}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map((amenity) => {
                const Icon = amenity.icon
                const selected = form.amenities.includes(amenity.value)
                return (
                  <Button
                    key={amenity.value}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    onClick={() => handleAmenityToggle(amenity.value)}
                    className="gap-1.5"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {amenity.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 4: Ảnh ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</div>
              <CardTitle>Ảnh phòng</CardTitle>
            </div>
            <CardDescription>Upload ảnh thường và ảnh 360° Panorama (tuỳ chọn).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload ảnh thường */}
            <div className="space-y-2">
              <Label htmlFor="images">Ảnh thường</Label>
              <label
                htmlFor="images"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Nhấn để chọn ảnh</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — nhiều file</p>
                </div>
                <input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => setImageFiles(Array.from(event.target.files || []))}
                />
              </label>
            </div>

            {/* Upload ảnh 360 */}
            <div className="space-y-2">
              <Label htmlFor="images360">
                Ảnh 360° Panorama
                <span className="ml-2 text-xs font-normal text-muted-foreground">(tuỳ chọn)</span>
              </Label>
              <label
                htmlFor="images360"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <div className="text-2xl">🌐</div>
                <div>
                  <p className="text-sm font-medium">Nhấn để chọn ảnh 360°</p>
                  <p className="text-xs text-muted-foreground">Ảnh panorama toàn cảnh phòng</p>
                </div>
                <input
                  id="images360"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => setImage360Files(Array.from(event.target.files || []))}
                />
              </label>
            </div>

            {/* Preview */}
            <PreviewList
              title="Ảnh thường đã lưu"
              urls={existingImages}
              onRemove={(index) => setExistingImages((prev) => prev.filter((_, i) => i !== index))}
            />
            <PreviewList
              title="Ảnh 360° đã lưu"
              urls={existingImages360}
              onRemove={(index) => setExistingImages360((prev) => prev.filter((_, i) => i !== index))}
            />
            <PreviewList
              title="Ảnh thường mới"
              urls={imagePreviewUrls}
              onRemove={(index) => setImageFiles((prev) => prev.filter((_, i) => i !== index))}
            />
            <PreviewList
              title="Ảnh 360° mới"
              urls={image360PreviewUrls}
              onRemove={(index) => setImage360Files((prev) => prev.filter((_, i) => i !== index))}
            />
          </CardContent>
        </Card>

        <Separator />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/landlord/rooms">Huỷ</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Đăng phòng'}
          </Button>
        </div>
      </form>
    </div>
  )
}
