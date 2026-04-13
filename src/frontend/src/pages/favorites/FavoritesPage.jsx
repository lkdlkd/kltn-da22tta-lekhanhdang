import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Search, Trash2, HeartOff } from 'lucide-react'
import { toast } from 'sonner'
import { getFavoritesApi, removeFavoriteApi } from '@/services/favoriteService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const [rooms, setRooms]     = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    getFavoritesApi()
      .then(res => setRooms(res.data?.data?.rooms || []))
      .catch(() => toast.error('Không thể tải danh sách yêu thích'))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (roomId) => {
    setRemoving(roomId)
    try {
      await removeFavoriteApi(roomId)
      setRooms(prev => prev.filter(r => r._id !== roomId))
      toast.success('Đã bỏ khỏi yêu thích')
    } catch {
      toast.error('Có lỗi xảy ra, thử lại sau')
    } finally { setRemoving(null) }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
            <Heart className="h-5 w-5 fill-red-400 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Phòng yêu thích</h1>
            {!loading && (
              <p className="text-sm text-muted-foreground">
                {rooms.length > 0 ? `${rooms.length} phòng đã lưu` : 'Chưa có phòng nào'}
              </p>
            )}
          </div>
        </div>
        {rooms.length > 0 && (
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
            <Link to="/search"><Search className="h-3.5 w-3.5" />Tìm thêm</Link>
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-20 text-center rounded-2xl border border-dashed bg-muted/20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <HeartOff className="h-10 w-10 text-red-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Chưa có phòng yêu thích</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              Nhấn ❤️ trên bất kỳ phòng nào để lưu vào đây và xem lại sau
            </p>
          </div>
          <Button asChild className="gap-2 rounded-full">
            <Link to="/search"><Search className="h-4 w-4" />Khám phá phòng ngay</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => (
            <div key={room._id} className="relative group">
              <RoomCard room={room} isFavorited />
              <button
                onClick={() => handleRemove(room._id)}
                disabled={removing === room._id}
                className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/90 dark:bg-zinc-800/90 border border-border px-2.5 py-1 text-xs font-medium text-destructive shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white hover:border-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                {removing === room._id ? 'Đang xoá...' : 'Bỏ lưu'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
