import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2, Home } from 'lucide-react'
import { toast } from 'sonner'
import { getFavoritesApi, removeFavoriteApi } from '@/services/favoriteService'
import { RoomCard } from '@/components/rooms/RoomCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFavoritesApi()
      .then((res) => setRooms(res.data?.data?.rooms || []))
      .catch(() => toast.error('Không thể tải danh sách yêu thích'))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (roomId) => {
    try {
      await removeFavoriteApi(roomId)
      setRooms((prev) => prev.filter((r) => r._id !== roomId))
      toast.success('Đã bỏ yêu thích')
    } catch {
      toast.error('Có lỗi xảy ra')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30">
          <Heart className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Phòng yêu thích</h1>
          <p className="text-sm text-muted-foreground">{rooms.length} phòng đã lưu</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <RoomCardSkeleton key={i} />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Chưa có phòng yêu thích nào</h2>
          <p className="text-sm text-muted-foreground">Nhấn ❤️ trên bất kỳ phòng nào để lưu vào đây</p>
          <Button asChild>
            <Link to="/search"><Home className="h-4 w-4" /> Tìm phòng ngay</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room._id} className="relative">
              <RoomCard room={room} isFavorited />
              <Button
                variant="destructive"
                size="sm"
                className="absolute right-2 top-2 z-10 h-7 gap-1 px-2 text-xs"
                onClick={() => handleRemove(room._id)}
              >
                <Trash2 className="h-3 w-3" /> Bỏ lưu
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
