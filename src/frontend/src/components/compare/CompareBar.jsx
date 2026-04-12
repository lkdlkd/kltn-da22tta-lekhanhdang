import { useNavigate } from 'react-router-dom'
import { GitCompare, X, ArrowRight } from 'lucide-react'
import { useCompareStore } from '@/store/compareStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * CompareBar — fixed bottom bar, hiện khi có ≥ 1 phòng trong danh sách so sánh
 */
export function CompareBar() {
  const navigate = useNavigate()
  const { rooms, removeRoom, clearRooms } = useCompareStore()

  if (rooms.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 shadow-2xl backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        {/* Room thumbnails */}
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <GitCompare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold hidden sm:block">So sánh ({rooms.length}/3)</span>
          </div>
          <div className="flex gap-2">
            {rooms.map((room) => (
              <div key={room._id} className="flex shrink-0 items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5">
                {room.images?.[0] && (
                  <img src={room.images[0]} alt="" className="h-8 w-10 rounded object-cover" />
                )}
                <span className="hidden sm:block text-xs font-medium max-w-[120px] truncate">{room.title}</span>
                <button
                  onClick={() => removeRoom(room._id)}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 3 - rooms.length }).map((_, i) => (
              <div key={i} className="flex h-11 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed">
                <span className="text-xs text-muted-foreground">Trống</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={clearRooms} className="text-xs h-8">Xoá hết</Button>
          <Button
            size="sm"
            disabled={rooms.length < 2}
            onClick={() => navigate('/compare')}
            className="gap-1.5 h-8"
          >
            So sánh <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * CompareButton — nút thêm vào so sánh cho RoomCard / RoomDetailPage
 */
export function CompareButton({ room, size = 'sm' }) {
  const { addRoom, removeRoom, isInCompare } = useCompareStore()
  const inCompare = isInCompare(room._id)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation()
        inCompare ? removeRoom(room._id) : addRoom(room)
      }}
      title={inCompare ? 'Xoá khỏi so sánh' : 'Thêm vào so sánh'}
      className={cn(
        'flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
        inCompare
          ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
          : 'border-border bg-background/90 text-muted-foreground hover:border-primary/50 hover:text-primary'
      )}
    >
      <GitCompare className="h-3.5 w-3.5" />
      {inCompare ? 'Đang so sánh' : 'So sánh'}
    </button>
  )
}
