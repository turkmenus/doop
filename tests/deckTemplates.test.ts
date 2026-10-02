import { describe, expect, it } from 'vitest'
import {
  DECK_THEMES,
  createStarterDeck,
  getDefaultSlideData,
  parseSlideSpec,
  renderDeckSlideHtml,
} from '../src/components/deck/deckTemplates'

describe('deckTemplates', () => {
  it('provides all 6 default themes', () => {
    expect(Object.keys(DECK_THEMES)).toEqual([
      'modern-dark',
      'clean-light',
      'cyber-neon',
      'executive-gold',
      'swiss-minimal',
      'ocean-deep',
    ])
  })

  it('renders and parses back a cover slide spec', () => {
    const defaultData = getDefaultSlideData('cover')
    const html = renderDeckSlideHtml({
      layout: 'cover',
      theme: 'modern-dark',
      data: defaultData,
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('KEYNOTE PRESENTATION')
    expect(html).toContain('data-slide-layout="cover"')
    expect(html).toContain('data-slide-theme="modern-dark"')

    const parsed = parseSlideSpec(html)
    expect(parsed.layout).toBe('cover')
    expect(parsed.theme).toBe('modern-dark')
    expect(parsed.data.title).toBe(defaultData.title)
    expect(parsed.data.subtitle).toBe(defaultData.subtitle)
  })

  it('renders and parses back a metrics slide spec', () => {
    const defaultData = getDefaultSlideData('metrics')
    const html = renderDeckSlideHtml({
      layout: 'metrics',
      theme: 'cyber-neon',
      data: defaultData,
    })

    expect(html).toContain('PERFORMANCE & TRACTION')
    expect(html).toContain('$4.8M')

    const parsed = parseSlideSpec(html)
    expect(parsed.layout).toBe('metrics')
    expect(parsed.theme).toBe('cyber-neon')
    expect(parsed.data.title).toBe(defaultData.title)
    expect(parsed.data.metrics?.length).toBe(3)
  })

  it('creates starter deck with 7 distinct slides', () => {
    const starter = createStarterDeck('executive-gold')
    expect(starter.length).toBe(7)
    expect(starter[0]?.layout).toBe('cover')
    expect(starter[1]?.layout).toBe('agenda')
    expect(starter[2]?.layout).toBe('metrics')
    expect(starter[3]?.layout).toBe('split')
    expect(starter[4]?.layout).toBe('swot')
    expect(starter[5]?.layout).toBe('roadmap')
    expect(starter[6]?.layout).toBe('conclusion')
  })
})
