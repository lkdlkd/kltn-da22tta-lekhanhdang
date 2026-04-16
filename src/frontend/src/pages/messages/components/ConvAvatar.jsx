import { cn } from '@/lib/utils'

export function ConvAvatar({ name = '?', size = 'sm', online }) {
  const sc = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
  const dc = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
  return (
    <div className="relative shrink-0">
      <div className={cn('flex items-center justify-center rounded-full bg-primary/15 font-bold text-primary', sc)}>
        {(name || '?')[0].toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0 -right-0 rounded-full border-2 border-background',
            dc,
            online ? 'bg-emerald-500' : 'bg-muted-foreground/30'
          )}
        />
      )}
    </div>
  )
}
