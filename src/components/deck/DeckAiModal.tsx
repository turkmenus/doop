import { useState } from 'react'
import { DECK_THEMES } from './deckTemplates'
import { synthesizeDeckFromPrompt } from './deckAi'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Field } from '../ui/field'
import { Modal, ModalActions, ModalEyebrow, ModalLede, ModalTitle } from '../ui/modal'
import { SparkIcon } from '../ui/icons'
import type { DeckSlideSpec } from './deckTemplates'
import { api } from '../../lib/api'
import { isResidentLimit } from '../TeamAllowance'
import { useStore } from '../../lib/store'
import { RoleMark } from '../RoleMark'
import { roleById } from '../../../shared/agents'

interface DeckAiModalProps {
  canvasId: string
  open: boolean
  onClose: () => void
  onGenerate: (specs: DeckSlideSpec[]) => Promise<void>
}

const SUGGESTIONS = [
  'B2B SaaS tohum yatırımcı sunumu ve büyüme metrikleri',
  'Yapay Zeka Destekli Tasarım Platformu Ürün Lansmanı',
  '2026 Q3 Finansal Değerlendirme ve Performans Raporu',
  'Teknik Mimari, Güvenlik Standartları ve Yol Haritası',
]

type GenerateStep = 'idle' | 'calling-ai' | 'rendering' | 'done'

export function DeckAiModal({ canvasId, open, onClose, onGenerate }: DeckAiModalProps) {
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState<number>(5)
  const [theme, setTheme] = useState<string>('modern-dark')
  const [step, setStep] = useState<GenerateStep>('idle')
  const [modelLabel, setModelLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [queueingTeam, setQueueingTeam] = useState(false)

  const loading = step !== 'idle' && step !== 'done'

  if (!open) return null

  const isTr =
    /[ığüşöçİĞÜŞÖÇ]/.test(prompt) || prompt.toLowerCase().includes('sunum') || prompt.toLowerCase().includes('için')

  async function handleGenerateWithAI() {
    const clean = prompt.trim()
    if (!clean || loading || queueingTeam) return

    setStep('calling-ai')
    setError(null)
    setModelLabel(null)

    try {
      const res = await fetch(`/api/canvases/${canvasId}/deck-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: clean,
          slideCount,
          theme,
          language: isTr ? 'tr' : 'en',
        }),
      })

      const json = await res.json()

      if (res.status === 503 && json.code === 'no_model') {
        // No AI model configured — silently fall back to template engine
        setModelLabel('Template Engine')
        setStep('rendering')
        const specs = synthesizeDeckFromPrompt({ prompt: clean, slideCount, theme, language: isTr ? 'tr' : 'en' })
        await onGenerate(specs)
        setStep('done')
        onClose()
        return
      }

      if (!res.ok) {
        setError(json.error ?? 'AI generation failed — try again')
        setStep('idle')
        return
      }

      setModelLabel(json.model ?? 'AI Model')
      setStep('rendering')
      const specs = json.specs as DeckSlideSpec[]
      await onGenerate(specs)
      setStep('done')
      onClose()
    } catch {
      // Network error — fall back to template engine
      setModelLabel('Template Engine')
      setStep('rendering')
      try {
        const specs = synthesizeDeckFromPrompt({ prompt: clean, slideCount, theme, language: isTr ? 'tr' : 'en' })
        await onGenerate(specs)
        setStep('done')
        onClose()
      } catch {
        setError('Generation failed — please try again')
        setStep('idle')
      }
    }
  }

  async function handleQueueToTeam() {
    const clean = prompt.trim()
    if (!clean || loading || queueingTeam) return

    setQueueingTeam(true)
    try {
      await api.addCard(
        canvasId,
        `Generate a ${slideCount}-slide presentation deck in "${theme}" theme about: ${clean}. Create 16:9 slides with clear visual hierarchy, bold metrics, and executive copy.`,
        ['doop', 'copy', 'polish'],
      )
      onClose()
    } catch (err) {
      if (isResidentLimit(err)) {
        useStore.getState().setLimitWall(true)
      } else {
        console.error('Failed to queue deck card:', err)
      }
    } finally {
      setQueueingTeam(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="flex items-center gap-2 mb-1">
        <SparkIcon className="size-4 text-accent-ink" />
        <ModalEyebrow>AI Deck Generator</ModalEyebrow>
      </div>

      <ModalTitle>Generate Presentation with AI</ModalTitle>
      <ModalLede>
        Describe the topic and key highlights. Uses your connected AI model (Settings → AI Model) for fully custom
        content, or queue a card to the Doop agent team for a full collaborative pipeline.
      </ModalLede>

      <div className="mt-4 space-y-4">
        {/* Prompt Input */}
        <Field label="What is this presentation about?">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A 5-slide pitch deck for our AI-powered customer support platform showing market traction, architecture, and revenue roadmap..."
            rows={3}
            autoFocus
          />
        </Field>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(s)}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:border-ink-faint hover:bg-paper-deep text-left transition-colors"
            >
              ✨ {s}
            </button>
          ))}
        </div>

        {/* Slide Count & Theme Selection */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
          <Field label="Slide Count">
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
            >
              <option value={3}>3 Slides (Quick Pitch)</option>
              <option value={4}>4 Slides (Executive Summary)</option>
              <option value={5}>5 Slides (Standard Pitch)</option>
              <option value={6}>6 Slides (Detailed Product)</option>
              <option value={7}>7 Slides (Full Investor Deck)</option>
            </select>
          </Field>

          <Field label="Visual Theme">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none"
            >
              {Object.values(DECK_THEMES).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Progress Indicator */}
        {loading && (
          <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-paper-deep/50 px-4 py-3">
            <div className="size-3 rounded-full bg-brand animate-pulse flex-none" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-semibold text-ink">
                {step === 'calling-ai' ? 'Calling AI model…' : 'Rendering slides…'}
              </span>
              <span className="text-[10px] text-ink-faint">
                {step === 'calling-ai'
                  ? 'Crafting specific content for each slide layout…'
                  : 'Creating frames on your deck canvas…'}
              </span>
            </div>
          </div>
        )}

        {/* Model attribution */}
        {!loading && modelLabel && (
          <div className="flex items-center gap-2 text-[10px] text-ink-faint">
            <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-accent-ink">{modelLabel}</span>
            <span>used for generation</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-400">
            {error}
            {error.toLowerCase().includes('settings') && (
              <a href="/settings" className="ml-1 underline text-red-300 hover:text-red-200">
                Open Settings
              </a>
            )}
          </div>
        )}
      </div>

      <ModalActions className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onClose} disabled={loading || queueingTeam}>
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {/* Queue to Doop Agent Team */}
          <Button
            variant="default"
            onClick={handleQueueToTeam}
            disabled={!prompt.trim() || loading || queueingTeam}
            className="gap-1.5 text-xs font-semibold border-brand/40 bg-brand/5 text-ink hover:bg-brand/10"
            title="Queue card to Doop Resident Multi-Agent Pipeline"
          >
            <div className="flex -space-x-1">
              <RoleMark role={roleById('doop')} size={12} />
              <RoleMark role={roleById('copy')} size={12} />
              <RoleMark role={roleById('polish')} size={12} />
            </div>
            {queueingTeam ? 'Queueing Card...' : 'Queue to Doop Team'}
          </Button>

          {/* AI Generate */}
          <Button
            variant="primary"
            onClick={handleGenerateWithAI}
            disabled={!prompt.trim() || loading || queueingTeam}
            className="gap-2 text-xs font-semibold"
          >
            <SparkIcon className="size-3.5" />
            {loading ? (step === 'calling-ai' ? 'Generating…' : 'Rendering…') : 'Generate with AI'}
          </Button>
        </div>
      </ModalActions>
    </Modal>
  )
}
