import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RoomCard, RoomCardSkeleton } from '@/components/rooms/RoomCard'
import { LocationPickerDialog } from '@/components/common/LocationPickerDialog'
import { selectIsAuthenticated } from '@/features/auth/authSlice'
import { forYouApi, wizardRecommendApi, getCommunityRecommendApi } from '@/services/recommendService'
import { getFavoriteIdsApi } from '@/services/favoriteService'
import { cn } from '@/lib/utils'

function haversineKm(lat1, lng1, lat2, lng2) {
  const radius = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return radius * 2 * Math.asin(Math.sqrt(a))
}

function getRoomDistanceText(room, userLat, userLng) {
  if (!userLat || !userLng) return null
  const coords = room?.location?.coordinates
  if (!coords || coords.length < 2) return null
  const [lng, lat] = coords
  const km = haversineKm(userLat, userLng, lat, lng)
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km * 10) / 10} km`
}

export default function RecommendPage() {
  const isAuth = useSelector(selectIsAuthenticated)
  const user = useSelector((state) => state.auth?.user)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [displayGps, setDisplayGps] = useState(null)
  const [apiGps, setApiGps] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const fetchForYou = useCallback(async (location = null) => {
    setLoading(true)
    try {
      const res = await forYouApi({ limit: 12, ...(location ?? {}) })
      setRooms(res.data?.data?.rooms || [])
    } catch {
      toast.error('Không tải được gợi ý')
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTopForGuest = useCallback(async (location = null) => {
    setLoading(true)
    try {
      const res = await getCommunityRecommendApi({ limit: 12, ...(location ?? {}) })
      setRooms(res.data?.data?.rooms || [])
    } catch {
      toast.error('Không tải được gợi ý')
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  const doFetch = useCallback((location = null) => {
    if (isAuth) fetchForYou(location)
    else fetchTopForGuest(location)
  }, [isAuth, fetchForYou, fetchTopForGuest])

  useEffect(() => {
    doFetch(null)
  }, [doFetch])

  // Sync favorites
  useEffect(() => {
    if (!user) {
      setFavoriteIds([])
      return
    }
    getFavoriteIdsApi()
      .then((res) => setFavoriteIds(res.data?.data?.roomIds || []))
      .catch(() => {})
  }, [user, rooms])

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

  const sourceLabel = apiGps
    ? 'Ưu tiên phòng gần bạn'
    : isAuth ? 'Gợi ý dành riêng cho bạn' : 'Phòng nổi bật hôm nay'

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header section */}
      <section className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gợi ý phòng trọ</h1>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                {isAuth
                  ? 'Danh sách phòng trọ đề xuất dựa trên khoảng cách địa lý và lịch sử tương tác của bạn.'
                  : 'Danh sách các phòng trọ được quan tâm nhiều nhất. Đăng nhập để nhận các đề xuất cá nhân hoá.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!isAuth && (
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-9 px-4">
                  <Link to="/login">Đăng nhập</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-9 px-4" onClick={() => doFetch(apiGps)} disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Làm mới danh sách'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {!isAuth && (
          <Card className="border bg-card">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Trải nghiệm cá nhân hóa tốt hơn</p>
                <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                  Đăng nhập tài khoản để hệ thống tự động lưu giữ lịch sử xem phòng, yêu thích và đề xuất những phòng trọ phù hợp nhất với nhu cầu của bạn.
                </p>
              </div>
              <Button asChild size="sm" className="rounded-xl text-xs shrink-0 px-4 h-9">
                <Link to="/login">Đăng nhập ngay</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Location prioritization */}
        <Card className="border bg-card">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-foreground">Vị trí tìm kiếm trọ</p>
              <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                {apiGps ? 'Hệ thống đang ưu tiên hiển thị các phòng trọ ở vị trí gần toạ độ bạn chọn.' : 'Chọn toạ độ (ví dụ: trường đại học của bạn) để hiển thị khoảng cách và xem các phòng ở gần.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {apiGps && (
                <Badge variant="outline" className="h-9 rounded-xl border-sky-100 bg-sky-50/50 px-3.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/20 dark:border-sky-900/30">
                  Vị trí đã thiết lập
                </Badge>
              )}
              {apiGps && (
                <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs text-muted-foreground hover:text-destructive px-3" onClick={clearGPS}>
                  Xóa vị trí
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs px-4" onClick={() => setPickerOpen(true)}>
                {apiGps ? 'Thay đổi vị trí' : 'Chọn vị trí của bạn'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold tracking-tight">{sourceLabel}</h2>
            <p className="text-xs text-muted-foreground">Tin phòng trọ có mức độ tương thích cao nhất sẽ được ưu tiên xếp trước.</p>
          </div>
          {!loading && rooms.length > 0 && (
            <Badge variant="outline" className="h-7 rounded-lg px-2.5 text-xs bg-muted/20 font-medium">
              Tổng số: {rooms.length} phòng
            </Badge>
          )}
        </div>

        {/* Grid container */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => <RoomCardSkeleton key={index} />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="max-w-md mx-auto my-4">
            <Card className="border-dashed border-2 bg-card/30">
              <CardContent className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                <div className="space-y-1.5">
                  <p className="text-base font-bold text-foreground">{apiGps ? 'Không tìm thấy phòng ở gần đây' : 'Chưa có gợi ý phù hợp'}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                    {apiGps
                      ? 'Không tìm thấy phòng trọ nào ở phạm vi xung quanh toạ độ này. Hãy thử chọn vị trí khác hoặc xoá bộ lọc khoảng cách.'
                      : 'Hãy xem thêm một số phòng trọ khác để hệ thống học được thói quen và sở thích tìm trọ của bạn.'}
                  </p>
                </div>
                {apiGps && (
                  <Button variant="outline" size="sm" className="rounded-xl text-xs mt-2 h-9 px-4" onClick={clearGPS}>
                    Xóa lọc khoảng cách
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                initialFavorited={favoriteIds.includes(String(room._id))}
                distanceText={getRoomDistanceText(room, displayGps?.lat, displayGps?.lng)}
              />
            ))}
          </div>
        )}
      </main>

      <LocationPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleLocationSelect} />
    </div>
  )
}
