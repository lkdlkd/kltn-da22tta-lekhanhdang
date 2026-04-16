import { ArrowLeft, CalendarPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConvAvatar } from './ConvAvatar'
import { cn } from '@/lib/utils'

export function ChatHeader({ otherUser, isOnline, isTyping, conv, onBack, onOpenBooking }) {
  return (
    <div className="flex items-center gap-3 border-b bg-background px-4 py-3 shrink-0">
      {/* Back button (mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 shrink-0"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <ConvAvatar name={otherUser?.name} size="md" online={isOnline} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight truncate">{otherUser?.name || 'Người dùng'}</p>
        <p className="text-xs h-4 mt-0.5">
          {isTyping ? (
            <span className="text-primary italic animate-pulse">Đang nhập...</span>
          ) : isOnline ? (
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Đang hoạt động
            </span>
          ) : (
            <span className="text-muted-foreground/60">Không hoạt động</span>
          )}
        </p>
        {conv?.room && (
          <Link
            to={`/rooms/${conv.room.slug}`}
            className="block text-xs text-primary hover:underline truncate max-w-[180px] sm:max-w-none"
          >
            🏠 {conv.room.title}
          </Link>
        )}
      </div>

      {/* Booking shortcut */}
      {conv?.room && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs shrink-0 hidden sm:flex"
          onClick={onOpenBooking}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Đặt lịch
        </Button>
      )}
    </div>
  )
}
