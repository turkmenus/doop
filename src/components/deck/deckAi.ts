import type { DeckLayoutRole, DeckSlideSpec, SlideContentData } from './deckTemplates'

export interface AiDeckRequest {
  prompt: string
  slideCount?: number
  theme?: string
  language?: 'tr' | 'en'
}

export function synthesizeDeckFromPrompt(req: AiDeckRequest): DeckSlideSpec[] {
  const count = Math.max(2, Math.min(req.slideCount ?? 5, 8))
  const theme = req.theme || 'modern-dark'
  const promptLower = req.prompt.toLowerCase()
  const isTr =
    req.language === 'tr' ||
    /[ığüşöçİĞÜŞÖÇ]/.test(req.prompt) ||
    promptLower.includes('sunum') ||
    promptLower.includes('için')

  // Extract key topic from prompt
  const topic = req.prompt.trim()

  // Layout progression based on slide count
  const layoutSequence: DeckLayoutRole[] =
    count === 3
      ? ['cover', 'metrics', 'conclusion']
      : count === 4
        ? ['cover', 'split', 'metrics', 'conclusion']
        : count === 5
          ? ['cover', 'agenda', 'metrics', 'roadmap', 'conclusion']
          : count === 6
            ? ['cover', 'agenda', 'split', 'metrics', 'roadmap', 'conclusion']
            : ['cover', 'agenda', 'split', 'metrics', 'swot', 'roadmap', 'conclusion']

  return layoutSequence.slice(0, count).map((layout) => {
    let data: SlideContentData = {}

    if (layout === 'cover') {
      data = {
        badge: isTr ? 'STRATEJİK SUNUM' : 'EXECUTIVE KEYNOTE',
        title: isTr ? `${topic}` : `${topic}`,
        subtitle: isTr
          ? 'Yapay Zeka Destekli Ürün Stratejisi, Büyüme Metrikleri ve Yol Haritası'
          : 'Product Strategy, Market Growth & Execution Milestones',
        author: isTr ? 'Doop AI Stüdyosu' : 'Doop Design Studio',
        date: isTr ? 'Ekim 2026' : 'October 2026',
      }
    } else if (layout === 'agenda') {
      data = {
        badge: isTr ? 'İÇİNDEKİLER' : 'TABLE OF CONTENTS',
        title: isTr ? 'Sunum Akışı ve Başlıklar' : 'Executive Overview',
        subtitle: isTr ? 'Bugün ele alacağımız temel stratejik alanlar' : 'Key topics covered across this presentation',
        columns: isTr
          ? [
              {
                title: '01. Pazar & Fırsat',
                bullets: [
                  'Sektör dinamikleri ve boşluklar',
                  'Müşteri problemleri ve talep',
                  'Pazar büyüklüğü (TAM/SAM)',
                ],
              },
              {
                title: '02. Çözüm & Değer',
                bullets: ['Yapay zeka odaklı mimari', 'Çok kullanıcılı işbirliği', 'Yüksek verimlilik çarpanı'],
              },
              {
                title: '03. Büyüme & Gelecek',
                bullets: ['Temel operasyonel metrikler', 'Gelir modeli ve ölçeklenme', 'Gelecek çeyrek yol haritası'],
              },
            ]
          : [
              {
                title: '01. Market Opportunity',
                bullets: ['Industry landscape & shifts', 'Customer pain & urgency', 'Addressable market TAM/SAM'],
              },
              {
                title: '02. Solution & Product',
                bullets: [
                  'AI-native architecture',
                  'Multiplayer real-time collaboration',
                  'Workflow velocity multiplier',
                ],
              },
              {
                title: '03. Growth & Execution',
                bullets: ['Core operating KPIs', 'Scalable revenue model', 'Quarterly roadmap ahead'],
              },
            ],
      }
    } else if (layout === 'metrics') {
      data = {
        badge: isTr ? 'PERFORMANS & TRAKSİYON' : 'TRACTION & METRICS',
        title: isTr ? 'Hızlı Büyüme ve Metrikler' : 'Key Performance Indicators',
        subtitle: isTr
          ? 'Son 12 ayda elde edilen operasyonel sonuçlar'
          : 'Measurable performance over the past 12 months',
        metrics: isTr
          ? [
              { value: '$3.4M', label: 'Yıllık Tekrarlayan Gelir (ARR)', change: '+185% Yıllık' },
              { value: '140K+', label: 'Aktif Aylık Kullanıcı', change: '+92% YoY' },
              { value: '%98.6', label: 'Müşteri Memnuniyet Oranı', change: 'Sektör Lideri' },
            ]
          : [
              { value: '$3.4M', label: 'Annual Recurring Revenue (ARR)', change: '+185% YoY' },
              { value: '140K+', label: 'Monthly Active Users', change: '+92% YoY' },
              { value: '98.6%', label: 'Net Retention Rate', change: 'Top Decile' },
            ],
      }
    } else if (layout === 'split') {
      data = {
        badge: isTr ? 'ÇÖZÜM KARŞILAŞTIRMASI' : 'STRATEGIC ADVANTAGE',
        title: isTr ? 'Mevcut Zorluklar vs Yeni Yaklaşım' : 'Current Friction vs Next-Gen Model',
        subtitle: isTr
          ? 'Geleneksel yöntemlerle modern AI ekosisteminin farkı'
          : 'Transforming friction into compounding leverage',
        columns: isTr
          ? [
              {
                title: 'Geleneksel Süreçler',
                bullets: [
                  'Yavaş elden ele aktarımlar ve kopuk iletişim',
                  'Statik ve entegre olmayan araçlar',
                  'Yapay zekanın kopyala-yapıştır ile sınırlı kalması',
                  'Gerçek zamanlı işbirliği eksikliği',
                ],
              },
              {
                title: 'Gelişmiş Çözümümüz',
                bullets: [
                  'Doğrudan canlı ve etkileşimli çalışan altyapı',
                  'İnsanlar ve yapay zeka ajanları yan yana işbirliği içinde',
                  'Saniyeler içinde tasarım ve düzenleme kabiliyeti',
                  'Tek tıkla PowerPoint (.pptx) ve web çıktısı',
                ],
              },
            ]
          : [
              {
                title: 'Legacy Workflow',
                bullets: [
                  'Fragmented toolchains and slow manual handoffs',
                  'Static assets disconnected from production code',
                  'AI usage limited to isolated copy-paste prompts',
                  'Zero live multi-user alignment with agents',
                ],
              },
              {
                title: 'Our Modern Solution',
                bullets: [
                  'Live interactive runtime with full fidelity',
                  'Human and AI agents co-creating simultaneously',
                  'Instant layout re-composition and live updates',
                  'One-click export to editable PPTX and interactive web',
                ],
              },
            ],
      }
    } else if (layout === 'swot') {
      data = {
        badge: isTr ? 'STRATEJİK MATRİS' : 'SWOT MATRIX',
        title: isTr ? 'Stratejik Değerlendirme' : 'Strategic Assessment',
        subtitle: isTr ? 'Güçlü yönlerimiz ve pazar fırsatlarımız' : 'Internal capabilities and market opportunities',
        swot: isTr
          ? {
              strengths: [
                'Yenilikçi yapay zeka orkestrasyonu',
                'Yüksek kullanıcı bağlılığı',
                'Hızlı geliştirme döngüsü',
              ],
              weaknesses: ['Yüksek sunucu GPU/hesaplama maliyeti', 'Gelişmekte olan kurumsal satış ağı'],
              opportunities: ['Büyük ölçekli kurumsal dijitalleşme', 'Yeni küresel pazarlara açılma'],
              threats: ['Büyük teknoloji şirketlerinin benzer yatırımları', 'Hızla değişen model API standartları'],
            }
          : {
              strengths: [
                'Proprietary AI agent orchestration',
                'High organic user retention',
                'Fast release cycle velocity',
              ],
              weaknesses: ['Server compute cost during mass synthesis', 'Early-stage enterprise sales network'],
              opportunities: ['Enterprise digital design transformation', 'Global expansion into new verticals'],
              threats: ['Incumbent feature releases', 'Volatile AI inference pricing'],
            },
      }
    } else if (layout === 'roadmap') {
      data = {
        badge: isTr ? 'YOL HARİTASI' : 'EXECUTION TIMELINE',
        title: isTr ? 'Gelecek Dönem Planları' : 'Strategic Roadmap',
        subtitle: isTr
          ? 'Önümüzdeki çeyreklerde odaklanacağımız hedefler'
          : 'Key milestones driving our product vision',
        timeline: isTr
          ? [
              { phase: 'Q1', title: 'Temel Platform', desc: 'Canlı işbirliği ve yapay zeka entegrasyonu' },
              { phase: 'Q2', title: 'Sunum & Deck Modu', desc: 'Düzenlenebilir PPTX çıktısı ve interaktif konsol' },
              { phase: 'Q3', title: 'Kurumsal Güvenlik', desc: 'Gelişmiş izinler ve ekip yönetim paneli' },
              { phase: 'Q4', title: 'Otonom Süreçler', desc: 'Arka planda çalışan akıllı görevler' },
            ]
          : [
              { phase: 'Q1', title: 'Core Platform', desc: 'Realtime collaboration and AI integration' },
              { phase: 'Q2', title: 'Deck Engine', desc: 'Editable PPTX export and interactive console' },
              { phase: 'Q3', title: 'Enterprise Controls', desc: 'Granular permissions and team workspaces' },
              { phase: 'Q4', title: 'Autonomous Workflows', desc: 'Automated background execution' },
            ],
      }
    } else if (layout === 'conclusion') {
      data = {
        badge: isTr ? 'KAPANIŞ & İLETİŞİM' : 'NEXT STEPS',
        title: isTr ? 'Birlikte İnşa Edelim' : 'Building What’s Next',
        subtitle: isTr
          ? 'Zaman ayırdığınız için teşekkür ederiz. Sorularınızı yanıtlamaktan memnuniyet duyarız.'
          : 'Thank you for your time. We are excited to partner with you.',
        description: isTr ? 'Hemen bugün başlayın veya demo talep edin.' : 'Get started today or request a live demo.',
        contact: {
          email: 'contact@doop.design',
          web: 'https://doop.design',
        },
      }
    }

    return {
      layout,
      theme,
      data,
    }
  })
}

export function polishSlideContent(currentSpec: DeckSlideSpec, instruction: string): DeckSlideSpec {
  const inst = instruction.toLowerCase()
  const data = { ...currentSpec.data }

  if (inst.includes('türkçe') || inst.includes('translate to turkish')) {
    data.badge = data.badge ? 'ÖZET' : undefined
    if (data.title) data.title = `Gelişmiş ${data.title}`
  } else if (inst.includes('english') || inst.includes('translate to english')) {
    data.badge = data.badge ? 'SUMMARY' : undefined
  }

  if (inst.includes('metric') || inst.includes('kpi') || inst.includes('sayı') || inst.includes('finans')) {
    currentSpec.layout = 'metrics'
    data.metrics = [
      { value: '$5.2M', label: 'ARR (Annual Recurring Revenue)', change: '+240% YoY' },
      { value: '210K', label: 'Active Monthly Designers', change: '+115% YoY' },
      { value: '99.2%', label: 'Retention Rate', change: 'Top 5%' },
    ]
  }

  if (inst.includes('executive') || inst.includes('iddialı') || inst.includes('kurumsal')) {
    data.title = `Strategic Advantage: ${data.title || 'Market Leadership'}`
    data.subtitle = 'Accelerating business impact through autonomous design intelligence.'
  }

  return {
    ...currentSpec,
    data,
  }
}
