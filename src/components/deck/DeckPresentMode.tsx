import { useEffect, useMemo, useRef, useState } from 'react'
import type { Frame } from '../../../shared/types'
import { Button } from '../ui/button'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '../ui/icons'

interface DeckPresentModeProps {
  frames: Frame[]
  initialIndex?: number
  onClose: () => void
}

export function DeckPresentMode({ frames, initialIndex = 0, onClose }: DeckPresentModeProps) {
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, Math.min(initialIndex, frames.length - 1)))
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const activeFrame = frames[currentIndex]
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function onResize() {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.stopPropagation()
        setCurrentIndex((i) => Math.min(i + 1, frames.length - 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.stopPropagation()
        setCurrentIndex((i) => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [frames.length, onClose])

  // Update iframe content when active frame changes
  useEffect(() => {
    if (!iframeRef.current || !activeFrame) return
    iframeRef.current.srcdoc = activeFrame.html
  }, [activeFrame])

  const scale = useMemo(() => {
    if (!activeFrame) return 1
    const frameW = activeFrame.width || 1920
    const frameH = activeFrame.height || 1080
    return Math.min(viewport.w / frameW, viewport.h / frameH)
  }, [activeFrame, viewport])

  if (!activeFrame || frames.length === 0) return null

  const frameW = activeFrame.width || 1920
  const frameH = activeFrame.height || 1080

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#07090E] select-none"
      role="dialog"
      aria-label="Full-screen presentation"
    >
      {/* Slide Canvas */}
      <div
        className="relative overflow-hidden bg-black shadow-2xl transition-transform duration-200"
        style={{
          width: Math.round(frameW * scale),
          height: Math.round(frameH * scale),
        }}
      >
        <iframe
          ref={iframeRef}
          className="block border-none bg-transparent"
          title={activeFrame.name}
          sandbox="allow-scripts"
          srcDoc={activeFrame.html}
          style={{
            width: frameW,
            height: frameH,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        />
      </div>

      {/* Floating Bottom Navigation Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 rounded-full border border-white/15 bg-black/75 px-3 py-1.5 backdrop-blur-md shadow-2xl text-white">
        <Button
          variant="inverse"
          size="icon-sm"
          className="rounded-full size-8 hover:bg-white/20 disabled:opacity-30"
          disabled={currentIndex <= 0}
          onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          aria-label="Previous slide"
          title="Previous slide (Left arrow)"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        <span className="px-2.5 text-xs font-semibold tabular-nums text-slate-300">
          {currentIndex + 1} / {frames.length}
        </span>

        <Button
          variant="inverse"
          size="icon-sm"
          className="rounded-full size-8 hover:bg-white/20 disabled:opacity-30"
          disabled={currentIndex >= frames.length - 1}
          onClick={() => setCurrentIndex((i) => Math.min(i + 1, frames.length - 1))}
          aria-label="Next slide"
          title="Next slide (Right arrow / Space)"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      {/* Close Button Top Right */}
      <Button
        variant="inverse"
        size="icon"
        className="absolute top-4 right-4 rounded-full size-9 bg-white/10 text-white hover:bg-white/25"
        aria-label="Exit presentation"
        title="Exit presentation (Esc)"
        onClick={onClose}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
