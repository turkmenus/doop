import pptxgen from 'pptxgenjs'
import { getDeckTheme, parseSlideSpec, type DeckTheme } from './deckTemplates'
import type { Frame } from '../../../shared/types'

function cleanHex(color: string, fallback = 'FFFFFF'): string {
  if (!color) return fallback
  const hex = color.replace('#', '').trim()
  return hex.length === 6 || hex.length === 8 ? hex.slice(0, 6) : fallback
}

export async function exportDeckToPptx(deckTitle: string, frames: Frame[]): Promise<void> {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_16x9'
  pptx.title = deckTitle || 'Doop Presentation'

  for (const frame of frames) {
    const spec = parseSlideSpec(frame.html)
    const theme: DeckTheme = getDeckTheme(spec.theme)
    const { layout, data } = spec

    const slide = pptx.addSlide()

    const bgColor = cleanHex(theme.bg, '0B0F19')
    const textColor = cleanHex(theme.textColor, 'FFFFFF')
    const textMuted = cleanHex(theme.textMuted, '94A3B8')
    const accentColor = cleanHex(theme.accent, '38BDF8')
    const cardBg = cleanHex(theme.cardBg, '131B2E')
    const cardBorder = cleanHex(theme.cardBorder.startsWith('#') ? theme.cardBorder : theme.accent, '38BDF8')

    // Background
    slide.background = { color: bgColor }

    // Top Badge
    if (data.badge) {
      slide.addText(data.badge.toUpperCase(), {
        x: 0.8,
        y: 0.6,
        w: 4.5,
        h: 0.35,
        fontSize: 10,
        bold: true,
        color: accentColor,
        isTextBox: true,
      })
    }

    if (layout === 'cover') {
      // Main Cover Title
      slide.addText(data.title || 'Untitled Presentation', {
        x: 0.8,
        y: 1.8,
        w: 11.5,
        h: 2.2,
        fontSize: 44,
        bold: true,
        color: textColor,
        valign: 'middle',
      })

      // Subtitle
      if (data.subtitle) {
        slide.addText(data.subtitle, {
          x: 0.8,
          y: 4.2,
          w: 10.5,
          h: 1.2,
          fontSize: 18,
          color: textMuted,
        })
      }

      // Presenter & Date line
      const meta = [data.author ? `Presenter: ${data.author}` : '', data.date ? `Date: ${data.date}` : '']
        .filter(Boolean)
        .join('    |    ')

      if (meta) {
        slide.addText(meta, {
          x: 0.8,
          y: 6.0,
          w: 10.0,
          h: 0.5,
          fontSize: 13,
          color: textMuted,
        })
      }
    } else {
      // Header for content slides
      slide.addText(data.title || '', {
        x: 0.8,
        y: 1.0,
        w: 11.5,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: textColor,
      })

      if (data.subtitle) {
        slide.addText(data.subtitle, {
          x: 0.8,
          y: 1.7,
          w: 11.5,
          h: 0.5,
          fontSize: 14,
          color: textMuted,
        })
      }

      if (layout === 'metrics') {
        const metrics = data.metrics || []
        const colW = 3.6
        const gap = 0.4
        const startX = 0.8

        metrics.slice(0, 3).forEach((m, idx) => {
          const posX = startX + idx * (colW + gap)

          // Card Background
          slide.addShape(pptx.ShapeType.roundRect, {
            x: posX,
            y: 2.6,
            w: colW,
            h: 3.8,
            fill: { color: cardBg },
            line: { color: cardBorder, width: 1 },
            rectRadius: 0.15,
          })

          // Metric change pill
          if (m.change) {
            slide.addText(m.change, {
              x: posX + 0.3,
              y: 2.9,
              w: 2.0,
              h: 0.35,
              fontSize: 10,
              bold: true,
              color: accentColor,
            })
          }

          // Big Metric Number
          slide.addText(m.value, {
            x: posX + 0.3,
            y: 3.5,
            w: colW - 0.6,
            h: 1.2,
            fontSize: 42,
            bold: true,
            color: textColor,
          })

          // Label
          slide.addText(m.label, {
            x: posX + 0.3,
            y: 4.8,
            w: colW - 0.6,
            h: 1.0,
            fontSize: 14,
            color: textMuted,
          })
        })
      } else if (layout === 'split') {
        const cols = data.columns || []
        const colW = 5.6
        const gap = 0.5

        cols.slice(0, 2).forEach((c, idx) => {
          const posX = 0.8 + idx * (colW + gap)

          slide.addShape(pptx.ShapeType.roundRect, {
            x: posX,
            y: 2.5,
            w: colW,
            h: 4.2,
            fill: { color: cardBg },
            line: { color: idx === 1 ? accentColor : cardBorder, width: idx === 1 ? 2 : 1 },
            rectRadius: 0.15,
          })

          slide.addText(c.title, {
            x: posX + 0.4,
            y: 2.8,
            w: colW - 0.8,
            h: 0.6,
            fontSize: 18,
            bold: true,
            color: idx === 1 ? accentColor : textColor,
          })

          const bullets = c.bullets.map((b) => ({
            text: b,
            options: { fontSize: 13, color: textColor, bullet: true, breakLine: true },
          }))

          slide.addText(bullets, {
            x: posX + 0.4,
            y: 3.5,
            w: colW - 0.8,
            h: 3.0,
            lineSpacingMultiple: 1.3,
          })
        })
      } else if (layout === 'swot') {
        const swot = data.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] }
        const quadrants = [
          { title: 'STRENGTHS', items: swot.strengths, x: 0.8, y: 2.5, color: '22C55E' },
          { title: 'WEAKNESSES', items: swot.weaknesses, x: 6.8, y: 2.5, color: 'EF4444' },
          { title: 'OPPORTUNITIES', items: swot.opportunities, x: 0.8, y: 4.7, color: '3B82F6' },
          { title: 'THREATS', items: swot.threats, x: 6.8, y: 4.7, color: 'EAB308' },
        ]

        quadrants.forEach((q) => {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: q.x,
            y: q.y,
            w: 5.7,
            h: 2.0,
            fill: { color: cardBg },
            line: { color: cardBorder, width: 1 },
            rectRadius: 0.1,
          })

          slide.addText(q.title, {
            x: q.x + 0.3,
            y: q.y + 0.2,
            w: 3.0,
            h: 0.35,
            fontSize: 10,
            bold: true,
            color: q.color,
          })

          const items = q.items.map((it) => ({
            text: it,
            options: { fontSize: 11, color: textColor, bullet: true, breakLine: true },
          }))

          slide.addText(items, {
            x: q.x + 0.3,
            y: q.y + 0.55,
            w: 5.1,
            h: 1.3,
            lineSpacingMultiple: 1.2,
          })
        })
      } else if (layout === 'roadmap') {
        const timeline = data.timeline || []
        const count = Math.max(1, timeline.length)
        const colW = (11.7 - (count - 1) * 0.3) / count

        timeline.forEach((item, idx) => {
          const posX = 0.8 + idx * (colW + 0.3)

          slide.addShape(pptx.ShapeType.roundRect, {
            x: posX,
            y: 2.7,
            w: colW,
            h: 3.8,
            fill: { color: cardBg },
            line: { color: cardBorder, width: 1 },
            rectRadius: 0.15,
          })

          slide.addText(item.phase, {
            x: posX + 0.3,
            y: 3.0,
            w: colW - 0.6,
            h: 0.5,
            fontSize: 16,
            bold: true,
            color: accentColor,
          })

          slide.addText(item.title, {
            x: posX + 0.3,
            y: 3.6,
            w: colW - 0.6,
            h: 0.6,
            fontSize: 14,
            bold: true,
            color: textColor,
          })

          slide.addText(item.desc, {
            x: posX + 0.3,
            y: 4.3,
            w: colW - 0.6,
            h: 1.8,
            fontSize: 12,
            color: textMuted,
          })
        })
      } else if (layout === 'agenda') {
        const cols = data.columns || []
        const count = Math.max(1, cols.length)
        const colW = (11.7 - (count - 1) * 0.4) / count

        cols.forEach((col, idx) => {
          const posX = 0.8 + idx * (colW + 0.4)

          slide.addShape(pptx.ShapeType.roundRect, {
            x: posX,
            y: 2.6,
            w: colW,
            h: 4.0,
            fill: { color: cardBg },
            line: { color: cardBorder, width: 1 },
            rectRadius: 0.15,
          })

          slide.addText(col.title, {
            x: posX + 0.3,
            y: 2.9,
            w: colW - 0.6,
            h: 0.6,
            fontSize: 16,
            bold: true,
            color: accentColor,
          })

          const bullets = col.bullets.map((b) => ({
            text: b,
            options: { fontSize: 12, color: textColor, bullet: true, breakLine: true },
          }))

          slide.addText(bullets, {
            x: posX + 0.3,
            y: 3.6,
            w: colW - 0.6,
            h: 2.8,
            lineSpacingMultiple: 1.3,
          })
        })
      } else if (layout === 'quote') {
        const q = data.quote || { text: '', author: '', role: '' }

        slide.addText(`“${q.text}”`, {
          x: 1.5,
          y: 2.6,
          w: 10.3,
          h: 2.4,
          fontSize: 26,
          bold: true,
          color: textColor,
          align: 'center',
          valign: 'middle',
        })

        slide.addText(q.author, {
          x: 1.5,
          y: 5.2,
          w: 10.3,
          h: 0.4,
          fontSize: 16,
          bold: true,
          color: accentColor,
          align: 'center',
        })

        if (q.role) {
          slide.addText(q.role, {
            x: 1.5,
            y: 5.65,
            w: 10.3,
            h: 0.4,
            fontSize: 13,
            color: textMuted,
            align: 'center',
          })
        }
      } else if (layout === 'conclusion') {
        slide.addText('Thank You!', {
          x: 1.5,
          y: 2.6,
          w: 10.3,
          h: 1.0,
          fontSize: 38,
          bold: true,
          color: textColor,
          align: 'center',
        })

        if (data.subtitle) {
          slide.addText(data.subtitle, {
            x: 1.5,
            y: 3.7,
            w: 10.3,
            h: 0.8,
            fontSize: 18,
            color: textMuted,
            align: 'center',
          })
        }

        if (data.contact) {
          const contactStr = [
            data.contact.email ? `Email: ${data.contact.email}` : '',
            data.contact.web ? `Website: ${data.contact.web}` : '',
          ]
            .filter(Boolean)
            .join('    •    ')

          slide.addText(contactStr, {
            x: 1.5,
            y: 4.8,
            w: 10.3,
            h: 0.5,
            fontSize: 15,
            color: accentColor,
            align: 'center',
          })
        }
      }
    }

    // Slide footer
    slide.addText('Doop Presentation Deck', {
      x: 0.8,
      y: 7.0,
      w: 4.0,
      h: 0.3,
      fontSize: 9,
      color: textMuted,
    })
  }

  const safeFileName = (deckTitle || 'presentation').replace(/[^a-zA-Z0-9_-]/g, '_')
  await pptx.writeFile({ fileName: `${safeFileName}.pptx` })
}
