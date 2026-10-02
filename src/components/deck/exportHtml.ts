import type { Frame } from '../../../shared/types'

export function exportDeckToHtml(deckTitle: string, frames: Frame[]): void {
  const slidesHtml = frames
    .map(
      (frame, idx) => `
    <section class="slide-wrapper ${idx === 0 ? 'active' : ''}" data-index="${idx}" id="slide-${idx}">
      <iframe srcdoc="${frame.html.replace(/"/g, '&quot;')}" class="slide-frame"></iframe>
    </section>
  `,
    )
    .join('\n')

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${deckTitle || 'Presentation Deck'} · Doop</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, html {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #090B10;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #F8FAFC;
  }
  #presentation-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .slide-stage {
    position: relative;
    width: 1920px;
    height: 1080px;
    transform-origin: center center;
    background: #000;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  }
  .slide-wrapper {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
    transform: scale(0.98);
  }
  .slide-wrapper.active {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
    z-index: 10;
  }
  .slide-frame {
    width: 1920px;
    height: 1080px;
    border: none;
    display: block;
    background: transparent;
  }
  /* Floating HUD Controls */
  #hud {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    z-index: 100;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  body:hover #hud, #hud:focus-within {
    opacity: 1;
  }
  .hud-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #F8FAFC;
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .hud-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
  }
  .hud-counter {
    font-size: 13px;
    font-weight: 700;
    color: #94A3B8;
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
  }
  /* Progress Bar */
  #progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: #38BDF8;
    z-index: 200;
    transition: width 0.2s ease;
  }
</style>
</head>
<body>
  <div id="progress-bar" style="width: ${(1 / Math.max(1, frames.length)) * 100}%;"></div>
  <div id="presentation-container">
    <div class="slide-stage" id="slide-stage">
      ${slidesHtml}
    </div>
  </div>

  <div id="hud">
    <button class="hud-btn" id="prev-btn">‹ Previous</button>
    <div class="hud-counter" id="hud-counter">1 / ${frames.length}</div>
    <button class="hud-btn" id="next-btn">Next ›</button>
    <button class="hud-btn" id="fs-btn">Fullscreen (F)</button>
  </div>

  <script>
    let currentIdx = 0;
    const total = ${frames.length};
    const slides = document.querySelectorAll('.slide-wrapper');
    const counter = document.getElementById('hud-counter');
    const progressBar = document.getElementById('progress-bar');
    const stage = document.getElementById('slide-stage');

    function resizeStage() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min((vw - 32) / 1920, (vh - 32) / 1080);
      stage.style.transform = 'scale(' + scale + ')';
    }
    window.addEventListener('resize', resizeStage);
    resizeStage();

    function goTo(idx) {
      if (idx < 0 || idx >= total) return;
      slides[currentIdx]?.classList.remove('active');
      currentIdx = idx;
      slides[currentIdx]?.classList.add('active');
      counter.textContent = (currentIdx + 1) + ' / ' + total;
      progressBar.style.width = (((currentIdx + 1) / total) * 100) + '%';
    }

    document.getElementById('prev-btn').addEventListener('click', () => goTo(currentIdx - 1));
    document.getElementById('next-btn').addEventListener('click', () => goTo(currentIdx + 1));

    document.getElementById('fs-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') {
        goTo(currentIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        goTo(currentIdx - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    });
  </script>
</body>
</html>`

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(deckTitle || 'presentation').replace(/[^a-zA-Z0-9_-]/g, '_')}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
