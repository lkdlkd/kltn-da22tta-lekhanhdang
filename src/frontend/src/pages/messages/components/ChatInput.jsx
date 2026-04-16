import { useRef } from 'react'
import { Send, Paperclip, CalendarPlus, X, Film, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onTyping,
  mediaFiles,
  setMediaFiles,
  uploading,
  hasRoom,
  onOpenBooking,
  disabled,
}) {
  const fileInputRef = useRef(null)
  const mediaPreviews = mediaFiles.map((f) => ({ url: URL.createObjectURL(f), type: f.type }))

  return (
    <div className="border-t bg-background shrink-0">
      {/* Media preview strip */}
      {mediaFiles.length > 0 && (
        <div className="flex gap-2 px-3 pt-2.5 pb-2 overflow-x-auto">
          {mediaPreviews.map((p, i) => (
            <div key={i} className="relative shrink-0">
              {p.type.startsWith('image') ? (
                <img src={p.url} alt="" className="h-16 w-16 rounded-xl object-cover border" />
              ) : (
                <div className="h-16 w-16 flex flex-col items-center justify-center rounded-xl border bg-muted gap-1">
                  <Film className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Video</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={onSubmit} className="flex items-center gap-1.5 px-3 py-2.5">
        {/* Hidden file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm"
          multiple
          className="sr-only"
          onChange={(e) => {
            setMediaFiles((p) => [...p, ...Array.from(e.target.files || [])].slice(0, 5))
            e.target.value = ''
          }}
        />

        {/* Attach */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          title="Đính kèm ảnh/video"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Book tour */}
        {hasRoom && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-primary"
            onClick={onOpenBooking}
            title="Đặt lịch xem phòng"
            disabled={disabled}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        )}

        {/* Text input */}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); onTyping() }}
          placeholder="Nhập tin nhắn..."
          disabled={disabled}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(e) }
          }}
          className={cn(
            'flex-1 rounded-full border bg-muted/50 px-4 py-2 text-sm outline-none',
            'focus:bg-background focus:ring-2 focus:ring-primary/30 transition',
            'placeholder:text-muted-foreground/60'
          )}
        />

        {/* Send */}
        <Button
          type="submit"
          size="icon"
          className="shrink-0 h-9 w-9 rounded-full"
          disabled={(!input.trim() && mediaFiles.length === 0) || uploading || disabled}
        >
          {uploading
            ? <ImageIcon className="h-4 w-4 animate-pulse" />
            : <Send className="h-4 w-4" />
          }
        </Button>
      </form>
    </div>
  )
}
