import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { api } from '../../lib/api'
import type { Frame } from '../../../shared/types'
import {
  type DeckLayoutRole,
  type DeckSlideSpec,
  createStarterDeck,
  getDefaultSlideData,
  parseSlideSpec,
  renderDeckSlideHtml,
} from './deckTemplates'
import { DeckThumbnails } from './DeckThumbnails'
import { DeckConsole } from './DeckConsole'
import { SlideTextEditor } from './SlideTextEditor'
import { PromptBar } from '../PromptBar'
import { Button } from '../ui/button'
import { SparkIcon } from '../ui/icons'

interface DeckViewProps {
  canvasId: string
  onPresent: () => void
  onOpenAiModal: () => void
  consoleOpen?: boolean
  onToggleConsole?: () => void
}

export function DeckView({
  canvasId,
  onPresent,
  onOpenAiModal,
  consoleOpen: propConsoleOpen,
  onToggleConsole,
}: DeckViewProps) {
  const canvas = useStore((s) => s.canvas)
  const [internalConsoleOpen, setInternalConsoleOpen] = useState(true)
  const consoleOpen = propConsoleOpen ?? internalConsoleOpen
  const toggleConsole = onToggleConsole ?? (() => setInternalConsoleOpen((v) => !v))

  // Filter or sort frames: sorted by X position (left to right)
  const frames = useMemo(() => {
    const all = canvas?.frames ?? []
    return [...all].sort((a, b) => a.x - b.x)
  }, [canvas?.frames])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = selectedId && frames.some((f) => f.id === selectedId) ? selectedId : (frames[0]?.id ?? null)
  const selectedFrame = frames.find((f) => f.id === activeId) ?? frames[0] ?? null
  const selectedIndex = selectedFrame ? frames.indexOf(selectedFrame) : -1

  // Inline text edit mode (click-to-select text on canvas)
  const [editMode, setEditMode] = useState(false)

  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const stageContainerRef = useRef<HTMLDivElement>(null)

  // Keep Doop store selectedId in sync so PromptBar scopes to the active slide!
  useEffect(() => {
    if (activeId) {
      useStore.getState().select(activeId)
    }
  }, [activeId])

  // Responsive scale for center stage
  useEffect(() => {
    function onResize() {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const stageScale = useMemo(() => {
    // 1920x1080 native slide canvas
    // Deduct space for left thumbnail bar (230px), right console (320px if open), and stage paddings
    const availableW = viewport.w - 230 - (consoleOpen ? 320 : 0) - 48
    // Deduct top bar (56px) and clean dock space for promptbar (100px)
    const availableH = viewport.h - 56 - 100
    if (availableW <= 0 || availableH <= 0) return 0.4
    return Math.min(availableW / 1920, availableH / 1080, 1)
  }, [viewport, consoleOpen])

  // Keyboard navigation for slide switching
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        const nextFrame = frames[selectedIndex + 1]
        if (nextFrame) {
          setSelectedId(nextFrame.id)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        const prevFrame = frames[selectedIndex - 1]
        if (prevFrame) {
          setSelectedId(prevFrame.id)
        }
      } else if (e.key === 'F5' || (e.key.toLowerCase() === 'p' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        onPresent()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames, selectedIndex, onPresent])

  async function handleAddSlide(layout: DeckLayoutRole) {
    const lastX = frames.length > 0 ? Math.max(...frames.map((f) => f.x + f.width)) : 0
    const newX = lastX > 0 ? lastX + 120 : 0

    const defaultData = getDefaultSlideData(layout)
    const html = renderDeckSlideHtml({
      layout,
      theme: 'modern-dark',
      data: defaultData,
    })

    const frame = await api.createFrame(canvasId, {
      name: `Slide ${frames.length + 1} - ${layout.toUpperCase()}`,
      html,
      width: 1920,
      height: 1080,
      x: newX,
      y: 0,
    })

    setSelectedId(frame.id)
  }

  async function handleCreateStarterDeck() {
    const starter = createStarterDeck()
    let currentX = 0
    let firstId: string | null = null

    for (let i = 0; i < starter.length; i++) {
      const spec = starter[i]
      if (!spec) continue
      const html = renderDeckSlideHtml(spec)
      const frame = await api.createFrame(canvasId, {
        name: `Slide ${i + 1} - ${spec.layout.toUpperCase()}`,
        html,
        width: 1920,
        height: 1080,
        x: currentX,
        y: 0,
      })
      if (!firstId) firstId = frame.id
      currentX += 1920 + 120
    }

    if (firstId) setSelectedId(firstId)
  }

  async function handleUpdateFrameHtml(frameId: string, newHtml: string) {
    await api.updateFrame(frameId, { html: newHtml })
  }

  /**
   * Called by SlideTextEditor when a region's text is committed.
   * fieldPath matches the region IDs defined in buildRegions().
   */
  async function handleInlineTextCommit(frameId: string, spec: DeckSlideSpec, fieldPath: string, value: string) {
    const next = structuredClone(spec)

    // ── Simple top-level fields ──────────────────────────────────────────────
    if (fieldPath === 'badge') {
      next.data.badge = value
    } else if (fieldPath === 'title') {
      next.data.title = value
    } else if (fieldPath === 'subtitle') {
      next.data.subtitle = value
    } else if (fieldPath === 'author') {
      next.data.author = value
    } else if (fieldPath === 'date') {
      next.data.date = value
    } else if (fieldPath === 'description') {
      next.data.description = value
    } else if (fieldPath === 'contact_email') {
      next.data.contact = { ...next.data.contact, email: value }
    } else if (fieldPath === 'contact_web') {
      next.data.contact = { ...next.data.contact, web: value }
    }
    // ── Quote ─────────────────────────────────────────────────────────────────
    else if (fieldPath === 'quote_text') {
      next.data.quote = { ...next.data.quote!, text: value }
    } else if (fieldPath === 'quote_author') {
      next.data.quote = { ...next.data.quote!, author: value }
    } else if (fieldPath === 'quote_role') {
      next.data.quote = { ...next.data.quote!, role: value }
    }
    // ── Metrics ───────────────────────────────────────────────────────────────
    else if (fieldPath.startsWith('metric_')) {
      const parts = fieldPath.split('_') // metric_0_value → ['metric','0','value']
      const idx = parseInt(parts[1] ?? '0', 10)
      const key = parts[2] as 'value' | 'label' | 'change'
      if (next.data.metrics && next.data.metrics[idx]) {
        next.data.metrics = [...next.data.metrics]
        next.data.metrics[idx] = { ...next.data.metrics[idx]!, [key]: value }
      }
    }
    // ── Columns / Split / Agenda ───────────────────────────────────────────────
    else if (fieldPath.startsWith('col_')) {
      // col_0_title | col_1_bullet_2
      const parts = fieldPath.split('_')
      const ci = parseInt(parts[1] ?? '0', 10)
      if (next.data.columns && next.data.columns[ci]) {
        next.data.columns = [...next.data.columns]
        const col = { ...next.data.columns[ci]! }
        if (parts[2] === 'title') {
          col.title = value
        } else if (parts[2] === 'bullet') {
          const bi = parseInt(parts[3] ?? '0', 10)
          col.bullets = [...col.bullets]
          col.bullets[bi] = value
        }
        next.data.columns[ci] = col
      }
    }
    // ── SWOT ──────────────────────────────────────────────────────────────────
    else if (fieldPath.startsWith('swot_')) {
      // swot_strengths_0 | swot_weaknesses_1
      const parts = fieldPath.split('_')
      const quad = parts[1] as keyof NonNullable<DeckSlideSpec['data']['swot']>
      const idx = parseInt(parts[2] ?? '0', 10)
      if (next.data.swot && next.data.swot[quad]) {
        next.data.swot = { ...next.data.swot }
        const arr = [...next.data.swot[quad]]
        arr[idx] = value
        next.data.swot[quad] = arr
      }
    }
    // ── Roadmap phases ────────────────────────────────────────────────────────
    else if (fieldPath.startsWith('phase_')) {
      // phase_0_title | phase_1_desc
      const parts = fieldPath.split('_')
      const idx = parseInt(parts[1] ?? '0', 10)
      const key = parts[2] as 'title' | 'desc'
      if (next.data.timeline && next.data.timeline[idx]) {
        next.data.timeline = [...next.data.timeline]
        next.data.timeline[idx] = { ...next.data.timeline[idx]!, [key]: value }
      }
    }

    const newHtml = renderDeckSlideHtml(next)
    await api.updateFrame(frameId, { html: newHtml })
  }

  async function handleDuplicateSlide(sourceFrame: Frame) {
    const lastX = frames.length > 0 ? Math.max(...frames.map((f) => f.x + f.width)) : 0
    const frame = await api.createFrame(canvasId, {
      name: `${sourceFrame.name} (Copy)`,
      html: sourceFrame.html,
      width: sourceFrame.width,
      height: sourceFrame.height,
      x: lastX + 120,
      y: 0,
    })
    setSelectedId(frame.id)
  }

  async function handleDeleteSlide(frameId: string) {
    if (frames.length <= 1) {
      alert('A deck must have at least one slide.')
      return
    }
    const idx = frames.findIndex((f) => f.id === frameId)
    await api.deleteFrame(frameId)
    const remaining = frames.filter((f) => f.id !== frameId)
    if (remaining.length > 0) {
      const nextIdx = Math.min(idx, remaining.length - 1)
      setSelectedId(remaining[nextIdx]?.id ?? null)
    }
  }

  async function handleMoveSlide(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= frames.length) return

    const source = frames[index]
    const target = frames[targetIndex]
    if (!source || !target) return

    // Swap their X positions to preserve canvas spatial layout
    const sourceX = source.x
    const targetX = target.x

    await Promise.all([api.updateFrame(source.id, { x: targetX }), api.updateFrame(target.id, { x: sourceX })])
  }

  async function handleApplyThemeToAll(themeId: string) {
    for (const f of frames) {
      const spec = parseSlideSpec(f.html)
      const newHtml = renderDeckSlideHtml({
        ...spec,
        theme: themeId,
      })
      await api.updateFrame(f.id, { html: newHtml })
    }
  }

  return (
    <div className="flex size-full overflow-hidden bg-paper select-none">
      {/* Left Thumbnails Strip */}
      <DeckThumbnails
        frames={frames}
        selectedId={activeId}
        onSelect={setSelectedId}
        onAddSlide={handleAddSlide}
        onDuplicateSlide={handleDuplicateSlide}
        onDeleteSlide={handleDeleteSlide}
        onMoveSlide={handleMoveSlide}
      />

      {/* Center Presentation Stage */}
      <main
        ref={stageContainerRef}
        className="relative flex flex-1 flex-col items-center justify-between overflow-hidden bg-[#0A0D14] p-4 pb-4"
      >
        {frames.length === 0 ? (
          /* Empty State Onboarding */
          <div className="m-auto flex max-w-md flex-col items-center text-center p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
            <div className="size-12 rounded-full bg-brand/20 text-brand flex items-center justify-center mb-4">
              <SparkIcon className="size-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">No slides yet</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Generate a custom presentation deck with AI, or start from a starter template.
            </p>
            <div className="flex flex-col w-full gap-2.5">
              <Button variant="primary" className="w-full text-xs font-semibold py-2.5 gap-2" onClick={onOpenAiModal}>
                <SparkIcon className="size-4" />
                Generate Custom Deck with AI
              </Button>
              <Button
                variant="default"
                className="w-full text-xs font-semibold text-white border-white/20 hover:bg-white/10"
                onClick={handleCreateStarterDeck}
              >
                Load 7-Slide Starter Template
              </Button>
            </div>
          </div>
        ) : selectedFrame ? (
          /* Active Slide 16:9 Canvas Stage */
          <>
            <div className="flex flex-1 items-center justify-center w-full min-h-0 pt-1 pb-2">
              <div
                className="relative overflow-hidden rounded-xl bg-black shadow-2xl border border-white/15 transition-transform duration-150"
                style={{
                  width: Math.round(1920 * stageScale),
                  height: Math.round(1080 * stageScale),
                }}
              >
                <iframe
                  key={selectedFrame.id}
                  title={selectedFrame.name}
                  sandbox="allow-scripts"
                  srcDoc={selectedFrame.html}
                  className="block border-none bg-transparent origin-top-left"
                  style={{
                    width: '1920px',
                    height: '1080px',
                    transform: `scale(${stageScale})`,
                    transformOrigin: '0 0',
                  }}
                />

                {/* Click-to-edit text overlay */}
                {(() => {
                  const spec = parseSlideSpec(selectedFrame.html)
                  const sw = Math.round(1920 * stageScale)
                  const sh = Math.round(1080 * stageScale)
                  return (
                    <SlideTextEditor
                      spec={spec}
                      scale={stageScale}
                      stageWidth={sw}
                      stageHeight={sh}
                      enabled={editMode}
                      onCommit={(fieldPath, value) => handleInlineTextCommit(selectedFrame.id, spec, fieldPath, value)}
                    />
                  )
                })()}

                {/* Edit Mode Toggle button — bottom-right of stage */}
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  title={editMode ? 'Exit text editing mode' : 'Click to edit text on slide'}
                  className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-lg transition-all"
                  style={{
                    background: editMode ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.08)',
                    color: editMode ? '#fff' : 'rgba(255,255,255,0.55)',
                    border: editMode ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <span style={{ fontSize: 13 }}>✎</span>
                  {editMode ? 'Editing' : 'Edit Text'}
                </button>
              </div>
            </div>

            {/* Bottom Dock: Single, Authentic AI PromptBar Scoped to Active Slide */}
            <div className="flex-none flex justify-center w-full max-w-2xl z-20">
              <PromptBar canvasId={canvasId} className="relative bottom-0 left-auto translate-x-0 w-full shadow-2xl" />
            </div>
          </>
        ) : null}
      </main>

      {/* Right Slide Console (Content | Layout | Theme) */}
      {consoleOpen && (
        <DeckConsole
          frame={selectedFrame}
          onUpdateFrame={handleUpdateFrameHtml}
          onApplyThemeToAll={handleApplyThemeToAll}
          onClose={toggleConsole}
        />
      )}
    </div>
  )
}
