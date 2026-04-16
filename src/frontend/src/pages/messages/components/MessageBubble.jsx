import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { CheckCheck, Check } from 'lucide-react'
import { AppointmentBubble } from '@/components/rooms/AppointmentBubble'
import { ConvAvatar } from './ConvAvatar'

function AttachmentGrid({ attachments }) {
  if (!attachments?.length) return null
  return (
    <div className={cn('grid gap-1 mt-1.5', attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {attachments.map((att, i) =>
        att.type === 'image' ? (
          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden">
            <img src={att.url} alt="" className="w-full object-cover max-h-48 hover:opacity-90 transition-opacity" />
          </a>
        ) : (
          <video key={i} src={att.url} controls className="rounded-lg max-h-48 w-full bg-black" />
        )
      )}
    </div>
  )
}

export function MessageBubble({ msg, isMine, showAvatar, isRead }) {
  // Appointment card
  if (msg.messageType === 'appointment' && msg.appointmentRef) {
    return (
      <div className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start')}>
        {!isMine && showAvatar && <ConvAvatar name={msg.sender?.name} size="sm" />}
        {!isMine && !showAvatar && <div className="w-9 shrink-0" />}
        <div className="max-w-[75%]">
          <AppointmentBubble appt={msg.appointmentRef} isMine={isMine} />
          <p className={cn('mt-1 text-[10px] text-muted-foreground', isMine ? 'text-right' : 'text-left')}>
            {dayjs(msg.createdAt).format('HH:mm')}
          </p>
        </div>
      </div>
    )
  }

  // Text / media bubble
  return (
    <div className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start')}>
      {!isMine && showAvatar && <ConvAvatar name={msg.sender?.name} size="sm" />}
      {!isMine && !showAvatar && <div className="w-9 shrink-0" />}

      <div className={cn('max-w-[72%]', isMine ? 'items-end' : 'items-start', 'flex flex-col')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm',
            isMine
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm bg-muted text-foreground'
          )}
        >
          {msg.content && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
          <AttachmentGrid attachments={msg.attachments} />
        </div>

        {/* Time + read indicator */}
        <div className={cn('flex items-center gap-1 mt-0.5 px-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-muted-foreground">{dayjs(msg.createdAt).format('HH:mm')}</span>
          {isMine && (
            isRead
              ? <CheckCheck className="h-3 w-3 text-primary" />
              : <Check className="h-3 w-3 text-muted-foreground/60" />
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingBubble({ name }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        {name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
