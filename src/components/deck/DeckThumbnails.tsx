import { useState } from 'react'
import type { Frame } from '../../../shared/types'
import { LAYOUT_DEFINITIONS, type DeckLayoutRole, parseSlideSpec } from './deckTemplates'
import { Button } from '../ui/button'
import { PlusIcon, TrashIcon, CopyIcon, ArrowUpIcon, ChevronDownIcon } from '../ui/icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'

interface DeckThumbnailsProps {
  frames: Frame[]
  selectedId: string | null
  onSelect: (frameId: string) => void
  onAddSlide: (layout: DeckLayoutRole) => void
  onDuplicateSlide: (frame: Frame) => void
  onDeleteSlide: (frameId: string) => void
  onMoveSlide: (index: number, direction: 'up' | 'down') => void
}

export function DeckThumbnails({
  frames,
  selectedId,
  onSelect,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
}: DeckThumbnailsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <aside className="flex h-full w-[230px] flex-none flex-col border-r border-line bg-surface select-none shadow-xs">
      {/* Thumbnails Header */}
      <div className="flex h-12 flex-none items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[13px] font-bold text-ink">Slides</span>
          <span className="rounded-full bg-paper-deep px-1.5 py-0.2 font-mono text-[10.5px] font-bold text-ink-faint">
            {frames.length}
          </span>
        </div>

        {/* Add Slide Menu */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 gap-1 text-[11px] font-semibold border-brand/30 bg-brand/5 text-accent-ink hover:bg-brand/15"
              title="Add New Slide"
              aria-label="Add New Slide"
            >
              <PlusIcon className="size-3" />
              <span>Slide</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">
              Add Slide Layout
            </div>
            {LAYOUT_DEFINITIONS.map((layout) => (
              <DropdownMenuItem
                key={layout.id}
                onSelect={() => onAddSlide(layout.id)}
                className="flex flex-col items-start py-1.5"
              >
                <div className="text-[12px] font-semibold text-ink">{layout.label}</div>
                <div className="text-[10px] text-ink-faint">{layout.description}</div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Slide Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {frames.map((frame, index) => {
          const isSelected = frame.id === selectedId
          const spec = parseSlideSpec(frame.html)
          const title = spec.data.title || frame.name || `Slide ${index + 1}`

          return (
            <div
              key={frame.id}
              onClick={() => onSelect(frame.id)}
              className={`group relative flex flex-col rounded-xl border p-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-brand bg-brand/5 shadow-xs ring-1.5 ring-brand'
                  : 'border-line/70 hover:border-ink-faint/80 hover:bg-paper-deep/50'
              }`}
            >
              {/* Slide Meta Line */}
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="font-mono text-[10.5px] font-bold text-ink-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="rounded bg-paper-deep px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-faint">
                  {spec.layout}
                </span>
              </div>

              {/* Slide 16:9 Thumbnail Preview */}
              <div className="relative aspect-video w-full rounded-lg border border-line/60 bg-black/10 overflow-hidden flex items-center justify-center pointer-events-none mb-1.5 shadow-2xs">
                <iframe
                  title={title}
                  srcDoc={frame.html}
                  tabIndex={-1}
                  className="pointer-events-none absolute inset-0 size-full border-none origin-top-left"
                  style={{
                    width: '1920px',
                    height: '1080px',
                    transform: `scale(${210 / 1920})`,
                    transformOrigin: '0 0',
                  }}
                />
              </div>

              {/* Title & Quick Actions */}
              <div className="flex items-center justify-between min-w-0 pt-0.5">
                <div className="truncate text-[11px] font-semibold text-ink leading-tight flex-1 mr-1">{title}</div>

                {/* Hover Actions Toolbar */}
                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="bare"
                    size="icon-sm"
                    className="size-5 rounded text-ink-faint hover:text-ink disabled:opacity-20"
                    disabled={index === 0}
                    onClick={() => onMoveSlide(index, 'up')}
                    title="Move slide up"
                  >
                    <ArrowUpIcon className="size-2.5" />
                  </Button>
                  <Button
                    variant="bare"
                    size="icon-sm"
                    className="size-5 rounded text-ink-faint hover:text-ink disabled:opacity-20"
                    disabled={index === frames.length - 1}
                    onClick={() => onMoveSlide(index, 'down')}
                    title="Move slide down"
                  >
                    <ChevronDownIcon className="size-2.5" />
                  </Button>
                  <Button
                    variant="bare"
                    size="icon-sm"
                    className="size-5 rounded text-ink-faint hover:text-ink"
                    onClick={() => onDuplicateSlide(frame)}
                    title="Duplicate slide"
                  >
                    <CopyIcon className="size-2.5" />
                  </Button>
                  <Button
                    variant="bare"
                    size="icon-sm"
                    className="size-5 rounded text-accent-ink hover:bg-accent-soft"
                    onClick={() => onDeleteSlide(frame.id)}
                    title="Delete slide"
                  >
                    <TrashIcon className="size-2.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Bottom Add Slide Button */}
        <button
          type="button"
          onClick={() => onAddSlide('cover')}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line/90 py-2.5 text-[11.5px] font-semibold text-ink-faint hover:border-brand hover:text-accent-ink hover:bg-brand/5 transition-colors"
        >
          <PlusIcon className="size-3.5" />
          <span>Add New Slide</span>
        </button>
      </div>
    </aside>
  )
}
