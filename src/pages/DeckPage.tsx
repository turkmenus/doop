import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { connect, disconnect } from '../lib/ws'
import { ensureTab } from '../lib/desktop'
import { getIdentity } from '../lib/identity'
import { navigate } from '../App'
import { TopBar, TopBarHome, TopBarTitle, BarDivider } from '../components/TopBar'
import { Segmented, SegmentedItem } from '../components/ui/segmented'
import { Button } from '../components/ui/button'
import { Tooltip } from '../components/ui/tooltip'
import { PeerAvatars } from '../components/PeerAvatars'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  PlayIcon,
  SparkIcon,
  DownloadIcon,
  GridIcon,
  PulseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PanelCollapseRightIcon,
  LayersIcon,
  UsersIcon,
} from '../components/ui/icons'
import { DeckView } from '../components/deck/DeckView'
import { Board } from '../components/Board'
import { DeckPresentMode } from '../components/deck/DeckPresentMode'
import { DeckAiModal } from '../components/deck/DeckAiModal'
import { exportDeckToPptx } from '../components/deck/exportPptx'
import { exportDeckToHtml } from '../components/deck/exportHtml'
import { ActivityPanel } from '../components/ActivityPanel'
import { LimitWall } from '../components/TeamAllowance'
import { useIsMobile } from '../hooks/use-mobile'
import type { DeckSlideSpec } from '../components/deck/deckTemplates'
import { renderDeckSlideHtml } from '../components/deck/deckTemplates'

export function DeckPage({ canvasId }: { canvasId: string }) {
  const canvas = useStore((s) => s.canvas)
  const presences = useStore((s) => s.presences)
  const isMobile = useIsMobile()
  const limitWall = useStore((s) => s.limitWall)
  const selectedId = useStore((s) => s.selectedId)

  const [view, setView] = useState<'deck' | 'board'>(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('view') === 'board') return 'board'
    return 'deck'
  })
  const [presenting, setPresenting] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(true)

  // Keep desktop tab title in sync
  useEffect(() => {
    if (canvas?.id === canvasId) ensureTab(canvas.id, canvas.name)
  }, [canvas, canvasId])

  // Connect to live WebSocket for real-time collaboration & agent updates
  useEffect(() => {
    connect(canvasId)
    return () => {
      disconnect()
      useStore.getState().setCanvas(null)
      useStore.getState().setPresences([])
      useStore.getState().setCanvasNotFound(false)
      useStore.getState().select(null)
    }
  }, [canvasId])

  // Sorted list of frames
  const frames = useMemo(() => {
    const all = canvas?.frames ?? []
    return [...all].sort((a, b) => a.x - b.x)
  }, [canvas?.frames])

  const currentIndex = frames.findIndex((f) => f.id === selectedId)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0

  function handlePrevSlide() {
    if (safeIndex > 0 && frames[safeIndex - 1]) {
      useStore.getState().select(frames[safeIndex - 1]!.id)
    }
  }

  function handleNextSlide() {
    if (safeIndex < frames.length - 1 && frames[safeIndex + 1]) {
      useStore.getState().select(frames[safeIndex + 1]!.id)
    }
  }

  const me = getIdentity()
  const others = useMemo(
    () => Object.values(presences).filter((p) => p.clientId !== me.clientId),
    [presences, me.clientId],
  )

  async function handleExportPptx() {
    if (frames.length === 0) return
    setIsExporting(true)
    try {
      await exportDeckToPptx(canvas?.name || 'Presentation', frames)
    } catch (err) {
      console.error('PPTX export error:', err)
      alert('PPTX export failed. Check console for details.')
    } finally {
      setIsExporting(false)
    }
  }

  function handleExportHtml() {
    if (frames.length === 0) return
    exportDeckToHtml(canvas?.name || 'Presentation', frames)
  }

  async function handleApplyGeneratedSpecs(specs: DeckSlideSpec[]) {
    const lastX = frames.length > 0 ? Math.max(...frames.map((f) => f.x + f.width)) : 0
    let currentX = lastX > 0 ? lastX + 120 : 0
    let firstCreatedId: string | null = null

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]
      if (!spec) continue
      const html = renderDeckSlideHtml(spec)
      const frame = await api.createFrame(canvasId, {
        name: `Slide ${frames.length + i + 1} - ${spec.layout.toUpperCase()}`,
        html,
        width: 1920,
        height: 1080,
        x: currentX,
        y: 0,
      })
      if (!firstCreatedId) firstCreatedId = frame.id
      currentX += 1920 + 120
    }

    if (firstCreatedId) {
      useStore.getState().select(firstCreatedId)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-paper">
      {/* Top Bar: Clean, Focused Presentation Workspace */}
      <TopBar>
        {/* Left: Home link, Title */}
        <TopBarHome label="All decks" to="/decks" />
        <TopBarTitle
          value={canvas?.name ?? ''}
          onCommit={(name) => api.renameCanvas(canvasId, name)}
          placeholder="Untitled Deck"
          loading={!canvas}
        />

        {/* Slide Pager in TopBar (Active in Deck View) */}
        {view === 'deck' && frames.length > 0 && (
          <div className="flex items-center gap-1 rounded-md border border-line bg-paper-deep/60 px-1.5 py-0.5 shadow-2xs">
            <Button
              variant="bare"
              size="icon-sm"
              className="size-6 rounded hover:bg-surface text-ink-soft hover:text-ink disabled:opacity-30"
              disabled={safeIndex <= 0}
              onClick={handlePrevSlide}
              title="Previous slide (Left Arrow)"
            >
              <ChevronLeftIcon className="size-3" />
            </Button>
            <span className="font-mono text-[11.5px] font-semibold text-ink px-1 tabular-nums">
              {safeIndex + 1} / {frames.length}
            </span>
            <Button
              variant="bare"
              size="icon-sm"
              className="size-6 rounded hover:bg-surface text-ink-soft hover:text-ink disabled:opacity-30"
              disabled={safeIndex >= frames.length - 1}
              onClick={handleNextSlide}
              title="Next slide (Right Arrow)"
            >
              <ChevronRightIcon className="size-3" />
            </Button>
          </div>
        )}

        {/* Center: View Switcher ([ Deck | Team Board ]) */}
        <Segmented
          value={view}
          onValueChange={(v) => {
            const nextView = v as 'deck' | 'board'
            setView(nextView)
            if (nextView === 'board') {
              history.replaceState(null, '', `/d/${canvasId}?view=board`)
            } else {
              history.replaceState(null, '', `/d/${canvasId}`)
            }
          }}
        >
          <SegmentedItem value="deck">
            <span className="flex items-center gap-1.5 font-medium">
              <LayersIcon className="size-3.5" />
              <span>Deck</span>
            </span>
          </SegmentedItem>
          <SegmentedItem value="board">
            <span className="flex items-center gap-1.5 font-medium">
              <UsersIcon className="size-3.5" />
              <span>Team Board</span>
            </span>
          </SegmentedItem>
        </Segmented>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-2 max-md:hidden">
          {/* Switch to Infinite Spatial Canvas */}
          <Tooltip label="Open in Infinite Canvas view" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink hover:bg-paper-deep"
              onClick={() => navigate(`/c/${canvasId}`)}
            >
              <GridIcon className="size-3.5" />
              Canvas
            </Button>
          </Tooltip>

          <BarDivider />

          {view === 'deck' && (
            <>
              {/* AI Generator */}
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 text-xs font-semibold border-brand/30 bg-brand/5 text-accent-ink hover:bg-brand/15"
                onClick={() => setShowAiModal(true)}
                title="Generate Deck with AI"
              >
                <SparkIcon className="size-3.5 text-accent-ink" />
                AI Generator
              </Button>

              {/* Present */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-semibold hover:bg-paper-deep text-ink"
                disabled={frames.length === 0}
                onClick={() => setPresenting(true)}
                title="Start Fullscreen Presentation (F5)"
              >
                <PlayIcon className="size-3.5 text-accent-ink" />
                Present
              </Button>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1 text-xs font-semibold"
                    disabled={frames.length === 0 || isExporting}
                  >
                    <DownloadIcon className="size-3.5" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={handleExportPptx} className="flex flex-col items-start py-2">
                    <div className="text-[12.5px] font-semibold text-ink">Download PPTX (.pptx)</div>
                    <div className="text-[10.5px] text-ink-faint">Editable Microsoft PowerPoint slides</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleExportHtml} className="flex flex-col items-start py-2">
                    <div className="text-[12.5px] font-semibold text-ink">Standalone HTML (.html)</div>
                    <div className="text-[10.5px] text-ink-faint">Interactive offline web presentation</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <BarDivider />

              {/* Slide Inspector Toggle */}
              <Tooltip label={consoleOpen ? 'Hide Slide Inspector' : 'Show Slide Inspector'} side="bottom">
                <Button
                  variant={consoleOpen ? 'default' : 'ghost'}
                  size="sm"
                  className={`gap-1.5 text-xs font-semibold transition-all ${
                    consoleOpen
                      ? 'border-line bg-paper-deep text-ink shadow-2xs'
                      : 'text-ink-soft hover:text-ink hover:bg-paper-deep'
                  }`}
                  onClick={() => setConsoleOpen(!consoleOpen)}
                >
                  <PanelCollapseRightIcon className="size-3.5" />
                  Inspector
                </Button>
              </Tooltip>

              <BarDivider />
            </>
          )}

          {/* Presence Avatars */}
          <div className="flex items-center px-0.5" title={others.map((p) => p.name).join(', ') || 'Just you here'}>
            <PeerAvatars others={others} />
          </div>

          {/* Activity Panel Button */}
          <Tooltip label="Activity & Tasks" side="bottom">
            <Button
              variant="bare"
              size="icon-sm"
              className="size-8 hover:bg-paper-deep text-ink-soft hover:text-ink"
              onClick={() => setShowActivity(!showActivity)}
            >
              <PulseIcon className="size-4" />
            </Button>
          </Tooltip>
        </div>
      </TopBar>

      {/* Main Body */}
      <div className="relative flex-1 overflow-hidden">
        {view === 'board' ? (
          /* Authentic Doop Agent Team Board */
          <Board canvasId={canvasId} />
        ) : (
          /* Focused Deck View Mode */
          <DeckView
            canvasId={canvasId}
            onPresent={() => setPresenting(true)}
            onOpenAiModal={() => setShowAiModal(true)}
            consoleOpen={consoleOpen}
            onToggleConsole={() => setConsoleOpen(!consoleOpen)}
          />
        )}

        {/* Activity Panel */}
        {!isMobile && showActivity && <ActivityPanel onClose={() => setShowActivity(false)} />}
      </div>

      {/* Fullscreen Presentation Mode Overlay */}
      {presenting && <DeckPresentMode frames={frames} initialIndex={0} onClose={() => setPresenting(false)} />}

      {/* AI Deck Generator Modal */}
      <DeckAiModal
        canvasId={canvasId}
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        onGenerate={handleApplyGeneratedSpecs}
      />

      {/* Allowance / Limit Wall */}
      {limitWall && (
        <LimitWall
          canvasId={canvasId}
          onClose={() => useStore.getState().setLimitWall(false)}
          onOpenConnect={() => useStore.getState().setLimitWall(false)}
        />
      )}
    </div>
  )
}
