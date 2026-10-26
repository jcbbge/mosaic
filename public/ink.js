import { createSvgRenderer, resolveOptions, buildMarkGeometry } from '/vendor/highlighters.js';

// Highlighters' convenience API measures screen rectangles. These panes rotate
// and scale, so measure a text-only copy in local coordinates and use the core's
// geometry + ink renderer. The source text itself is never wrapped or rewritten.
export function mountInk(copy, pieces) {
  let painted = [];
  function clear() {
    for (const { renderer, layer } of painted) { renderer.unmount(); layer.remove(); }
    painted = [];
  }
  function paint() {
    clear();
    if (!copy.isConnected || !copy.clientWidth) return;
    const text = copy.firstChild?.nodeType === Node.TEXT_NODE ? copy.firstChild.textContent : '';
    if (!text) return;
    const style = getComputedStyle(copy), measure = document.createElement('div');
    measure.textContent = text;
    measure.setAttribute('aria-hidden', 'true');
    Object.assign(measure.style, { position: 'fixed', left: '-20000px', top: '0', width: `${copy.clientWidth}px`, font: style.font, letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing, whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap, pointerEvents: 'none', visibility: 'hidden' });
    document.body.append(measure);
    const origin = measure.getBoundingClientRect();
    for (const piece of pieces) {
      const { start, end } = piece.source;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > text.length || text.slice(start, end) !== piece.original) continue;
      const range = document.createRange(); range.setStart(measure.firstChild, start); range.setEnd(measure.firstChild, end);
      const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
      const options = resolveOptions({ color: { palette: 'fluorescent', swatch: 'pink' }, tip: { type: piece.nib || 'chisel' }, opacity: .8, ink: { flow: .7, startEndBuildup: .75 }, animation: { draw: false } });
      const lines = rects.map((r, i) => buildMarkGeometry({ left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height, seed: start + i, isFirst: i === 0, isLast: i === rects.length - 1 }, options, start + i));
      const layer = document.createElement('div'); layer.className = 'ink-layer'; layer.setAttribute('aria-hidden', 'true');
      copy.append(layer);
      const renderer = createSvgRenderer(); renderer.mount({ container: layer, options, lines, ranges: [] });
      painted.push({ renderer, layer });
    }
    measure.remove();
  }
  const observer = new ResizeObserver(paint); observer.observe(copy); paint();
  return () => { observer.disconnect(); clear(); };
}
