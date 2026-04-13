/**
 * PanoramaViewer — tích hợp @photo-sphere-viewer/core
 *
 * Props:
 *  src: string       — URL ảnh equirectangular (360°)
 *  onClose: () => void
 */
import { useEffect, useRef } from 'react'
import { X, Maximize, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

export function PanoramaViewer({ src, onClose }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  useEffect(() => {
    if (!src || !containerRef.current) return

    let viewer = null

    // Lazy-load Viewer để tránh SSR issues
    import('@photo-sphere-viewer/core').then(({ Viewer }) => {
      // Cần import CSS một lần
      import('@photo-sphere-viewer/core/index.css').catch(() => {})

      viewer = new Viewer({
        container: containerRef.current,
        panorama: src,
        navbar: [
          'zoom',
          'move',
          'fullscreen',
        ],
        defaultZoomLvl: 50,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        loadingImg: null,
        loadingTxt: 'Đang tải ảnh 360°...',
      })

      viewerRef.current = viewer
    }).catch((err) => {
      console.error('PanoramaViewer load error:', err)
    })

    return () => {
      try { viewer?.destroy() } catch {}
      viewerRef.current = null
    }
  }, [src])

  if (!src) return null

  return (
    <Dialog open={!!src} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-screen h-screen p-0 border-0 rounded-none bg-black"
        hideClose
      >
        {/* Close button overlay */}
        <div className="absolute right-4 top-4 z-50">
          <Button
            variant="secondary"
            size="icon"
            onClick={onClose}
            className="rounded-full bg-black/60 text-white hover:bg-black/80 border-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tip overlay */}
        <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2">
          <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
            🖱️ Kéo để xoay · Scroll để zoom
          </div>
        </div>

        {/* Viewer container */}
        <div ref={containerRef} className="h-full w-full" />
      </DialogContent>
    </Dialog>
  )
}
