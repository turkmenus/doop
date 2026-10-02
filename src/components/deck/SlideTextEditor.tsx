/**
 * SlideTextEditor – Click-to-edit overlay for the Deck slide stage.
 *
 * Renders transparent hotspot regions over the scaled iframe so users can
 * click directly on text elements (badge, title, subtitle, bullets, metrics…)
 * to select and edit them inline — exactly like PowerPoint / Keynote.
 */

import { useEffect, useRef, useState } from 'react'
import type { DeckSlideSpec } from './deckTemplates'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A single editable region in the 1920×1080 coordinate space */
export interface SlideRegion {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  value: string
  placeholder?: string
  multiline?: boolean
  fontSize?: number
  format?: 'title' | 'subtitle' | 'badge' | 'body' | 'metric' | 'label'
}

interface SlideTextEditorProps {
  spec: DeckSlideSpec
  scale: number
  stageWidth: number
  stageHeight: number
  onCommit: (fieldPath: string, value: string) => void
  enabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Region builders
// ─────────────────────────────────────────────────────────────────────────────

function buildRegions(spec: DeckSlideSpec): SlideRegion[] {
  const { layout, data } = spec
  const regions: SlideRegion[] = []

  if (data.badge !== undefined) {
    regions.push({
      id: 'badge',
      label: 'Kicker Badge',
      x: 96,
      y: 72,
      w: 480,
      h: 48,
      value: data.badge || '',
      placeholder: 'KICKER BADGE',
      format: 'badge',
      fontSize: 13,
    })
  }

  if (data.title !== undefined) {
    const titleY = layout === 'cover' ? 140 : 120
    const titleH = layout === 'cover' ? 180 : 80
    regions.push({
      id: 'title',
      label: 'Slide Title',
      x: 96,
      y: titleY,
      w: 1400,
      h: titleH,
      value: data.title || '',
      placeholder: 'Slide Title',
      format: 'title',
      fontSize: layout === 'cover' ? 72 : 46,
      multiline: true,
    })
  }

  if (data.subtitle !== undefined) {
    const subY = layout === 'cover' ? 340 : 210
    regions.push({
      id: 'subtitle',
      label: 'Subtitle',
      x: 96,
      y: subY,
      w: 1400,
      h: 80,
      value: data.subtitle || '',
      placeholder: 'Subtitle / tagline',
      format: 'subtitle',
      fontSize: layout === 'cover' ? 26 : 20,
      multiline: true,
    })
  }

  if (layout === 'cover') {
    if (data.author !== undefined) {
      regions.push({
        id: 'author',
        label: 'Presenter',
        x: 96,
        y: 890,
        w: 400,
        h: 48,
        value: data.author || '',
        placeholder: 'Presenter',
        format: 'body',
        fontSize: 18,
      })
    }
    if (data.date !== undefined) {
      regions.push({
        id: 'date',
        label: 'Date',
        x: 520,
        y: 890,
        w: 300,
        h: 48,
        value: data.date || '',
        placeholder: 'Date',
        format: 'body',
        fontSize: 18,
      })
    }
  }

  if (layout === 'metrics' && data.metrics) {
    const metrics = data.metrics
    const colW = Math.floor((1920 - 192 - (metrics.length - 1) * 32) / Math.max(metrics.length, 1))
    metrics.forEach((m, i) => {
      const colX = 96 + i * (colW + 32)
      regions.push({
        id: `metric_${i}_value`,
        label: `Stat ${i + 1} — Value`,
        x: colX,
        y: 480,
        w: colW,
        h: 100,
        value: m.value,
        placeholder: '$0M',
        format: 'metric',
        fontSize: 68,
      })
      regions.push({
        id: `metric_${i}_label`,
        label: `Stat ${i + 1} — Label`,
        x: colX,
        y: 590,
        w: colW,
        h: 56,
        value: m.label,
        placeholder: 'Metric label',
        format: 'label',
        fontSize: 20,
      })
      regions.push({
        id: `metric_${i}_change`,
        label: `Stat ${i + 1} — Delta`,
        x: colX,
        y: 415,
        w: 200,
        h: 44,
        value: m.change || '',
        placeholder: '+0% YoY',
        format: 'badge',
        fontSize: 14,
      })
    })
  }

  if ((layout === 'split' || layout === 'agenda') && data.columns) {
    data.columns.forEach((col, ci) => {
      const colW = Math.floor((1920 - 192) / data.columns!.length)
      const colX = 96 + ci * colW
      regions.push({
        id: `col_${ci}_title`,
        label: `Column ${ci + 1} Title`,
        x: colX,
        y: 420,
        w: colW - 20,
        h: 60,
        value: col.title,
        placeholder: 'Column heading',
        format: 'subtitle',
        fontSize: 24,
      })
      col.bullets.forEach((b, bi) => {
        regions.push({
          id: `col_${ci}_bullet_${bi}`,
          label: `Col ${ci + 1} / Bullet ${bi + 1}`,
          x: colX,
          y: 510 + bi * 60,
          w: colW - 20,
          h: 52,
          value: b,
          placeholder: 'Bullet point',
          format: 'body',
          fontSize: 18,
          multiline: true,
        })
      })
    })
  }

  if (layout === 'swot' && data.swot) {
    const quads = [
      { key: 'strengths' as const, items: data.swot.strengths, x: 96, y: 350 },
      { key: 'weaknesses' as const, items: data.swot.weaknesses, x: 1008, y: 350 },
      { key: 'opportunities' as const, items: data.swot.opportunities, x: 96, y: 710 },
      { key: 'threats' as const, items: data.swot.threats, x: 1008, y: 710 },
    ]
    quads.forEach((q) => {
      q.items.forEach((item, i) => {
        regions.push({
          id: `swot_${q.key}_${i}`,
          label: `${q.key} ${i + 1}`,
          x: q.x,
          y: q.y + i * 52,
          w: 860,
          h: 48,
          value: item,
          placeholder: `${q.key} item`,
          format: 'body',
          fontSize: 16,
          multiline: true,
        })
      })
    })
  }

  if (layout === 'roadmap' && data.timeline) {
    data.timeline.forEach((item, i) => {
      const colW = Math.floor((1920 - 192 - (data.timeline!.length - 1) * 24) / Math.max(data.timeline!.length, 1))
      const colX = 96 + i * (colW + 24)
      regions.push({
        id: `phase_${i}_title`,
        label: `Phase ${i + 1} Title`,
        x: colX,
        y: 470,
        w: colW,
        h: 60,
        value: item.title,
        placeholder: 'Milestone title',
        format: 'subtitle',
        fontSize: 22,
      })
      regions.push({
        id: `phase_${i}_desc`,
        label: `Phase ${i + 1} Desc`,
        x: colX,
        y: 540,
        w: colW,
        h: 80,
        value: item.desc,
        placeholder: 'Description',
        format: 'body',
        fontSize: 16,
        multiline: true,
      })
    })
  }

  if (layout === 'quote' && data.quote) {
    regions.push({
      id: 'quote_text',
      label: 'Quote Text',
      x: 200,
      y: 300,
      w: 1520,
      h: 260,
      value: data.quote.text,
      placeholder: '"The quote…"',
      format: 'title',
      fontSize: 38,
      multiline: true,
    })
    regions.push({
      id: 'quote_author',
      label: 'Author Name',
      x: 760,
      y: 710,
      w: 400,
      h: 56,
      value: data.quote.author,
      placeholder: 'Author name',
      format: 'subtitle',
      fontSize: 24,
    })
    regions.push({
      id: 'quote_role',
      label: 'Author Role',
      x: 760,
      y: 770,
      w: 400,
      h: 48,
      value: data.quote.role,
      placeholder: 'Role / Org',
      format: 'body',
      fontSize: 18,
    })
  }

  if (layout === 'conclusion') {
    if (data.description !== undefined) {
      regions.push({
        id: 'description',
        label: 'Closing Takeaway',
        x: 360,
        y: 560,
        w: 1200,
        h: 80,
        value: data.description || '',
        placeholder: 'Closing description…',
        format: 'body',
        fontSize: 20,
        multiline: true,
      })
    }
    if (data.contact?.email !== undefined) {
      regions.push({
        id: 'contact_email',
        label: 'Email',
        x: 620,
        y: 700,
        w: 350,
        h: 60,
        value: data.contact.email || '',
        placeholder: 'hello@example.com',
        format: 'body',
        fontSize: 18,
      })
    }
    if (data.contact?.web !== undefined) {
      regions.push({
        id: 'contact_web',
        label: 'Website',
        x: 990,
        y: 700,
        w: 350,
        h: 60,
        value: data.contact.web || '',
        placeholder: 'https://example.com',
        format: 'body',
        fontSize: 18,
      })
    }
  }

  return regions
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating inline editor popover
// ─────────────────────────────────────────────────────────────────────────────

interface FloatingEditorProps {
  region: SlideRegion
  top: number
  left: number
  width: number
  scale: number
  onCommit: (value: string) => void
  onDismiss: () => void
}

function FloatingEditor({ region, top, left, width, scale, onCommit, onDismiss }: FloatingEditorProps) {
  const [value, setValue] = useState(region.value)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const inputRefSingle = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const el = region.multiline ? inputRef.current : inputRefSingle.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [region.multiline])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onDismiss()
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onCommit(value)
      return
    }
    if (e.key === 'Enter' && !region.multiline) {
      e.preventDefault()
      onCommit(value)
    }
  }

  const fontSizeScaled = Math.max(11, Math.round((region.fontSize || 18) * scale * 0.85))
  const editorWidth = Math.max(220, Math.min(width, 580))

  const formatStyles: Record<string, React.CSSProperties> = {
    title: { fontWeight: 800, letterSpacing: '-0.02em' },
    subtitle: { fontWeight: 500 },
    badge: { fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px' },
    metric: { fontWeight: 900, letterSpacing: '-0.03em' },
    label: { fontWeight: 600 },
    body: { fontWeight: 400 },
  }
  const fs = formatStyles[region.format || 'body'] ?? {}

  const sharedStyle: React.CSSProperties = {
    width: editorWidth,
    fontSize: fontSizeScaled,
    background: 'rgba(10,15,30,0.97)',
    border: '1.5px solid rgba(99,102,241,0.5)',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    color: '#fff',
    padding: '10px 14px',
    outline: 'none',
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
    ...fs,
  }

  return (
    <div
      className="absolute z-[100] flex flex-col"
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Floating label above */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase"
          style={{ background: 'rgba(99,102,241,0.95)', color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {region.label}
        </span>
        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          ⌘↵ save · Esc cancel
        </span>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2.5 py-2"
        style={{
          width: editorWidth,
          background: 'rgba(10,15,30,0.97)',
          border: '1.5px solid rgba(99,102,241,0.5)',
          borderBottom: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '10px 10px 0 0',
        }}
      >
        <button
          type="button"
          className="flex h-6 w-7 items-center justify-center rounded text-[12px] font-black transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          onMouseDown={(e) => {
            e.preventDefault()
            const el = inputRef.current ?? (inputRefSingle.current as HTMLTextAreaElement | null)
            if (!el) return
            const s = el.selectionStart ?? 0
            const end = el.selectionEnd ?? s
            setValue(value.slice(0, s) + `**${value.slice(s, end)}**` + value.slice(end))
          }}
          title="Bold (wrap selection)"
        >
          B
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-[12px] italic transition-colors"
          style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'serif' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          onMouseDown={(e) => {
            e.preventDefault()
            const el = inputRef.current ?? (inputRefSingle.current as HTMLTextAreaElement | null)
            if (!el) return
            const s = el.selectionStart ?? 0
            const end = el.selectionEnd ?? s
            setValue(value.slice(0, s) + `_${value.slice(s, end)}_` + value.slice(end))
          }}
          title="Italic (wrap selection)"
        >
          I
        </button>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
        <button
          type="button"
          className="flex h-6 items-center justify-center rounded px-1.5 text-[10px] transition-colors"
          style={{ color: 'rgba(239,68,68,0.7)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          onMouseDown={(e) => {
            e.preventDefault()
            setValue('')
          }}
          title="Clear field"
        >
          Clear
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="flex h-6 items-center justify-center rounded px-2 text-[10px] font-bold transition-colors"
          style={{ color: 'rgba(99,102,241,0.9)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          onMouseDown={(e) => {
            e.preventDefault()
            onCommit(value)
          }}
        >
          Save ↵
        </button>
      </div>

      {region.multiline ? (
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={Math.max(2, Math.ceil(value.length / 55))}
          style={{ ...sharedStyle, resize: 'none' }}
          placeholder={region.placeholder}
        />
      ) : (
        <input
          ref={inputRefSingle}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={sharedStyle}
          placeholder={region.placeholder}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function SlideTextEditor({
  spec,
  scale,
  stageWidth,
  stageHeight,
  onCommit,
  enabled = true,
}: SlideTextEditorProps) {
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const specKey = `${spec.layout}-${spec.data.title}`
  const [prevSpecKey, setPrevSpecKey] = useState(specKey)
  if (prevSpecKey !== specKey) {
    setPrevSpecKey(specKey)
    setActiveRegionId(null)
    setHoverId(null)
  }

  if (!enabled) return null

  const regions = buildRegions(spec)
  const activeRegion = regions.find((r) => r.id === activeRegionId) ?? null

  const toSX = (nx: number) => nx * scale
  const toSY = (ny: number) => ny * scale

  function handleCommit(fieldPath: string, value: string) {
    onCommit(fieldPath, value)
    setActiveRegionId(null)
  }

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ width: stageWidth, height: stageHeight, pointerEvents: activeRegionId ? 'auto' : 'none' }}
      onClick={() => activeRegionId && setActiveRegionId(null)}
    >
      {/* Hotspot hit areas */}
      {regions.map((region) => {
        if (activeRegionId === region.id) return null
        const rx = toSX(region.x)
        const ry = toSY(region.y)
        const rw = toSX(region.w)
        const rh = toSY(region.h)
        const isHovered = hoverId === region.id

        return (
          <div
            key={region.id}
            className="absolute cursor-text"
            style={{
              left: rx,
              top: ry,
              width: rw,
              height: rh,
              pointerEvents: 'auto',
              borderRadius: 5,
              border: isHovered ? '1.5px dashed rgba(99,102,241,0.75)' : '1.5px solid transparent',
              background: isHovered ? 'rgba(99,102,241,0.06)' : 'transparent',
              transition: 'border-color 0.1s, background 0.1s',
            }}
            onMouseEnter={() => setHoverId(region.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={(e) => {
              e.stopPropagation()
              setActiveRegionId(region.id)
            }}
            title={`Edit: ${region.label}`}
          >
            {isHovered && (
              <div style={{ position: 'absolute', top: -22, left: 0, pointerEvents: 'none' }}>
                <span
                  style={{
                    background: 'rgba(99,102,241,0.92)',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✎ {region.label}
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* Floating editor overlay */}
      {activeRegion &&
        (() => {
          const rx = toSX(activeRegion.x)
          const ry = toSY(activeRegion.y)
          const rw = toSX(activeRegion.w)
          const editorW = Math.max(220, Math.min(rw, 580))
          const editorTop = Math.max(4, ry - 8)
          const editorLeft = Math.min(rx, stageWidth - editorW - 8)
          return (
            <FloatingEditor
              key={activeRegion.id}
              region={activeRegion}
              top={editorTop}
              left={editorLeft}
              width={rw}
              scale={scale}
              onCommit={(val) => handleCommit(activeRegion.id, val)}
              onDismiss={() => setActiveRegionId(null)}
            />
          )
        })()}
    </div>
  )
}
