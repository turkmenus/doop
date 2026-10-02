import { useState } from 'react'
import type { Frame } from '../../../shared/types'
import {
  DECK_THEMES,
  LAYOUT_DEFINITIONS,
  type DeckLayoutRole,
  type DeckSlideSpec,
  getDefaultSlideData,
  parseSlideSpec,
  renderDeckSlideHtml,
} from './deckTemplates'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { CheckIcon, LayersIcon, PanelCollapseRightIcon } from '../ui/icons'

interface DeckConsoleProps {
  frame: Frame | null
  onUpdateFrame: (frameId: string, newHtml: string) => void
  onApplyThemeToAll: (themeId: string) => void
  activeTab?: 'content' | 'layout' | 'theme'
  onTabChange?: (tab: 'content' | 'layout' | 'theme') => void
  onClose?: () => void
}

export function DeckConsole({
  frame,
  onUpdateFrame,
  onApplyThemeToAll,
  activeTab,
  onTabChange,
  onClose,
}: DeckConsoleProps) {
  const [internalTab, setInternalTab] = useState<'content' | 'layout' | 'theme'>('content')
  const tab = activeTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab

  // Synchronize state when frame changes
  const [prevHtml, setPrevHtml] = useState(frame?.html)
  const [spec, setSpec] = useState<DeckSlideSpec | null>(() => (frame ? parseSlideSpec(frame.html) : null))

  if (frame?.html !== prevHtml) {
    setPrevHtml(frame?.html)
    setSpec(frame ? parseSlideSpec(frame.html) : null)
  }

  if (!frame || !spec) {
    return (
      <aside className="flex h-full w-[320px] flex-none flex-col items-center justify-center border-l border-line bg-surface p-6 text-center text-ink-faint select-none">
        <LayersIcon className="size-8 opacity-40 mb-2" />
        <p className="text-xs">Select a slide to inspect and tune its content.</p>
      </aside>
    )
  }

  function commitSpec(nextSpec: DeckSlideSpec) {
    setSpec(nextSpec)
    const newHtml = renderDeckSlideHtml(nextSpec)
    if (frame) {
      onUpdateFrame(frame.id, newHtml)
    }
  }

  function handleLayoutChange(nextLayout: DeckLayoutRole) {
    if (!spec) return
    const currentData = spec.data
    const defaultData = getDefaultSlideData(nextLayout)
    const nextSpec: DeckSlideSpec = {
      layout: nextLayout,
      theme: spec.theme,
      data: {
        ...defaultData,
        title: currentData.title || defaultData.title,
        subtitle: currentData.subtitle || defaultData.subtitle,
        badge: currentData.badge || defaultData.badge,
      },
    }
    commitSpec(nextSpec)
  }

  function handleThemeChange(nextTheme: string) {
    if (!spec) return
    commitSpec({ ...spec, theme: nextTheme })
  }

  function updateField<K extends keyof DeckSlideSpec['data']>(key: K, val: DeckSlideSpec['data'][K]) {
    if (!spec) return
    commitSpec({
      ...spec,
      data: {
        ...spec.data,
        [key]: val,
      },
    })
  }

  return (
    <aside className="flex h-full w-[320px] flex-none flex-col border-l border-line bg-surface select-none shadow-xs">
      {/* Console Header */}
      <div className="flex h-12 flex-none items-center justify-between border-b border-line px-3.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-[13px] font-bold text-ink">Slide Inspector</span>
          <span className="rounded-md bg-paper-deep px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-ink uppercase">
            {spec.layout}
          </span>
        </div>

        {onClose && (
          <Button
            variant="bare"
            size="icon-sm"
            className="size-7 rounded-md text-ink-faint hover:text-ink hover:bg-paper-deep"
            onClick={onClose}
            title="Collapse Inspector"
          >
            <PanelCollapseRightIcon className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Segmented Tab Bar */}
      <div className="flex-none p-2.5 pb-2 border-b border-line/60">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-paper-deep p-1 text-[11.5px] font-semibold">
          <button
            type="button"
            className={`rounded-md py-1.5 text-center transition-all ${
              tab === 'content'
                ? 'bg-surface shadow-xs text-ink font-bold'
                : 'text-ink-soft hover:text-ink hover:bg-surface/50'
            }`}
            onClick={() => setTab('content')}
          >
            Content
          </button>
          <button
            type="button"
            className={`rounded-md py-1.5 text-center transition-all ${
              tab === 'layout'
                ? 'bg-surface shadow-xs text-ink font-bold'
                : 'text-ink-soft hover:text-ink hover:bg-surface/50'
            }`}
            onClick={() => setTab('layout')}
          >
            Layout
          </button>
          <button
            type="button"
            className={`rounded-md py-1.5 text-center transition-all ${
              tab === 'theme'
                ? 'bg-surface shadow-xs text-ink font-bold'
                : 'text-ink-soft hover:text-ink hover:bg-surface/50'
            }`}
            onClick={() => setTab('theme')}
          >
            Theme
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* TAB 1: CONTENT */}
        {tab === 'content' && (
          <div className="space-y-4">
            {/* Slide Header Fields */}
            <div className="rounded-xl border border-line/70 bg-paper/40 p-3 space-y-2.5">
              <div className="text-[11px] font-bold text-ink-soft">Headline & Header</div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-ink-faint">Kicker / Badge</span>
                <Input
                  value={spec.data.badge || ''}
                  onChange={(e) => updateField('badge', e.target.value)}
                  placeholder="e.g. EXECUTIVE SUMMARY"
                  className="h-8 text-xs bg-surface"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-ink-faint">Slide Title</span>
                <Input
                  value={spec.data.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Main slide headline"
                  className="h-8 text-xs font-semibold bg-surface"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-medium text-ink-faint">Subtitle / Deck Note</span>
                <Textarea
                  value={spec.data.subtitle || ''}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  placeholder="Contextual subtitle..."
                  rows={2}
                  className="text-xs bg-surface"
                />
              </div>
            </div>

            {/* Layout Specific Data Elements */}
            {spec.layout === 'roadmap' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft">
                  <span>Timeline Milestones</span>
                  <span className="text-ink-faint font-normal">{spec.data.timeline?.length ?? 0} phases</span>
                </div>
                {(spec.data.timeline || []).map((step, idx) => (
                  <div key={idx} className="rounded-lg border border-line/80 bg-paper-deep/30 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-accent-ink uppercase">
                        {step.phase || `Phase ${idx + 1}`}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-ink-faint">Milestone Title</label>
                      <Input
                        value={step.title}
                        placeholder="e.g. Agent MCP Engine"
                        className="h-7 text-xs font-medium bg-surface"
                        onChange={(e) => {
                          const next = [...(spec.data.timeline || [])]
                          const cur = next[idx]
                          if (cur) next[idx] = { ...cur, title: e.target.value }
                          updateField('timeline', next)
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-ink-faint">Milestone Description</label>
                      <Input
                        value={step.desc}
                        placeholder="e.g. Full bidirectional streaming"
                        className="h-7 text-[11px] text-ink-soft bg-surface"
                        onChange={(e) => {
                          const next = [...(spec.data.timeline || [])]
                          const cur = next[idx]
                          if (cur) next[idx] = { ...cur, desc: e.target.value }
                          updateField('timeline', next)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {spec.layout === 'metrics' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft">
                  <span>Key Metrics</span>
                  <span className="text-ink-faint font-normal">{spec.data.metrics?.length ?? 0} stats</span>
                </div>
                {(spec.data.metrics || []).map((st, idx) => (
                  <div key={idx} className="rounded-lg border border-line/80 bg-paper-deep/30 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-ink-faint">
                      <span>STAT #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-ink-faint">Value / Stat</label>
                        <Input
                          value={st.value}
                          placeholder="e.g. $4.8M"
                          className="h-7 text-xs font-bold text-accent-ink bg-surface"
                          onChange={(e) => {
                            const next = [...(spec.data.metrics || [])]
                            const cur = next[idx]
                            if (cur) next[idx] = { ...cur, value: e.target.value }
                            updateField('metrics', next)
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-ink-faint">Growth / Delta</label>
                        <Input
                          value={st.change || ''}
                          placeholder="e.g. +210% YoY"
                          className="h-7 text-xs bg-surface font-medium"
                          onChange={(e) => {
                            const next = [...(spec.data.metrics || [])]
                            const cur = next[idx]
                            if (cur) next[idx] = { ...cur, change: e.target.value }
                            updateField('metrics', next)
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-ink-faint">Metric Description / Label</label>
                      <Input
                        value={st.label}
                        placeholder="e.g. Annual Recurring Revenue"
                        className="h-7 text-xs bg-surface text-ink-soft"
                        onChange={(e) => {
                          const next = [...(spec.data.metrics || [])]
                          const cur = next[idx]
                          if (cur) next[idx] = { ...cur, label: e.target.value }
                          updateField('metrics', next)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {spec.layout === 'cover' && (
              <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-3 space-y-2.5">
                <div className="text-[11px] font-bold text-ink-soft">Cover Metadata</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-ink-faint">Author / Studio</label>
                    <Input
                      value={spec.data.author || ''}
                      onChange={(e) => updateField('author', e.target.value)}
                      placeholder="e.g. Doop Design"
                      className="h-7 text-xs bg-surface"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-ink-faint">Date / Version</label>
                    <Input
                      value={spec.data.date || ''}
                      onChange={(e) => updateField('date', e.target.value)}
                      placeholder="e.g. October 2026"
                      className="h-7 text-xs bg-surface"
                    />
                  </div>
                </div>
              </div>
            )}

            {(spec.layout === 'split' || spec.layout === 'agenda') && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft">
                  <span>Sections / Columns</span>
                  <span className="text-ink-faint font-normal">{spec.data.columns?.length ?? 0} cards</span>
                </div>
                {(spec.data.columns || []).map((col, idx) => (
                  <div key={idx} className="rounded-lg border border-line/80 bg-paper-deep/30 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-ink-faint">
                      <span>COLUMN #{idx + 1}</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-ink-faint">Column Title</label>
                      <Input
                        value={col.title}
                        placeholder="Column Title"
                        className="h-7 text-xs font-semibold bg-surface"
                        onChange={(e) => {
                          const next = [...(spec.data.columns || [])]
                          const cur = next[idx]
                          if (cur) next[idx] = { ...cur, title: e.target.value }
                          updateField('columns', next)
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-ink-faint">Bullet Points (one per line)</label>
                      <Textarea
                        value={(col.bullets || []).join('\n')}
                        placeholder="Bullet points..."
                        rows={3}
                        className="text-xs bg-surface leading-snug"
                        onChange={(e) => {
                          const next = [...(spec.data.columns || [])]
                          const cur = next[idx]
                          if (cur) {
                            next[idx] = {
                              ...cur,
                              bullets: e.target.value.split('\n').filter((p) => p.trim().length > 0),
                            }
                          }
                          updateField('columns', next)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {spec.layout === 'swot' && (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-ink-soft">SWOT Matrix Quadrants</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Strengths</span>
                    <Textarea
                      value={(spec.data.swot?.strengths || []).join('\n')}
                      placeholder="One per line"
                      rows={3}
                      className="text-[11px] bg-surface leading-snug"
                      onChange={(e) =>
                        updateField('swot', {
                          strengths: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                          weaknesses: spec.data.swot?.weaknesses || [],
                          opportunities: spec.data.swot?.opportunities || [],
                          threats: spec.data.swot?.threats || [],
                        })
                      }
                    />
                  </div>
                  <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-rose-500 uppercase">Weaknesses</span>
                    <Textarea
                      value={(spec.data.swot?.weaknesses || []).join('\n')}
                      placeholder="One per line"
                      rows={3}
                      className="text-[11px] bg-surface leading-snug"
                      onChange={(e) =>
                        updateField('swot', {
                          strengths: spec.data.swot?.strengths || [],
                          weaknesses: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                          opportunities: spec.data.swot?.opportunities || [],
                          threats: spec.data.swot?.threats || [],
                        })
                      }
                    />
                  </div>
                  <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-sky-500 uppercase">Opportunities</span>
                    <Textarea
                      value={(spec.data.swot?.opportunities || []).join('\n')}
                      placeholder="One per line"
                      rows={3}
                      className="text-[11px] bg-surface leading-snug"
                      onChange={(e) =>
                        updateField('swot', {
                          strengths: spec.data.swot?.strengths || [],
                          weaknesses: spec.data.swot?.weaknesses || [],
                          opportunities: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                          threats: spec.data.swot?.threats || [],
                        })
                      }
                    />
                  </div>
                  <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-amber-500 uppercase">Threats</span>
                    <Textarea
                      value={(spec.data.swot?.threats || []).join('\n')}
                      placeholder="One per line"
                      rows={3}
                      className="text-[11px] bg-surface leading-snug"
                      onChange={(e) =>
                        updateField('swot', {
                          strengths: spec.data.swot?.strengths || [],
                          weaknesses: spec.data.swot?.weaknesses || [],
                          opportunities: spec.data.swot?.opportunities || [],
                          threats: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {spec.layout === 'quote' && (
              <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-3 space-y-2.5">
                <div className="text-[11px] font-bold text-ink-soft">Quote Details</div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-ink-faint">Quotation Text</label>
                  <Textarea
                    value={spec.data.quote?.text || ''}
                    onChange={(e) =>
                      updateField('quote', {
                        text: e.target.value,
                        author: spec.data.quote?.author || '',
                        role: spec.data.quote?.role || '',
                      })
                    }
                    placeholder="The quotation..."
                    rows={3}
                    className="text-xs bg-surface italic"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-ink-faint">Author Name</label>
                    <Input
                      value={spec.data.quote?.author || ''}
                      onChange={(e) =>
                        updateField('quote', {
                          text: spec.data.quote?.text || '',
                          author: e.target.value,
                          role: spec.data.quote?.role || '',
                        })
                      }
                      placeholder="Author name"
                      className="h-8 text-xs bg-surface"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-ink-faint">Author Role / Org</label>
                    <Input
                      value={spec.data.quote?.role || ''}
                      onChange={(e) =>
                        updateField('quote', {
                          text: spec.data.quote?.text || '',
                          author: spec.data.quote?.author || '',
                          role: e.target.value,
                        })
                      }
                      placeholder="Author role"
                      className="h-8 text-xs bg-surface"
                    />
                  </div>
                </div>
              </div>
            )}

            {spec.layout === 'conclusion' && (
              <div className="rounded-lg border border-line/80 bg-paper-deep/30 p-3 space-y-2.5">
                <div className="text-[11px] font-bold text-ink-soft">Closing Statement & Contact</div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-ink-faint">Closing Takeaway / Summary</label>
                  <Textarea
                    value={spec.data.description || ''}
                    placeholder="Closing takeaway description..."
                    rows={2}
                    className="text-xs bg-surface"
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-ink-faint">Email Address</label>
                    <Input
                      value={spec.data.contact?.email || ''}
                      placeholder="e.g. hello@doop.design"
                      className="h-8 text-xs bg-surface"
                      onChange={(e) =>
                        updateField('contact', {
                          email: e.target.value,
                          web: spec.data.contact?.web || '',
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-ink-faint">Website URL</label>
                    <Input
                      value={spec.data.contact?.web || ''}
                      placeholder="e.g. https://doop.design"
                      className="h-8 text-xs bg-surface"
                      onChange={(e) =>
                        updateField('contact', {
                          email: spec.data.contact?.email || '',
                          web: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LAYOUT */}
        {tab === 'layout' && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-ink-soft">16:9 Presentation Layouts</div>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_DEFINITIONS.map((l) => {
                const active = spec.layout === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleLayoutChange(l.id)}
                    className={`flex flex-col items-start p-2.5 text-left rounded-xl border transition-all ${
                      active
                        ? 'border-brand bg-brand/10 shadow-xs text-ink ring-1.5 ring-brand'
                        : 'border-line/70 hover:border-ink-faint hover:bg-paper-deep/80 text-ink-soft'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[12px] font-bold text-ink">{l.label}</span>
                      {active && <CheckIcon className="size-3.5 text-accent-ink" />}
                    </div>
                    <span className="line-clamp-2 text-[10px] text-ink-faint leading-tight">{l.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: THEME */}
        {tab === 'theme' && (
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-ink-soft">Curated Presentation Themes</div>
            <div className="space-y-2">
              {Object.values(DECK_THEMES).map((t) => {
                const active = spec.theme === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleThemeChange(t.id)}
                    className={`flex w-full items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      active
                        ? 'border-brand bg-brand/10 shadow-xs ring-1.5 ring-brand'
                        : 'border-line/70 hover:border-ink-faint hover:bg-paper-deep/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="size-7 rounded-lg border border-black/15 shadow-2xs flex-none"
                        style={{ background: t.bg }}
                      />
                      <div>
                        <div className="text-[12px] font-bold text-ink leading-tight">{t.name}</div>
                        <div className="text-[10px] text-ink-faint mt-0.5">{t.description}</div>
                      </div>
                    </div>
                    {active && <CheckIcon className="size-4 text-accent-ink" />}
                  </button>
                )
              })}
            </div>

            <Button
              variant="default"
              size="sm"
              className="w-full text-xs font-semibold mt-3"
              onClick={() => onApplyThemeToAll(spec.theme)}
            >
              Apply Theme to All Slides
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
