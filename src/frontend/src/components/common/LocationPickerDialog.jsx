import { useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Loader2, Navigation } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Map click sub-component
function MapClickPicker({ onPick }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

/**
 * LocationPickerDialog
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Function} onSelect({ lat, lng }) — called when user confirms a location
 */
export function LocationPickerDialog({ open, onClose, onSelect }) {
  const [tab, setTab] = useState('gps')
  const [gpsState, setGpsState] = useState('idle') // idle | loading | success | error
  const [gpsMsg, setGpsMsg] = useState('')
  const [gpsCoords, setGpsCoords] = useState(null)
  const [mapCoords, setMapCoords] = useState(null)
  const DEFAULT_CENTER = [10.2547, 105.9722] // Vĩnh Long

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsMsg('Trình duyệt không hỗ trợ GPS')
      setGpsState('error')
      return
    }
    setGpsState('loading')
    setGpsMsg('Đang lấy vị trí...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGpsCoords(coords)
        setGpsState('success')
        setGpsMsg(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`)
      },
      (err) => {
        setGpsState('error')
        if (err.code === 1) setGpsMsg('Quyền vị trí bị từ chối. Vào Cài đặt trình duyệt để cấp quyền.')
        else if (err.code === 2) setGpsMsg('Không xác định được vị trí. Kiểm tra GPS thiết bị.')
        else if (err.code === 3) setGpsMsg('Hết thời gian. Thử lại.')
        else setGpsMsg('Không lấy được vị trí.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleConfirm = () => {
    const coords = tab === 'gps' ? gpsCoords : mapCoords
    if (!coords) { toast.error('Vui lòng chọn vị trí trước'); return }
    onSelect(coords)
    onClose()
    // reset
    setGpsState('idle'); setGpsMsg(''); setGpsCoords(null); setMapCoords(null)
  }

  const canConfirm = tab === 'gps' ? gpsState === 'success' : !!mapCoords

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Chọn vị trí
          </DialogTitle>
          <DialogDescription>
            Dùng GPS tự động hoặc nhấn chọn trên bản đồ.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-1">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="gps" className="gap-1.5">
              <Navigation className="h-3.5 w-3.5" /> Vị trí hiện tại
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Chọn trên bản đồ
            </TabsTrigger>
          </TabsList>

          {/* ── GPS tab ── */}
          <TabsContent value="gps" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Nhấn nút bên dưới để trình duyệt xin quyền GPS và lấy vị trí chính xác của bạn.
            </p>
            <Button
              onClick={handleGPS}
              disabled={gpsState === 'loading'}
              className="w-full gap-2"
              variant={gpsState === 'success' ? 'outline' : 'default'}
            >
              {gpsState === 'loading'
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lấy vị trí...</>
                : gpsState === 'success'
                  ? <><Navigation className="h-4 w-4 text-emerald-500" /> Lấy lại vị trí</>
                  : <><Navigation className="h-4 w-4" /> Lấy vị trí hiện tại</>}
            </Button>
            {gpsMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg border ${
                gpsState === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
                  : gpsState === 'error'
                    ? 'bg-destructive/5 border-destructive/20 text-destructive'
                    : 'bg-muted border-border text-muted-foreground'
              }`}>
                {gpsState === 'success' && '✅ '}{gpsState === 'error' && '⚠️ '}{gpsMsg}
              </p>
            )}
          </TabsContent>

          {/* ── Map tab ── */}
          <TabsContent value="map" className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Nhấn vào bản đồ để ghim vị trí của bạn.</p>
            <div className="rounded-lg overflow-hidden border" style={{ height: 300 }}>
              <MapContainer
                center={mapCoords ? [mapCoords.lat, mapCoords.lng] : DEFAULT_CENTER}
                zoom={13}
                className="h-full w-full"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickPicker onPick={setMapCoords} />
                {mapCoords && <Marker position={[mapCoords.lat, mapCoords.lng]} />}
              </MapContainer>
            </div>
            {mapCoords && (
              <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
                ✅ Đã chọn: {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => { onClose(); setGpsState('idle'); setGpsMsg(''); setGpsCoords(null); setMapCoords(null) }}>
            Huỷ
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Xác nhận vị trí
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
