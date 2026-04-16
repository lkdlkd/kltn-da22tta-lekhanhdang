import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConvAvatar } from './ConvAvatar'

export function ConversationList({
  conversations,
  activeConvId,
  onSelect,
  currentUserId,
  onlineUsers,
  typingUsers,
  loading,
}) {
  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 rounded-xl p-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <MessageCircle className="h-10 w-10 opacity-30" />
        <p className="text-sm">Chưa có cuộc hội thoại nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 p-2">
      {conversations.map((conv) => {
        const other = conv.participants?.find((p) => String(p._id) !== String(currentUserId))
        const isActive = conv._id === activeConvId
        const isTyping = (typingUsers[conv._id]?.size || 0) > 0
        const unread = conv.unreadCount || 0

        const lastTxt =
          conv.lastMessage?.messageType === 'appointment'
            ? '📅 Lịch hẹn xem phòng'
            : conv.lastMessage?.content ||
              (conv.lastMessage?.attachments?.length ? '📎 File đính kèm' : conv.room?.title || 'Bắt đầu hội thoại')

        const isUnread = !isActive && unread > 0

        return (
          <button
            key={conv._id}
            onClick={() => onSelect(conv._id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors',
              isActive ? 'bg-primary/10' : 'hover:bg-muted/60'
            )}
          >
            <ConvAvatar name={other?.name} online={onlineUsers[String(other?._id)]} />

            <div className="flex-1 min-w-0">
              <p className={cn('text-sm truncate', isUnread ? 'font-semibold' : 'font-medium')}>
                {other?.name || 'Người dùng'}
              </p>
              <p className={cn('truncate text-xs mt-0.5', isTyping ? 'text-primary italic' : isUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {isTyping ? 'Đang nhập...' : lastTxt}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {conv.lastMessageAt && (
                <span className={cn('text-[11px]', isUnread ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  {dayjs(conv.lastMessageAt).fromNow(true)}
                </span>
              )}
              {isUnread && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
