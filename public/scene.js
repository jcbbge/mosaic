// Sheets live in one stable coordinate system. Only the camera moves.
export function createScene(stage, world, onFocus) {
  const W = 1000, H = 740;
  const fold = new DOMMatrix([0, H / W, -W / (2 * H), 0, W, 0]);
  const elements = new Map(), matrices = new Map();
  let sheets = [], active, board = false, camera = new DOMMatrix(), animation, transition, motion = 'pivot', revision = 0;
  const parts = m => ({ x: m.e, y: m.f, angle: Math.atan2(m.b, m.a) * 180 / Math.PI, sx: Math.hypot(m.a, m.b), sy: (m.a * m.d - m.b * m.c) / Math.hypot(m.a, m.b) });
  function paint() { world.style.transform = camera.toString(); }
  function stop() {
    revision++;
    transition?.skipTransition(); transition = null;
    if (animation) {
      camera = new DOMMatrix(getComputedStyle(world).transform);
      animation.cancel(); animation = null; paint();
    }
    stage.dataset.moving = 'false';
  }
  function move(target, animate, direction = 1) {
    stop();
    const current = revision;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduced) { camera = target; paint(); return; }
    const tokens = getComputedStyle(stage);
    stage.dataset.moving = 'true';
    if (motion === 'shutter' && document.startViewTransition) {
      document.documentElement.dataset.shutterDirection = direction < 0 ? 'back' : 'forward';
      const pending = document.startViewTransition(() => {
        if (current === revision) { camera = target; paint(); }
      });
      transition = pending;
      // Skips are expected on rapid navigation; failed snapshots still show the saved target.
      pending.ready.catch(() => { if (current === revision) { camera = target; paint(); } });
      const settled = () => {
        if (transition === pending) { transition = null; stage.dataset.moving = 'false'; }
      };
      pending.finished.then(settled, settled);
      return;
    }
    const a = parts(camera), b = parts(target);
    let angle = b.angle - a.angle;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    const transform = (p, rotation) => `translate(${p.x}px, ${p.y}px) rotate(${rotation}deg) scale(${p.sx}, ${p.sy})`;
    camera = target; paint();
    const pending = world.animate([
      { transform: transform(a, a.angle) }, { transform: transform(b, a.angle + angle) },
    ], { duration: parseFloat(tokens.getPropertyValue('--duration-board')), easing: tokens.getPropertyValue('--ease-in-out').trim() });
    animation = pending;
    pending.finished.then(() => {
      if (animation === pending) { animation = null; stage.dataset.moving = 'false'; }
    }, () => {});
  }
  function fit(animate = true) {
    const points = sheets.flatMap((s, i) => [[0, 0], [i ? 500 : W, 0], [0, H], [i ? 500 : W, H]].map(([x, y]) => matrices.get(s.id).transformPoint({ x, y })));
    if (!points.length) return;
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
    const scale = Math.min((stage.clientWidth - 90) / (maxX - minX), (stage.clientHeight - 130) / (maxY - minY));
    move(new DOMMatrix().translate(stage.clientWidth / 2, stage.clientHeight / 2 - 15).scale(scale).translate(-(minX + maxX) / 2, -(minY + maxY) / 2), animate);
  }
  function focus(id, animate = true) {
    const direction = sheets.findIndex(s => s.id === id) - sheets.findIndex(s => s.id === active);
    active = id;
    for (const [key, element] of elements) {
      element.dataset.focused = String(key === id && !board);
      element.querySelector('.sheet-content').inert = board || key !== id;
      element.querySelector('.sheet-focus').hidden = !board && key === id;
    }
    if (board) { fit(animate); return; }
    const narrow = stage.clientWidth < 700;
    const width = narrow ? 500 : W;
    const scale = Math.min(stage.clientWidth / width, stage.clientHeight / H);
    const target = new DOMMatrix().translate((stage.clientWidth - width * scale) / 2, 0).scale(scale).multiply(matrices.get(id).inverse());
    move(target, animate, direction);
  }
  function show(next, id, makePane, animate = true) {
    sheets = next;
    let matrix = new DOMMatrix();
    next.forEach((sheet, i) => {
      matrices.set(sheet.id, matrix);
      let element = elements.get(sheet.id);
      if (!element) { element = makePane(sheet); elements.set(sheet.id, element); world.append(element); }
      element.style.width = `${i ? 500 : W}px`;
      element.style.height = `${H}px`;
      element.style.transform = matrix.toString();
      matrix = matrix.multiply(fold.inverse());
    });
    focus(id, animate);
  }
  function nudge(transform) { stop(); camera = transform.multiply(camera); paint(); }
  function zoom(amount, x = stage.clientWidth / 2, y = stage.clientHeight / 2) {
    const scale = Math.hypot(camera.a, camera.b) * amount;
    if (scale < 0.000001 || scale > 8) return;
    nudge(new DOMMatrix().translate(x, y).scale(amount).translate(-x, -y));
  }
  let drag;
  stage.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0 || event.target.closest('.artifact, button, textarea') || stage.dataset.drawing === 'true') return;
    drag = { x: event.clientX, y: event.clientY }; stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!drag) return;
    nudge(new DOMMatrix().translate(event.clientX - drag.x, event.clientY - drag.y));
    drag = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', () => { drag = null; });
  stage.addEventListener('pointercancel', () => { drag = null; });
  stage.addEventListener('wheel', event => {
    if (event.target.closest('textarea')) return;
    event.preventDefault(); const box = stage.getBoundingClientRect();
    zoom(Math.exp(-event.deltaY * .001), event.clientX - box.left, event.clientY - box.top);
  }, { passive: false });
  world.addEventListener('click', event => {
    const button = event.target.closest('[data-focus]');
    if (button) onFocus(button.dataset.focus, event.detail !== 0);
  });
  new ResizeObserver(() => { if (active) focus(active, false); }).observe(stage);
  return {
    show, get: id => elements.get(id),
    board(value, animate = true) { board = value; focus(active, animate); },
    motion(value) { motion = value; },
    fit, zoom,
    rotate(degrees) { const x = stage.clientWidth / 2, y = stage.clientHeight / 2; nudge(new DOMMatrix().translate(x, y).rotate(degrees).translate(-x, -y)); },
    local(id, x, y) { stop(); const box = stage.getBoundingClientRect(); return camera.multiply(matrices.get(id)).inverse().transformPoint({ x: x - box.left, y: y - box.top }); },
  };
}
