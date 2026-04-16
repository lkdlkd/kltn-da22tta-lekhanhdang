/**
 * PanoramaViewer — tích hợp @photo-sphere-viewer/core v5
 *
 * Props:
 *  src: string        — URL ảnh equirectangular (360°)
 *  onClose: () => void
 */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PanoramaViewer({ src, onClose }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState(false)

  // Step 1: mount the overlay first, then initialize viewer on next tick
  useEffect(() => {
    if (!src) return
    setMounted(true)
    setError(false)
    return () => setMounted(false)
  }, [src])

  // Step 2: init viewer after container is in DOM with real dimensions
  useEffect(() => {
    if (!mounted || !containerRef.current) return

    let viewer = null
    let cancelled = false

    // Small delay to ensure the container has rendered with real pixel dimensions
    const timer = setTimeout(async () => {
      if (cancelled || !containerRef.current) return
      try {
        // Import CSS once
        try {
          await import('@photo-sphere-viewer/core/index.css')
        } catch { /* CSS already imported or not needed */ }

        const { Viewer } = await import('@photo-sphere-viewer/core')
        if (cancelled || !containerRef.current) return

        viewer = new Viewer({
          container: containerRef.current,
          panorama: src,
          navbar: ['zoom', 'move', 'fullscreen'],
          defaultZoomLvl: 50,
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
          loadingTxt: 'Đang tải ảnh 360°...',
          size: {
            width: '100%',
            height: '100%',
          },
        })

        viewerRef.current = viewer
      } catch (err) {
        console.error('PanoramaViewer init error:', err)
        setError(true)
      }
    }, 100)

    return () => {
      cancelled = true
      clearTimeout(timer)
      try { viewerRef.current?.destroy() } catch { }
      viewerRef.current = null
    }
  }, [mounted, src])

  if (!src) return null

  return (
    // Full-screen overlay — outside Dialog to avoid shadcn transform issues
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ isolation: 'isolate' }}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
        {/* Tip */}
        <div className="rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-xs text-white/80 backdrop-blur-sm pointer-events-auto">
          🖱️ Kéo để xoay · Cuộn để zoom
        </div>

        {/* Close */}
        <Button
          variant="secondary"
          size="icon"
          onClick={onClose}
          className="rounded-full bg-black/60 text-white hover:bg-black/80 border border-white/20 pointer-events-auto"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Đóng</span>
        </Button>
      </div>

      {/* Viewer or error state */}
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/70">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm">Không thể tải ảnh 360°</p>
          <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10" onClick={onClose}>
            Đóng
          </Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 w-full"
          style={{ minHeight: 0 }}        /* let flexbox control height */
        />
      )}
    </div>
  )
}
