import { useState, useCallback } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({ value = 0, onChange, readOnly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={cn(
            'transition-colors',
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          )}
          aria-label={`${star} sao`}
        >
          <Star
            className={cn(
              iconSize,
              star <= active ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
            )}
          />
        </button>
      ))}
    </div>
  )
}
