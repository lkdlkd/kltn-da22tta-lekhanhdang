import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

/**
 * Sheet — side drawer do-it-yourself (không dùng Radix Dialog để tránh xung đột)
 * Props: open, onClose, side ('left'|'right'), title, children
 */
export function Sheet({ open, onClose, side = 'left', title, children }) {
  // Đóng khi bấm Escape
  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && open) onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 flex w-[85vw] max-w-sm flex-col bg-background shadow-xl',
          side === 'right' ? 'ml-auto' : 'mr-auto'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          {title && <p className="font-semibold">{title}</p>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
