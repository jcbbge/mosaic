// The original lab's rotated-child construction, with real text-bearing planes.
// Each pane owns its text; no screen-aligned overlay or visibility switch.
export function createScene(stage, world, onFocus, onSettled) {
  const W = 1000;
  let height = 740, current = [], animation = 0;
  const elements = new Map();
  const frame = () => new DOMMatrix([0, height / W, -W / (2 * height), 0, W, 0]);
  const decomposition = m => ({ x: m.e, y: m.f, angle: Math.atan2(m.b, m.a) * 180 / Math.PI, sx: Math.hypot(m.a, m.b), sy: (m.a * m.d - m.b * m.c) / Math.hypot(m.a, m.b) });
  const blend = (a, b, t) => a + (b - a) * t;
  function layout(ids) {
    let matrix = new DOMMatrix();
    return new Map(ids.map((id, i) => { const value = [id, { matrix, width: i === ids.length - 1 ? W : W / 2 }]; matrix = matrix.multiply(frame()); return value; }));
  }
  function resize() {
    const width = stage.clientWidth;
    if (!width) return;
    const available = innerHeight - stage.getBoundingClientRect().top - scrollY - 115;
    const nextHeight = innerWidth <= 760 ? 1100 : Math.max(360, Math.min(740, available * W / width));
    if (nextHeight !== height) { height = nextHeight; animation && cancelAnimationFrame(animation); show(current, false); }
    stage.style.height = `${height * width / W}px`;
    world.style.transform = `scale(${width / W})`;
    world.style.height = `${height}px`;
    world.style.setProperty('--reading-scale', W / width);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  window.addEventListener('resize', resize);
  function show(ids, animate = true, mode = 'pivot', makePane) {
    cancelAnimationFrame(animation);
    const old = layout(current), next = layout(ids);
    const incoming = !old.has(ids[0]);
    const initial = incoming && current.length ? frame().inverse() : old.get(ids[0])?.matrix || new DOMMatrix();
    const origin = decomposition(initial);
    const union = [...new Set([...ids, ...current])];
    const final = new Map(next);
    for (const id of current) if (!final.has(id)) final.set(id, { matrix: initial.inverse().multiply(old.get(id).matrix), width: old.get(id).width });
    for (const id of union) {
      let element = elements.get(id);
      if (!element) { element = makePane(id); elements.set(id, element); world.append(element); }
      element.style.height = `${height}px`;
      element.style.width = `${final.get(id).width}px`;
      element.dataset.focused = String(id === ids[0]);
      element.querySelector('.pane-scroll').inert = id !== ids[0];
      element.querySelector('.pane-action').hidden = id === ids[0];
    }
    const duration = !animate || matchMedia('(prefers-reduced-motion: reduce)').matches || !current.length ? 0 : 760;
    stage.dataset.moving = String(Boolean(duration));
    const start = performance.now();
    function paint(now) {
      const progress = duration ? Math.min(1, (now - start) / duration) : 1;
      const t = (1 - Math.cos(Math.PI * progress)) / 2;
      const camera = new DOMMatrix().translate(origin.x * (1 - t), origin.y * (1 - t)).rotate(origin.angle * (1 - t)).scale(blend(origin.sx, 1, t), blend(origin.sy, 1, t));
      for (const [id, target] of final) {
        const element = elements.get(id);
        let transform = camera.multiply(target.matrix);
        if (mode === 'shutter') {
          const from = old.get(id)?.matrix || initial.multiply(target.matrix);
          const a = decomposition(from), b = decomposition(target.matrix);
          let angle = b.angle - a.angle;
          if (angle > 180) angle -= 360;
          if (angle < -180) angle += 360;
          transform = new DOMMatrix().translate(blend(a.x, b.x, t), blend(a.y, b.y, t)).rotate(a.angle + angle * t).scale(blend(a.sx, b.sx, t), blend(a.sy, b.sy, t));
        } else if (mode === 'scale' || mode === 'hybrid') {
          const amount = Math.sin(Math.PI * t);
          transform = new DOMMatrix().translate(mode === 'hybrid' ? 35 * amount : 0, 0).translate(500, height / 2).scale(1 - .08 * amount).translate(-500, -height / 2).multiply(transform);
        }
        element.style.transform = transform.toString();
        // Even the optional fading treatment keeps its text present throughout.
        element.style.opacity = mode === 'scale' || mode === 'hybrid' ? String(1 - .2 * Math.sin(Math.PI * t)) : '1';
      }
      if (progress < 1) animation = requestAnimationFrame(paint);
      else {
        stage.dataset.moving = 'false';
        for (const id of union) if (!next.has(id)) { elements.get(id).remove(); elements.delete(id); }
        onSettled?.();
      }
    }
    current = ids;
    paint(start);
    resizeScale();
  }
  function resizeScale() { world.style.transform = `scale(${stage.clientWidth / W})`; world.style.height = `${height}px`; }
  world.addEventListener('click', event => {
    const button = event.target.closest('[data-focus]');
    if (button) onFocus(button.dataset.focus);
    else {
      const pane = event.target.closest('.pane');
      if (pane && pane.dataset.focused !== 'true') onFocus(pane.dataset.turn);
    }
  });
  return { show, get: id => elements.get(id), resize };
}
