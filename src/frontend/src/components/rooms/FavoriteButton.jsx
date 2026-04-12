import { useEffect, useRef, useState, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { addFavoriteApi, removeFavoriteApi } from '@/services/favoriteService'
import { cn } from '@/lib/utils'

/**
 * FavoriteButton — optimistic toggle
 * Props:
 *  roomId: string
 *  initialFavorited: boolean
 *  size?: 'icon' | 'sm' | 'md'
 *  className?: string
 */
export function FavoriteButton({ roomId, initialFavorited = false, size = 'md', className }) {
  const user = useSelector((state) => state.auth?.user)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setFavorited(initialFavorited) }, [initialFavorited])

  const handleClick = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.error('Vui lòng đăng nhập để lưu yêu thích'); return }
    if (loading) return

    // Optimistic update
    const prev = favorited
    setFavorited(!prev)
    setLoading(true)
    try {
      if (prev) {
        await removeFavoriteApi(roomId)
        toast.success('Đã bỏ yêu thích')
      } else {
        await addFavoriteApi(roomId)
        toast.success('Đã lưu phòng yêu thích ❤️')
      }
    } catch {
      setFavorited(prev) // rollback
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }, [loading, favorited, roomId, user])

  const sizeClass = size === 'icon' ? 'h-7 w-7' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const iconClass = size === 'icon' || size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={favorited ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
      className={cn(
        'flex items-center justify-center rounded-full border bg-background/90 backdrop-blur-sm shadow-sm transition-all',
        'hover:scale-110 active:scale-95',
        sizeClass,
        favorited
          ? 'border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'border-border text-muted-foreground hover:border-red-300 hover:text-red-400',
        loading && 'opacity-60',
        className
      )}
    >
      <Heart className={cn(iconClass, favorited && 'fill-current')} />
    </button>
  )
}
