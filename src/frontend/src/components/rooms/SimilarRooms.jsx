import { useEffect, useState } from 'react'
import { getSimilarRoomsApi } from '@/services/recommendService'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomCard } from '@/components/rooms/RoomCard'

// ── Haversine distance (km) ───────────────────────────────────────────────────
// targetLocation: [lng, lat] — GeoJSON format từ MongoDB
// roomCoords:    [lng, lat]  — GeoJSON format
function haversineKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
}

// Format khoảng cách hiển thị trên card
function formatDistance(km) {
  if (km == null || isNaN(km)) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SimilarSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * @param {string}        roomId          – ID phòng đang xem
 * @param {number}        limit           – Số phòng gợi ý tối đa
 * @param {[number,number]|undefined} targetLocation – [lng, lat] GeoJSON của phòng đang xem
 *                                          Dùng để tính khoảng cách hiển thị trên card
 */
export function SimilarRooms({ roomId, limit = 6, targetLocation }) {
  const [rooms, setRooms]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    setLoading(true)
    getSimilarRoomsApi(roomId, limit)
      .then((res) => {
        if (!cancelled) setRooms(res.data?.data?.rooms || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [roomId, limit])

  if (!loading && rooms.length === 0) return null

  return (
    <section className="mt-10">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Phòng tương tự</h2>
          {!loading && rooms.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {rooms.length} phòng gợi ý gần khu vực này
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <SimilarSkeleton count={limit} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            // Tính khoảng cách từ phòng gốc đến phòng gợi ý
            const coords = room.location?.coordinates  // [lng, lat]
            const distanceText =
              targetLocation && coords
                ? formatDistance(haversineKm(targetLocation, coords))
                : undefined

            return (
              <RoomCard
                key={room._id}
                room={room}
                distanceText={distanceText}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
