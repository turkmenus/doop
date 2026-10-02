import { describe, expect, it } from 'vitest'
import { polishSlideContent, synthesizeDeckFromPrompt } from '../src/components/deck/deckAi'
import { getDefaultSlideData } from '../src/components/deck/deckTemplates'

describe('deckAi', () => {
  it('synthesizes a tailored 5-slide deck from a prompt', () => {
    const specs = synthesizeDeckFromPrompt({
      prompt: 'AI Destekli SaaS Yatırımcı Sunumu',
      slideCount: 5,
      theme: 'cyber-neon',
    })

    expect(specs.length).toBe(5)
    expect(specs[0]?.layout).toBe('cover')
    expect(specs[0]?.theme).toBe('cyber-neon')
    expect(specs[0]?.data.title).toContain('AI Destekli SaaS Yatırımcı Sunumu')
    expect(specs[2]?.layout).toBe('metrics')
    expect(specs[2]?.data.metrics?.length).toBe(3)
  })

  it('polishes slide content with instructions', () => {
    const coverSpec = {
      layout: 'cover' as const,
      theme: 'modern-dark',
      data: getDefaultSlideData('cover'),
    }

    const polished = polishSlideContent(coverSpec, 'add high growth financial metrics')
    expect(polished.layout).toBe('metrics')
    expect(polished.data.metrics?.length).toBe(3)
    expect(polished.data.metrics?.[0]?.value).toContain('$5.2M')
  })
})
