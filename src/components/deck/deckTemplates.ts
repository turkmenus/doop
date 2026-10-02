export interface DeckTheme {
  id: string
  name: string
  description: string
  bg: string
  cardBg: string
  cardBorder: string
  textColor: string
  textMuted: string
  accent: string
  accentBg: string
  badgeBg: string
  badgeText: string
  gradient: string
}

export const DECK_THEMES: Record<string, DeckTheme> = {
  'modern-dark': {
    id: 'modern-dark',
    name: 'Modern Dark',
    description: 'Deep navy slate with electric cyan accents',
    bg: '#0B0F19',
    cardBg: '#131B2E',
    cardBorder: 'rgba(56, 189, 248, 0.2)',
    textColor: '#F8FAFC',
    textMuted: '#94A3B8',
    accent: '#38BDF8',
    accentBg: 'rgba(56, 189, 248, 0.12)',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    badgeText: '#38BDF8',
    gradient: 'linear-gradient(135deg, #0B0F19 0%, #172554 100%)',
  },
  'clean-light': {
    id: 'clean-light',
    name: 'Clean Light',
    description: 'Crisp minimal paper with royal blue branding',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(226, 232, 240, 0.9)',
    textColor: '#0F172A',
    textMuted: '#64748B',
    accent: '#2563EB',
    accentBg: 'rgba(37, 99, 235, 0.08)',
    badgeBg: 'rgba(37, 99, 235, 0.1)',
    badgeText: '#2563EB',
    gradient: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
  },
  'cyber-neon': {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Vibrant cyberpunk magenta & emerald glow',
    bg: '#09090B',
    cardBg: '#18181B',
    cardBorder: 'rgba(236, 72, 153, 0.3)',
    textColor: '#FAFAFA',
    textMuted: '#A1A1AA',
    accent: '#EC4899',
    accentBg: 'rgba(236, 72, 153, 0.15)',
    badgeBg: 'rgba(236, 72, 153, 0.2)',
    badgeText: '#F472B6',
    gradient: 'linear-gradient(135deg, #09090B 0%, #2A0845 100%)',
  },
  'executive-gold': {
    id: 'executive-gold',
    name: 'Executive Gold',
    description: 'Prestigious graphite with champagne gold',
    bg: '#121214',
    cardBg: '#1C1C21',
    cardBorder: 'rgba(212, 175, 55, 0.3)',
    textColor: '#FAF8F5',
    textMuted: '#A8A29E',
    accent: '#D4AF37',
    accentBg: 'rgba(212, 175, 55, 0.12)',
    badgeBg: 'rgba(212, 175, 55, 0.2)',
    badgeText: '#FBBF24',
    gradient: 'linear-gradient(135deg, #121214 0%, #231F1A 100%)',
  },
  'swiss-minimal': {
    id: 'swiss-minimal',
    name: 'Swiss Red',
    description: 'High-contrast typography with crimson punch',
    bg: '#FFFFFF',
    cardBg: '#F4F4F5',
    cardBorder: 'rgba(24, 24, 27, 0.12)',
    textColor: '#09090B',
    textMuted: '#71717A',
    accent: '#E11D48',
    accentBg: 'rgba(225, 29, 72, 0.08)',
    badgeBg: 'rgba(225, 29, 72, 0.12)',
    badgeText: '#E11D48',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #FDF2F4 100%)',
  },
  'ocean-deep': {
    id: 'ocean-deep',
    name: 'Ocean Deep',
    description: 'Midnight abyss with seafoam green accents',
    bg: '#022C43',
    cardBg: '#053F5E',
    cardBorder: 'rgba(20, 184, 166, 0.3)',
    textColor: '#F0FDFA',
    textMuted: '#99F6E4',
    accent: '#14B8A6',
    accentBg: 'rgba(20, 184, 166, 0.15)',
    badgeBg: 'rgba(20, 184, 166, 0.2)',
    badgeText: '#2DD4BF',
    gradient: 'linear-gradient(135deg, #022C43 0%, #115173 100%)',
  },
}

export function getDeckTheme(themeId?: string): DeckTheme {
  if (themeId && themeId in DECK_THEMES) {
    const found = DECK_THEMES[themeId]
    if (found) return found
  }
  const fallback = DECK_THEMES['modern-dark']
  if (!fallback) {
    throw new Error('Default modern-dark theme missing')
  }
  return fallback
}

export type DeckLayoutRole = 'cover' | 'agenda' | 'metrics' | 'split' | 'swot' | 'roadmap' | 'quote' | 'conclusion'

export interface SlideContentData {
  badge?: string
  title?: string
  subtitle?: string
  description?: string
  date?: string
  author?: string
  metrics?: { value: string; label: string; change?: string }[]
  columns?: { title: string; bullets: string[] }[]
  swot?: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  timeline?: { phase: string; title: string; desc: string }[]
  quote?: { text: string; author: string; role: string }
  contact?: { email?: string; web?: string }
}

export interface DeckSlideSpec {
  layout: DeckLayoutRole
  theme: string
  data: SlideContentData
}

export const LAYOUT_DEFINITIONS: {
  id: DeckLayoutRole
  label: string
  description: string
  iconName: string
}[] = [
  {
    id: 'cover',
    label: 'Cover Slide',
    description: 'Hero title, kicker badge & presenter info',
    iconName: 'FrameIcon',
  },
  {
    id: 'agenda',
    label: 'Agenda & Outline',
    description: 'Section index and strategic topics',
    iconName: 'LayersIcon',
  },
  {
    id: 'metrics',
    label: 'KPIs & Metrics',
    description: '3 large highlight stats with trend indicators',
    iconName: 'PulseIcon',
  },
  {
    id: 'split',
    label: '2-Column Split',
    description: 'Comparison, problem vs solution or side-by-side',
    iconName: 'BoxIcon',
  },
  { id: 'swot', label: 'SWOT Analysis', description: '4-quadrant strategic business matrix', iconName: 'GridIcon' },
  {
    id: 'roadmap',
    label: 'Roadmap & Stepper',
    description: 'Milestones, quarters, or launch phases',
    iconName: 'SyncIcon',
  },
  { id: 'quote', label: 'Quote / Highlight', description: 'Key quote or customer testimonial', iconName: 'TextIcon' },
  {
    id: 'conclusion',
    label: 'Conclusion & CTA',
    description: 'Summary takeaways, next steps and contact',
    iconName: 'CheckIcon',
  },
]

export function getDefaultSlideData(layout: DeckLayoutRole): SlideContentData {
  switch (layout) {
    case 'cover':
      return {
        badge: 'KEYNOTE PRESENTATION',
        title: 'Transforming The Future with AI',
        subtitle: 'Product Strategy, Market Traction & 2026 Roadmap',
        author: 'Doop Design Studio',
        date: 'October 2026',
      }
    case 'agenda':
      return {
        badge: 'TABLE OF CONTENTS',
        title: 'Executive Agenda',
        subtitle: 'Key themes we will cover throughout this deck',
        columns: [
          {
            title: '01. Market Landscape',
            bullets: ['Current macro dynamics', 'Customer pain points', 'Competitive gap analysis'],
          },
          {
            title: '02. Product & Platform',
            bullets: ['Multiplayer live canvas', 'MCP agent orchestration', 'Autonomous workflows'],
          },
          {
            title: '03. Growth & Scale',
            bullets: ['Traction metrics', 'Go-to-market strategy', 'Capital allocation & milestones'],
          },
        ],
      }
    case 'metrics':
      return {
        badge: 'PERFORMANCE & TRACTION',
        title: 'Exponential Metric Growth',
        subtitle: 'Our key operating highlights over the last 12 months',
        metrics: [
          { value: '$4.8M', label: 'Annual Recurring Revenue', change: '+210% YoY' },
          { value: '185K', label: 'Active Monthly Designers', change: '+94% YoY' },
          { value: '99.4%', label: 'Net Revenue Retention', change: 'Top Decile' },
        ],
      }
    case 'split':
      return {
        badge: 'STRATEGIC COMPARISON',
        title: 'Legacy Process vs Autonomous Canvas',
        subtitle: 'How next-gen design teams work with multiplayer AI agents',
        columns: [
          {
            title: 'Legacy Approach (Slow & Siloed)',
            bullets: [
              'Manual handoffs between design and engineering',
              'Static mockups that break during implementation',
              'AI prompts limited to isolated copy-paste tools',
              'No live multiplayer alignment with agents',
            ],
          },
          {
            title: 'The Doop Paradigm (Instant & Live)',
            bullets: [
              'Real HTML rendered in live sandboxed iframes',
              'Multiplayer collaboration for humans and AI agents',
              'Built-in MCP server streaming designs directly',
              'Seamless export to PPTX, Web, and Code',
            ],
          },
        ],
      }
    case 'swot':
      return {
        badge: 'STRATEGIC MATRIX',
        title: 'SWOT Strategic Assessment',
        subtitle: 'Internal strengths and external opportunities in our domain',
        swot: {
          strengths: [
            'Proprietary real-time sync engine',
            'Deep MCP agent integration',
            'Strong developer and open-source community',
          ],
          weaknesses: ['High server compute during mass generation', 'Early-stage enterprise compliance footprint'],
          opportunities: [
            'Expansion into automated enterprise design systems',
            'Marketplace for community agent skills',
          ],
          threats: ['Rapid feature iteration by legacy design incumbents', 'Shifting AI model APIs and token pricing'],
        },
      }
    case 'roadmap':
      return {
        badge: 'EXECUTION PLAN',
        title: 'Quarterly Milestones & Roadmap',
        subtitle: 'Our focused path towards market leadership',
        timeline: [
          { phase: 'Q1', title: 'Agent MCP Engine', desc: 'Full bidirectional streaming & tool execution' },
          { phase: 'Q2', title: 'Deck & Presentation Mode', desc: 'Direct editable PPTX export & slide themes' },
          { phase: 'Q3', title: 'Team Workspaces', desc: 'Fine-grained permissions and collaborative boards' },
          { phase: 'Q4', title: 'Autonomous Workflows', desc: 'Background design iterations and scheduled crons' },
        ],
      }
    case 'quote':
      return {
        badge: 'CUSTOMER VOICES',
        title: 'What Leaders Are Saying',
        subtitle: 'Feedback from top design & product teams',
        quote: {
          text: '“Doop completely reshaped how we design. Having AI agents work live beside us on the canvas saved us months of iteration.”',
          author: 'Elena Vance',
          role: 'VP of Product Design, Horizon Labs',
        },
      }
    case 'conclusion':
      return {
        badge: 'CLOSING & NEXT STEPS',
        title: 'Let’s Build What’s Next Together',
        subtitle: 'Thank you for your time. We are ready to answer your questions.',
        description: 'Get started today or explore our self-hosted open source edition.',
        contact: {
          email: 'hello@doop.design',
          web: 'https://doop.design',
        },
      }
  }
}

export function renderDeckSlideHtml(spec: DeckSlideSpec): string {
  const theme: DeckTheme = getDeckTheme(spec.theme)
  const { layout, data } = spec

  let contentHtml = ''

  if (layout === 'cover') {
    contentHtml = `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;max-width:1400px;margin:0 auto;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h1 style="font-size:72px;font-weight:800;line-height:1.08;letter-spacing:-0.03em;margin:24px 0 20px 0;background:linear-gradient(180deg, ${theme.textColor} 0%, ${theme.textMuted} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
          ${data.title || 'Untitled Slide'}
        </h1>
        <p style="font-size:26px;line-height:1.4;color:${theme.textMuted};max-width:960px;margin-bottom:60px;">
          ${data.subtitle || ''}
        </p>
        <div style="display:flex;align-items:center;gap:36px;border-top:1px solid ${theme.cardBorder};padding-top:32px;font-size:18px;color:${theme.textMuted};">
          ${data.author ? `<div><strong style="color:${theme.textColor};">Presenter:</strong> ${data.author}</div>` : ''}
          ${data.date ? `<div><strong style="color:${theme.textColor};">Date:</strong> ${data.date}</div>` : ''}
        </div>
      </div>
    `
  } else if (layout === 'agenda') {
    const cols = data.columns || []
    contentHtml = `
      <div style="display:flex;flex-direction:column;height:100%;max-width:1600px;margin:0 auto;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h2 style="font-size:46px;font-weight:750;letter-spacing:-0.02em;margin:16px 0 8px 0;color:${theme.textColor};">
          ${data.title || 'Agenda'}
        </h2>
        <p style="font-size:20px;color:${theme.textMuted};margin-bottom:48px;">
          ${data.subtitle || ''}
        </p>
        <div style="display:grid;grid-template-columns:repeat(${Math.max(1, cols.length)}, 1fr);gap:28px;flex:1;">
          ${cols
            .map(
              (c) => `
            <div class="card" style="padding:36px;display:flex;flex-direction:column;">
              <h3 style="font-size:24px;font-weight:700;color:${theme.accent};margin-bottom:24px;">${c.title}</h3>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:16px;flex:1;">
                ${c.bullets
                  .map(
                    (b) => `
                  <li style="display:flex;align-items:flex-start;gap:12px;font-size:18px;color:${theme.textColor};line-height:1.4;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${theme.accent};margin-top:8px;flex-shrink:0;"></span>
                    <span>${b}</span>
                  </li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
  } else if (layout === 'metrics') {
    const metrics = data.metrics || []
    contentHtml = `
      <div style="display:flex;flex-direction:column;height:100%;max-width:1600px;margin:0 auto;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h2 style="font-size:46px;font-weight:750;letter-spacing:-0.02em;margin:16px 0 8px 0;color:${theme.textColor};">
          ${data.title || 'Key Metrics'}
        </h2>
        <p style="font-size:20px;color:${theme.textMuted};margin-bottom:56px;">
          ${data.subtitle || ''}
        </p>
        <div style="display:grid;grid-template-columns:repeat(${Math.max(1, metrics.length)}, 1fr);gap:32px;flex:1;align-items:stretch;">
          ${metrics
            .map(
              (m) => `
            <div class="card" style="padding:44px 36px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;">
              <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, ${theme.accent}, transparent);"></div>
              ${m.change ? `<div style="display:inline-flex;align-self:flex-start;padding:6px 12px;border-radius:20px;font-size:14px;font-weight:700;background:${theme.badgeBg};color:${theme.badgeText};margin-bottom:24px;">${m.change}</div>` : ''}
              <div style="font-size:68px;font-weight:850;letter-spacing:-0.03em;color:${theme.textColor};line-height:1;margin-bottom:14px;">
                ${m.value}
              </div>
              <div style="font-size:20px;font-weight:600;color:${theme.textMuted};line-height:1.35;">
                ${m.label}
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
  } else if (layout === 'split') {
    const cols = data.columns || []
    contentHtml = `
      <div style="display:flex;flex-direction:column;height:100%;max-width:1600px;margin:0 auto;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h2 style="font-size:46px;font-weight:750;letter-spacing:-0.02em;margin:16px 0 8px 0;color:${theme.textColor};">
          ${data.title || 'Comparison'}
        </h2>
        <p style="font-size:20px;color:${theme.textMuted};margin-bottom:48px;">
          ${data.subtitle || ''}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:36px;flex:1;">
          ${cols
            .map(
              (c, i) => `
            <div class="card" style="padding:40px;display:flex;flex-direction:column;${i === 1 ? `border-color:${theme.accent};box-shadow:0 12px 32px -8px ${theme.accentBg};` : ''}">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
                <span style="font-size:13px;font-weight:800;padding:4px 10px;border-radius:6px;background:${i === 0 ? theme.cardBorder : theme.accent};color:${i === 0 ? theme.textMuted : '#FFFFFF'};">
                  ${i === 0 ? 'BEFORE / CURRENT' : 'THE ADVANTAGE'}
                </span>
                <h3 style="font-size:24px;font-weight:700;color:${theme.textColor};margin:0;">${c.title}</h3>
              </div>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:20px;flex:1;">
                ${c.bullets
                  .map(
                    (b) => `
                  <li style="display:flex;align-items:flex-start;gap:14px;font-size:18px;color:${theme.textColor};line-height:1.45;">
                    <span style="color:${i === 1 ? theme.accent : theme.textMuted};font-size:18px;font-weight:bold;">${i === 1 ? '✓' : '•'}</span>
                    <span>${b}</span>
                  </li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
  } else if (layout === 'swot') {
    const swot = data.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] }
    contentHtml = `
      <div style="display:flex;flex-direction:column;height:100%;max-width:1600px;margin:0 auto;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h2 style="font-size:44px;font-weight:750;letter-spacing:-0.02em;margin:16px 0 8px 0;color:${theme.textColor};">
          ${data.title || 'SWOT Analysis'}
        </h2>
        <p style="font-size:19px;color:${theme.textMuted};margin-bottom:40px;">
          ${data.subtitle || ''}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:24px;flex:1;">
          <div class="card" style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <span style="background:rgba(34,197,94,0.18);color:#22C55E;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">STRENGTHS</span>
            </div>
            <ul style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:10px;color:${theme.textColor};font-size:16px;line-height:1.4;">
              ${swot.strengths.map((s) => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          <div class="card" style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <span style="background:rgba(239,68,68,0.18);color:#EF4444;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">WEAKNESSES</span>
            </div>
            <ul style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:10px;color:${theme.textColor};font-size:16px;line-height:1.4;">
              ${swot.weaknesses.map((w) => `<li>${w}</li>`).join('')}
            </ul>
          </div>
          <div class="card" style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <span style="background:rgba(59,130,246,0.18);color:#3B82F6;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">OPPORTUNITIES</span>
            </div>
            <ul style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:10px;color:${theme.textColor};font-size:16px;line-height:1.4;">
              ${swot.opportunities.map((o) => `<li>${o}</li>`).join('')}
            </ul>
          </div>
          <div class="card" style="padding:28px 32px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <span style="background:rgba(234,179,8,0.18);color:#EAB308;font-size:12px;font-weight:800;padding:3px 8px;border-radius:4px;">THREATS</span>
            </div>
            <ul style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:10px;color:${theme.textColor};font-size:16px;line-height:1.4;">
              ${swot.threats.map((t) => `<li>${t}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `
  } else if (layout === 'roadmap') {
    const timeline = data.timeline || []
    contentHtml = `
      <div style="display:flex;flex-direction:column;height:100%;max-width:1600px;margin:0 auto;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h2 style="font-size:46px;font-weight:750;letter-spacing:-0.02em;margin:16px 0 8px 0;color:${theme.textColor};">
          ${data.title || 'Roadmap'}
        </h2>
        <p style="font-size:20px;color:${theme.textMuted};margin-bottom:56px;">
          ${data.subtitle || ''}
        </p>
        <div style="display:grid;grid-template-columns:repeat(${Math.max(1, timeline.length)}, 1fr);gap:24px;flex:1;">
          ${timeline
            .map(
              (item, i) => `
            <div class="card" style="padding:32px 28px;display:flex;flex-direction:column;position:relative;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                <span style="font-size:18px;font-weight:900;color:${theme.accent};">${item.phase}</span>
                <span style="height:2px;flex:1;background:${theme.cardBorder};"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:${i === 0 ? theme.accent : theme.cardBorder};"></span>
              </div>
              <h3 style="font-size:22px;font-weight:700;color:${theme.textColor};margin:0 0 12px 0;">${item.title}</h3>
              <p style="font-size:16px;color:${theme.textMuted};line-height:1.45;margin:0;">${item.desc}</p>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
  } else if (layout === 'quote') {
    const q = data.quote || { text: '', author: '', role: '' }
    contentHtml = `
      <div style="display:flex;flex-direction:column;justify-content:center;height:100%;max-width:1300px;margin:0 auto;text-align:center;">
        ${data.badge ? `<div class="badge" style="align-self:center;">${data.badge}</div>` : ''}
        <div style="font-size:100px;line-height:1;color:${theme.accent};font-family:serif;opacity:0.4;margin-top:20px;">“</div>
        <p style="font-size:38px;font-weight:600;line-height:1.35;letter-spacing:-0.02em;color:${theme.textColor};margin:-40px 0 40px 0;">
          ${q.text}
        </p>
        <div>
          <div style="font-size:24px;font-weight:750;color:${theme.textColor};">${q.author}</div>
          <div style="font-size:18px;color:${theme.textMuted};margin-top:4px;">${q.role}</div>
        </div>
      </div>
    `
  } else if (layout === 'conclusion') {
    contentHtml = `
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;max-width:1200px;margin:0 auto;text-align:center;">
        ${data.badge ? `<div class="badge">${data.badge}</div>` : ''}
        <h2 style="font-size:64px;font-weight:850;letter-spacing:-0.03em;margin:24px 0 16px 0;color:${theme.textColor};">
          ${data.title || 'Thank You'}
        </h2>
        <p style="font-size:24px;color:${theme.textMuted};max-width:800px;margin-bottom:48px;">
          ${data.subtitle || ''}
        </p>
        ${
          data.contact
            ? `
          <div class="card" style="padding:28px 48px;display:flex;gap:36px;font-size:18px;">
            ${data.contact.email ? `<div><span style="color:${theme.textMuted};">Email:</span> <strong style="color:${theme.textColor};">${data.contact.email}</strong></div>` : ''}
            ${data.contact.web ? `<div><span style="color:${theme.textMuted};">Website:</span> <strong style="color:${theme.textColor};">${data.contact.web}</strong></div>` : ''}
          </div>
        `
            : ''
        }
      </div>
    `
  }

  // Serialized metadata in comments for zero-loss roundtrip parsing
  const metadataComment = `<!-- doop-deck-spec: ${JSON.stringify({ layout, theme: spec.theme, data })} -->`

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1920, height=1080, initial-scale=1">
<title>${data.title || 'Presentation Slide'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: ${theme.gradient};
    color: ${theme.textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 72px 96px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: ${theme.badgeBg};
    color: ${theme.badgeText};
    width: fit-content;
  }
  .card {
    background: ${theme.cardBg};
    border: 1px solid ${theme.cardBorder};
    border-radius: 16px;
    backdrop-filter: blur(12px);
  }
</style>
</head>
<body data-slide-layout="${layout}" data-slide-theme="${spec.theme}">
  ${metadataComment}
  <main style="flex:1;display:flex;flex-direction:column;">
    ${contentHtml}
  </main>
  <footer style="display:flex;justify-content:space-between;align-items:center;font-size:14px;color:${theme.textMuted};opacity:0.75;padding-top:20px;">
    <div>Doop Interactive Deck</div>
    <div>${data.title || ''}</div>
  </footer>
</body>
</html>`
}

export function parseSlideSpec(html: string): DeckSlideSpec {
  // 1. Try extracting exact JSON comment spec
  const match = html.match(/<!-- doop-deck-spec:\s*([\s\S]*?)\s*-->/)
  const jsonStr = match?.[1]
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr)
      if (parsed && typeof parsed === 'object' && parsed.layout && parsed.theme) {
        return parsed as DeckSlideSpec
      }
    } catch {
      // ignore
    }
  }

  // 2. Fallback heuristic detection for raw HTML or foreign frames
  let layout: DeckLayoutRole = 'cover'
  const lMatch = html.match(/data-slide-layout="([^"]+)"/)
  const layoutAttr = lMatch?.[1]
  if (layoutAttr && LAYOUT_DEFINITIONS.some((d) => d.id === layoutAttr)) {
    layout = layoutAttr as DeckLayoutRole
  } else if (html.includes('metrics') || html.includes('ARR') || html.includes('KPI')) {
    layout = 'metrics'
  } else if (html.includes('SWOT') || html.includes('STRENGTHS')) {
    layout = 'swot'
  } else if (html.includes('Roadmap') || html.includes('timeline')) {
    layout = 'roadmap'
  }

  let theme = 'modern-dark'
  const tMatch = html.match(/data-slide-theme="([^"]+)"/)
  const themeAttr = tMatch?.[1]
  if (themeAttr && themeAttr in DECK_THEMES) {
    theme = themeAttr
  }

  // Extract text fields where possible
  const titleMatch = html.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/i)
  const titleContent = titleMatch?.[1]
  const title = titleContent ? titleContent.replace(/<[^>]+>/g, '').trim() : 'Presentation Slide'

  const subtitleMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  const subtitleContent = subtitleMatch?.[1]
  const subtitle = subtitleContent ? subtitleContent.replace(/<[^>]+>/g, '').trim() : ''

  const defaultData = getDefaultSlideData(layout)
  return {
    layout,
    theme,
    data: {
      ...defaultData,
      title: title || defaultData.title,
      subtitle: subtitle || defaultData.subtitle,
    },
  }
}

export function createStarterDeck(themeId: string = 'modern-dark'): DeckSlideSpec[] {
  return [
    { layout: 'cover', theme: themeId, data: getDefaultSlideData('cover') },
    { layout: 'agenda', theme: themeId, data: getDefaultSlideData('agenda') },
    { layout: 'metrics', theme: themeId, data: getDefaultSlideData('metrics') },
    { layout: 'split', theme: themeId, data: getDefaultSlideData('split') },
    { layout: 'swot', theme: themeId, data: getDefaultSlideData('swot') },
    { layout: 'roadmap', theme: themeId, data: getDefaultSlideData('roadmap') },
    { layout: 'conclusion', theme: themeId, data: getDefaultSlideData('conclusion') },
  ]
}
