import { moves, lenses, freshInquiry, contextFor, beginTurn, addPiece, recover, unfold } from './inquiry.js';
import { createScene } from './scene.js';
import { mountInk } from './ink.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const key = 'mosaic-inquiries-v1';
let inquiry = freshInquiry(), library = {}, controller, recognition, storageBlocked = false;
let board = false, drawing = null;
let pointer = { x: innerWidth / 2, y: innerHeight / 2 }, intentPoint = null;
let selectedExcerpt = null, intentAnchor = { ...pointer };
let inkDisposers = [];
try {
  const saved = JSON.parse(localStorage.getItem(key) || 'null');
  if (saved) { library = saved.inquiries; inquiry = recover(library[saved.current]); }
} catch { storageBlocked = true; }
const tell = text => { $('notice').textContent = text; };
function save() {
  library[inquiry.id] = inquiry;
  if (storageBlocked) return;
  try { localStorage.setItem(key, JSON.stringify({ current: inquiry.id, inquiries: library })); }
  catch { storageBlocked = true; $('storage').textContent = 'Storage unavailable. Export before closing.'; tell('This change could not be saved. Export before closing this tab.'); }
}
const scene = createScene($('stage'), $('world'), focusSheet);
function focusSheet(id, animate = true) {
  $('intent').hidePopover();
  finishDrawing(); inquiry.activeWorkspace = id;
  if (board) scene.board(false, animate);
  board = false; save(); renderBoard(animate); controls();
}
function makeSheet(sheet) {
  const pane = document.createElement('article');
  pane.className = `pane${sheet.id === inquiry.workspaces[0].id ? ' origin' : ''}`;
  pane.dataset.workspace = sheet.id;
  pane.innerHTML = `<h2 class="sheet-title">${escape(sheet.label)}</h2><button class="sheet-focus" data-focus="${sheet.id}">Open sheet ↗</button><div class="sheet-content"></div>`;
  return pane;
}
function path(stroke) { return stroke.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '); }
function sketchSVG(piece) {
  const points = piece.strokes.flat();
  if (!points.length) return '';
  const x = Math.min(...points.map(p => p.x)) - 8, y = Math.min(...points.map(p => p.y)) - 8;
  const w = Math.max(...points.map(p => p.x)) - x + 8, h = Math.max(...points.map(p => p.y)) - y + 8;
  return `<svg viewBox="${x} ${y} ${Math.max(w, 40)} ${Math.max(h, 40)}" aria-label="Your sketch">${piece.strokes.map(s => `<path d="${path(s)}"/>`).join('')}</svg>`;
}
function artifact(piece) {
  const node = document.createElement('article');
  node.className = `artifact ${piece.type}`; node.dataset.piece = piece.id;
  node.style.left = `${piece.x}px`; node.style.top = `${piece.y}px`; node.style.zIndex = piece.z;
  node.dataset.resolved = String(Boolean(piece.resolved));
  const kind = piece.type === 'comment' ? (piece.resolved ? 'resolved comment' : 'comment') : piece.type === 'image' ? 'image' : piece.type === 'drawing' ? 'sketch' : piece.source ? 'kept excerpt' : 'note';
  const target = inquiry.pieces.find(p => p.id === piece.target);
  node.innerHTML = `<div class="artifact-head"><span>${kind}</span><span>${piece.type === 'drawing' ? '<button data-edit-sketch aria-label="Edit sketch">⌁</button>' : ''}<button data-remove aria-label="Remove artifact">×</button></span></div>
    ${piece.type === 'drawing' ? sketchSVG(piece) : ''}
    ${piece.type === 'comment' && piece.target ? `<button class="comment-target" ${target ? `data-comment-target="${target.id}"` : 'disabled'}>${target ? `On ${escape(target.type)} ↗` : 'Original material removed'}</button>` : ''}
    <textarea aria-label="${piece.type === 'comment' ? 'Comment text' : piece.type === 'note' ? 'Note text' : 'Artifact caption'}" placeholder="${piece.type === 'comment' ? 'Leave a comment…' : piece.type === 'note' ? 'A thought worth keeping…' : 'Describe it for the conversation…'}">${escape(piece.text)}</textarea>
    ${piece.source ? `<button class="artifact-source" data-source="${piece.source.turn}" data-source-kind="${piece.source.kind}">From the conversation ↗</button>` : ''}
    ${piece.type === 'comment' ? `<div class="comment-replies">${piece.replies.map(r => `<div><span>You</span><p>${escape(r.text)}</p></div>`).join('')}</div><form class="comment-reply"><input name="reply" aria-label="Reply to comment" placeholder="Reply…" maxlength="2000"><button type="submit" aria-label="Post reply">↑</button></form><button data-resolve>${piece.resolved ? 'Reopen' : 'Resolve'}</button>` : ''}`;
  if (piece.type === 'image' && /^data:image\/(png|jpeg|webp);base64,/.test(piece.data || '')) {
    const img = document.createElement('img'); img.src = piece.data; img.alt = piece.text || piece.filename || 'Uploaded image';
    node.querySelector('textarea').before(img);
  }
  const textarea = node.querySelector('textarea');
  requestAnimationFrame(() => { textarea.style.height = `${Math.max(piece.type === 'note' ? 95 : 38, textarea.scrollHeight)}px`; });
  return node;
}
function renderArtifacts() {
  for (const sheet of inquiry.workspaces) {
    const content = scene.get(sheet.id).querySelector('.sheet-content');
    const pieces = inquiry.pieces.filter(p => p.workspace === sheet.id && p.id !== drawing?.editing);
    for (const node of [...content.children]) if (!pieces.some(p => p.id === node.dataset.piece)) node.remove();
    for (const piece of pieces) {
      if (!content.querySelector(`[data-piece="${piece.id}"]`)) content.append(artifact(piece));
      content.querySelector(`[data-piece="${piece.id}"]`).style.zIndex = piece.z;
    }
    if (!content.children.length) {
      const empty = document.createElement('span'); empty.className = 'sheet-empty'; empty.textContent = sheet.id === inquiry.workspaces[0].id ? '' : 'Room for another thought'; content.append(empty);
    }
  }
  if (drawing) paintDrawing();
}
function renderBoard(animate = false) { scene.show(inquiry.workspaces, inquiry.activeWorkspace, makeSheet, animate); renderArtifacts(); }
function controls() {
  document.documentElement.dataset.theme = inquiry.theme;
  $('theme').value = inquiry.theme;
  $('motion').value = inquiry.motion === 'shutter' ? 'shutter' : 'pivot';
  scene.motion($('motion').value);
  $('board-view').textContent = board ? 'Focus sheet ↙' : 'Full board ↗';
  $('board-view').setAttribute('aria-pressed', String(board));
  $('camera-controls').hidden = !board;
  for (const id of ['add-note', 'add-comment', 'draw', 'upload']) $(id).disabled = board;
  const index = inquiry.workspaces.findIndex(w => w.id === inquiry.activeWorkspace);
  $('sheet-label').textContent = board ? `${inquiry.workspaces.length} sheets` : `${index + 1} / ${inquiry.workspaces.length}`;
  $('sheet-label').title = inquiry.workspaces[index].label;
  $('previous-sheet').disabled = index === 0;
  $('next-sheet').title = index === inquiry.workspaces.length - 1 ? 'Unfold next sheet' : 'Next sheet';
  $('next-sheet').setAttribute('aria-label', $('next-sheet').title);
  $('draw').setAttribute('aria-pressed', String(Boolean(drawing)));
  $('finish-drawing').hidden = !drawing;
  $('stage').dataset.drawing = String(Boolean(drawing));
  $('turn-count').textContent = inquiry.turns.length || '';
  document.querySelector('.highlight-tools').hidden = !inquiry.turns.length;
  for (const id of ['send', 'unfold', 'new', 'sessions']) $(id).disabled = Boolean(controller);
  $('cancel').hidden = !controller; $('send').hidden = Boolean(controller);
  $('lens').innerHTML = lenses.map(l => `<option value="${l.id}" ${l.id === inquiry.lens ? 'selected' : ''}>${l.label}</option>`).join('');
  $('perspective').title = lenses.find(l => l.id === inquiry.lens)?.label;
  $('sessions').innerHTML = Object.values({ ...library, [inquiry.id]: inquiry }).map(item => `<option value="${item.id}" ${item.id === inquiry.id ? 'selected' : ''}>${escape((item.question || 'Untitled Mosaic').slice(0, 65))}</option>`).join('');
  preview();
}
function preview() { $('context-preview').textContent = JSON.stringify(contextFor(inquiry, inquiry.interjection, 'converse'), null, 2); }
function placeIntent() {
  const box = { width: $('intent').offsetWidth, height: $('intent').offsetHeight };
  const radial = $('intent').dataset.conversation !== 'true';
  const x = Math.max(12, Math.min(intentAnchor.x - (radial ? box.width / 2 : 0), innerWidth - box.width - 12));
  const y = Math.max(66, Math.min(intentAnchor.y - (radial ? box.height / 2 : 0), innerHeight - box.height - 70));
  Object.assign($('intent').style, { left: `${x}px`, top: `${y}px`, transformOrigin: `${intentAnchor.x - x}px ${intentAnchor.y - y}px` });
}
function openIntent(point = pointer, conversation = false, keyboard = false, target = null) {
  intentAnchor = { x: point.x, y: point.y };
  if (!conversation && !board) {
    const local = scene.local(inquiry.activeWorkspace, point.x, point.y);
    intentPoint = { workspace: inquiry.activeWorkspace, x: local.x, y: local.y - 60, target };
  }
  $('intent').dataset.keyboard = String(keyboard);
  $('intent').dataset.conversation = String(conversation);
  $('intent-actions').hidden = conversation; $('conversation').hidden = !conversation;
  $('transcript').hidden = !conversation || !inquiry.turns.length;
  $('add-comment').querySelector('span').textContent = target ? 'Comment here' : 'Comment';
  if (!$('intent').matches(':popover-open')) $('intent').showPopover();
  placeIntent();
  (conversation ? $('interjection') : $('write')).focus({ preventScroll: true });
  $('chat-toggle').setAttribute('aria-expanded', String(conversation));
}
function placement(type) {
  if (intentPoint?.workspace !== inquiry.activeWorkspace) return { type };
  const width = inquiry.activeWorkspace === inquiry.workspaces[0].id ? 1000 : 500;
  return { type, x: Math.max(0, Math.min(width - 300, intentPoint.x)), y: Math.max(0, Math.min(400, intentPoint.y)) };
}
function showChat(value = true) {
  if (value) {
    if ($('intent').matches(':popover-open') && $('intent').dataset.conversation === 'true') placeIntent();
    else openIntent(pointer, true);
    $('transcript').scrollTop = $('transcript').scrollHeight;
  }
  else $('intent').hidePopover();
}
function refreshInk() {
  inkDisposers.forEach(dispose => dispose()); inkDisposers = [];
  for (const message of $('transcript').querySelectorAll('.message')) {
    const pieces = [...inquiry.pieces, ...inquiry.highlights].filter(p => p.source?.turn === message.dataset.turn && p.source.kind === message.dataset.kind);
    if (pieces.length) inkDisposers.push(mountInk(message.querySelector('p'), pieces));
  }
}
function transcript() {
  inkDisposers.forEach(dispose => dispose()); inkDisposers = [];
  const messages = inquiry.turns.flatMap(t => [
    `<article class="message user" data-turn="${t.id}" data-kind="user"><div class="message-label">You <span><button data-highlight>Highlight</button><button data-pin>Pin to sheet</button></span></div><p>${escape(t.input)}</p></article>`,
    `<article class="message ${t.status === 'pending' ? 'pending' : t.status !== 'complete' ? 'error' : ''}" data-turn="${t.id}" data-kind="response"><div class="message-label">Mosaic${t.move !== 'converse' ? ` · ${escape(moves.find(m => m.id === t.move)?.label || t.move)}` : ''}<span ${!t.response ? 'hidden' : ''}><button data-highlight>Highlight</button><button data-pin>Pin to sheet</button></span></div><p>${escape(t.response || t.error || 'Thinking…')}</p></article>`,
  ]);
  $('transcript').innerHTML = messages.join('');
  $('transcript').scrollTop = $('transcript').scrollHeight;
  $('transcript').hidden = !inquiry.turns.length;
  refreshInk();
}
async function ask(input, move = 'converse') {
  if (controller || !input.trim()) return;
  recognition?.stop(); finishDrawing();
  const turn = beginTurn(inquiry, input, move, inquiry.lens);
  controller = new AbortController();
  inquiry.interjection = ''; $('interjection').value = '';
  save(); controls(); transcript(); showChat(); tell('');
  try {
    const response = await fetch('/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(turn.context), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Inference failed.');
    Object.assign(turn, { response: result.response, model: result.model, truncated: result.truncated, status: 'complete' });
  } catch (error) {
    turn.status = error.name === 'AbortError' ? 'cancelled' : 'failed';
    turn.error = error.name === 'AbortError' ? 'Cancelled. Your contribution is retained; nothing was retried.' : error.message;
    tell(turn.error);
  } finally { controller = null; save(); controls(); transcript(); }
}
function pin(text, source = null, options = {}) {
  if (board) { board = false; scene.board(false); }
  const piece = addPiece(inquiry, text, source, options); piece.created = new Date().toISOString();
  save(); renderArtifacts(); refreshInk(); controls(); return piece;
}
function paintDrawing() {
  const content = scene.get(inquiry.activeWorkspace).querySelector('.sheet-content');
  content.querySelector('.drawing-layer')?.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('drawing-layer');
  const width = inquiry.activeWorkspace === inquiry.workspaces[0].id ? 1000 : 500;
  svg.setAttribute('viewBox', `0 0 ${width} 680`);
  svg.innerHTML = drawing.strokes.map(s => `<path d="${path(s)}"/>`).join(''); content.append(svg);
}
function finishDrawing() {
  if (!drawing) return;
  if (drawing.strokes.some(s => s.length > 1)) {
    const piece = drawing.editing ? inquiry.pieces.find(p => p.id === drawing.editing) : addPiece(inquiry, '');
    piece.type = 'drawing'; piece.strokes = drawing.strokes;
    piece.annotation = `Freehand sketch, ${piece.strokes.length} strokes. Visual meaning is not inferred; use the caption.`;
    piece.created ||= new Date().toISOString();
    scene.get(piece.workspace).querySelector(`[data-piece="${piece.id}"]`)?.remove();
  }
  drawing = null; save(); renderArtifacts(); controls();
}
let stroke = null, drag = null;
function raisePiece(piece) {
  const highest = Math.max(...inquiry.pieces.filter(p => p.workspace === piece.workspace).map(p => p.z));
  if (piece.z < highest) { piece.z = highest + 1; scene.get(piece.workspace).querySelector(`[data-piece="${piece.id}"]`).style.zIndex = piece.z; save(); }
}
$('world').addEventListener('pointerdown', event => {
  if (event.button !== 0 || board || $('stage').dataset.moving === 'true') return;
  const pieceNode = event.target.closest('.artifact');
  if (pieceNode) raisePiece(inquiry.pieces.find(p => p.id === pieceNode.dataset.piece));
  const head = event.target.closest('.artifact-head');
  if (head && !event.target.closest('button')) {
    const piece = inquiry.pieces.find(p => p.id === pieceNode.dataset.piece);
    const start = scene.local(piece.workspace, event.clientX, event.clientY);
    drag = { piece, start, x: piece.x, y: piece.y, node: pieceNode };
    pieceNode.dataset.lifted = 'true';
    head.setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation();
  } else if (drawing && event.target.closest('.drawing-layer')) {
    const point = scene.local(inquiry.activeWorkspace, event.clientX, event.clientY);
    stroke = [{ x: point.x, y: point.y - 60 }]; drawing.strokes.push(stroke);
    $('world').setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation();
  }
});
$('world').addEventListener('pointermove', event => {
  if (drag) {
    const p = scene.local(drag.piece.workspace, event.clientX, event.clientY);
    const width = drag.piece.workspace === inquiry.workspaces[0].id ? 1000 : 500;
    drag.piece.x = Math.max(0, Math.min(width - drag.node.offsetWidth, drag.x + p.x - drag.start.x));
    drag.piece.y = Math.max(0, Math.min(680 - drag.node.offsetHeight, drag.y + p.y - drag.start.y));
    drag.node.style.left = `${drag.piece.x}px`; drag.node.style.top = `${drag.piece.y}px`;
  }
  if (stroke) {
    const p = scene.local(inquiry.activeWorkspace, event.clientX, event.clientY);
    stroke.push({ x: p.x, y: p.y - 60 }); paintDrawing();
  }
});
function releasePointer() { if (drag) { drag.node.dataset.lifted = 'false'; save(); } drag = null; stroke = null; }
$('world').addEventListener('pointerup', releasePointer);
$('world').addEventListener('pointercancel', releasePointer);
document.addEventListener('pointermove', event => { pointer = { x: event.clientX, y: event.clientY }; });
document.addEventListener('contextmenu', event => {
  if (!event.target.closest('#stage,#transcript')) return;
  const pane = event.target.closest('.pane');
  if (pane && pane.dataset.focused !== 'true') return;
  event.preventDefault(); selectedExcerpt = readSelection() || selectedExcerpt;
  openIntent({ x: event.clientX, y: event.clientY }, false, false, event.target.closest('[data-piece]')?.dataset.piece || null);
});
document.addEventListener('keydown', event => {
  if (event.target.closest('input,textarea,select,button,dialog,[contenteditable]')) return;
  if (event.code !== 'Space' && event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
  event.preventDefault();
  openIntent(pointer, false, true, event.target.closest('[data-piece]')?.dataset.piece || null);
});
$('stage').addEventListener('dblclick', event => {
  if (!event.target.closest('.artifact,button') && !drawing && !board) openIntent({ x: event.clientX, y: event.clientY });
});
$('intent-hint').addEventListener('click', event => openIntent(pointer, false, event.detail === 0));
$('intent').addEventListener('toggle', event => {
  if (event.newState === 'closed') { $('chat-toggle').setAttribute('aria-expanded', 'false'); recognition?.stop(); }
});
addEventListener('resize', () => { if ($('intent').matches(':popover-open')) placeIntent(); });
new ResizeObserver(() => { if ($('intent').matches(':popover-open')) placeIntent(); }).observe($('intent'));
$('world').addEventListener('input', event => {
  if (!event.target.matches('textarea')) return;
  const piece = inquiry.pieces.find(p => p.id === event.target.closest('[data-piece]')?.dataset.piece);
  if (!piece) return;
  piece.text = event.target.value;
  event.target.style.height = 'auto'; event.target.style.height = `${event.target.scrollHeight}px`;
  save(); preview();
});
$('world').addEventListener('submit', event => {
  if (!event.target.matches('.comment-reply')) return;
  event.preventDefault();
  const input = event.target.elements.reply, text = input.value.trim();
  if (!text) return;
  const piece = inquiry.pieces.find(p => p.id === event.target.closest('[data-piece]').dataset.piece);
  piece.replies.push({ id: crypto.randomUUID(), text, created: new Date().toISOString() });
  event.target.closest('.artifact').remove(); save(); renderArtifacts(); preview();
  scene.get(piece.workspace).querySelector(`[data-piece="${piece.id}"] input`).focus({ preventScroll: true });
});
$('interjection').addEventListener('input', event => { inquiry.interjection = event.target.value; save(); preview(); });
$('turn-form').addEventListener('submit', event => { event.preventDefault(); ask(inquiry.interjection); });
$('interjection').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); ask(inquiry.interjection); } });
$('unfold-form').addEventListener('submit', event => {
  event.preventDefault(); if (controller) return;
  finishDrawing();
  const move = $('skill').value, label = move ? moves.find(m => m.id === move).label : `Open sheet ${inquiry.workspaces.length + 1}`;
  unfold(inquiry, label); save(); $('unfold-dialog').close(); board = false; scene.board(false); renderBoard(true); controls();
  if (move) ask(`Apply ${label} to our current thought and the kept material. Offer a useful contribution; do not interview me.`, move);
});
$('lens').addEventListener('change', event => { inquiry.lens = event.target.value; save(); controls(); $('perspective-dialog').close(); });
$('sessions').addEventListener('change', event => { if (!controller) { finishDrawing(); save(); inquiry = recover(library[event.target.value]); save(); location.reload(); } });
function readSelection() {
  const s = window.getSelection();
  if (!s?.rangeCount || s.isCollapsed) return;
  const range = s.getRangeAt(0), node = range.commonAncestorContainer;
  const message = (node.nodeType === 1 ? node : node.parentElement)?.closest('.message');
  if (!message || !message.querySelector('p').contains(range.startContainer) || !message.querySelector('p').contains(range.endContainer)) return;
  const prefix = range.cloneRange(); prefix.selectNodeContents(message.querySelector('p')); prefix.setEnd(range.startContainer, range.startOffset);
  const raw = s.toString(); return { text: raw.trim(), turn: message.dataset.turn, kind: message.dataset.kind, start: prefix.toString().length + raw.length - raw.trimStart().length };
}
document.addEventListener('selectionchange', () => { const selection = readSelection(); if (selection) selectedExcerpt = selection; });
document.addEventListener('pointerdown', event => {
  if (event.target.closest('[data-pin],[data-highlight]')) event.preventDefault();
  else if (!event.target.closest('#nib,#intent-actions')) selectedExcerpt = null;
});
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.close) $(button.dataset.close).close();
  if (button.id === 'tools-link') { controls(); $('tools').showModal(); }
  if (button.id === 'unfold') { $('tools').close(); $('unfold-dialog').showModal(); }
  if (button.id === 'perspective') { $('tools').close(); $('perspective-dialog').showModal(); }
  if (button.id === 'previous-sheet' || button.id === 'next-sheet') {
    finishDrawing();
    const index = inquiry.workspaces.findIndex(w => w.id === inquiry.activeWorkspace);
    const target = index + (button.id === 'previous-sheet' ? -1 : 1);
    if (target === inquiry.workspaces.length) unfold(inquiry, `Open sheet ${target + 1}`);
    if (target >= 0) focusSheet(inquiry.workspaces[target].id, event.detail !== 0);
  }
  if (button.id === 'chat-toggle') {
    if ($('intent').matches(':popover-open') && $('intent').dataset.conversation === 'true') showChat(false);
    else openIntent({ x: innerWidth / 2 - 210, y: 100 }, true, event.detail === 0);
  }
  if (button.id === 'write') openIntent(intentAnchor, true, event.detail === 0);
  if (button.id === 'intent-back') openIntent(intentAnchor, false, event.detail === 0);
  if (button.id === 'highlight') {
    if (selectedExcerpt) {
      const { text, turn, kind, start } = selectedExcerpt;
      inquiry.highlights.push({ id: crypto.randomUUID(), original: text, source: { turn, kind, start, end: start + text.length }, nib: $('nib').value });
      save(); refreshInk(); selectedExcerpt = null; window.getSelection()?.removeAllRanges();
    } else tell('Select words in the conversation, then choose Highlight.');
    openIntent(intentAnchor, true, event.detail === 0);
  }
  if (button.dataset.source) {
    showChat();
    const message = $('transcript').querySelector(`[data-turn="${button.dataset.source}"][data-kind="${button.dataset.sourceKind}"]`);
    if (message) $('transcript').scrollTop = message.offsetTop - 18;
  }
  if (button.id === 'cancel') controller?.abort();
  if (button.id === 'add-note' || button.id === 'add-comment') {
    finishDrawing(); $('intent').hidePopover();
    const type = button.id === 'add-comment' ? 'comment' : 'note';
    const p = pin('', null, { ...placement(type), ...(type === 'comment' ? { target: intentPoint?.target } : {}) });
    scene.get(p.workspace).querySelector(`[data-piece="${p.id}"] textarea`).focus({ preventScroll: true });
  }
  if (button.id === 'draw') { $('intent').hidePopover(); if (drawing) finishDrawing(); else { drawing = { strokes: [] }; paintDrawing(); controls(); } }
  if (button.id === 'finish-drawing') finishDrawing();
  if (button.id === 'upload') { $('intent').hidePopover(); $('image-file').click(); }
  if (button.id === 'board-view') { $('intent').hidePopover(); finishDrawing(); board = !board; scene.board(board, event.detail !== 0); controls(); }
  if (button.id === 'fit') scene.fit(event.detail !== 0);
  if (button.id === 'zoom-in') scene.zoom(1.25);
  if (button.id === 'zoom-out') scene.zoom(.8);
  if (button.id === 'rotate-left') scene.rotate(-90);
  if (button.id === 'rotate-right') scene.rotate(90);
  if (button.id === 'new' && !controller) { finishDrawing(); save(); inquiry = freshInquiry(); save(); location.reload(); }
  if (button.id === 'export') {
    finishDrawing();
    const url = URL.createObjectURL(new Blob([JSON.stringify(inquiry, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `mosaic-${inquiry.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if ('pin' in button.dataset || 'highlight' in button.dataset) {
    const message = button.closest('.message'), turn = inquiry.turns.find(t => t.id === message.dataset.turn), kind = message.dataset.kind;
    const selected = readSelection() || selectedExcerpt;
    const excerpt = selected?.turn === turn.id && selected.kind === kind ? selected : null;
    const text = excerpt?.text || (kind === 'user' ? turn.input : turn.response);
    const source = { turn: turn.id, kind, start: excerpt?.start ?? 0, end: (excerpt?.start ?? 0) + text.length };
    if ('highlight' in button.dataset) {
      inquiry.highlights.push({ id: crypto.randomUUID(), original: text, source, nib: $('nib').value });
      save(); refreshInk(); tell('Highlighted. The original words stay selectable.');
    } else {
      pin(text, source, { nib: $('nib').value }); showChat(false); tell('Kept on this sheet.');
    }
    selectedExcerpt = null; window.getSelection()?.removeAllRanges();
  }
  const piece = inquiry.pieces.find(p => p.id === button.closest('[data-piece]')?.dataset.piece);
  if (piece && 'resolve' in button.dataset) { piece.resolved = !piece.resolved; button.closest('.artifact').remove(); save(); renderArtifacts(); preview(); }
  if (button.dataset.commentTarget) {
    const target = inquiry.pieces.find(p => p.id === button.dataset.commentTarget);
    if (target) { raisePiece(target); scene.get(target.workspace).querySelector(`[data-piece="${target.id}"] textarea`).focus({ preventScroll: true }); }
  }
  if (piece && 'remove' in button.dataset && confirm('Remove this artifact? Its source conversation stays recorded.')) { inquiry.pieces.splice(inquiry.pieces.indexOf(piece), 1); save(); renderArtifacts(); refreshInk(); preview(); }
  if (piece && 'editSketch' in button.dataset) { finishDrawing(); drawing = { editing: piece.id, strokes: structuredClone(piece.strokes) }; renderArtifacts(); controls(); }
  if (button.id === 'voice') dictate();
});
for (const id of ['motion', 'theme']) $(id).addEventListener('change', event => {
  inquiry[id] = event.target.value; save(); controls();
});
$('image-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) { tell('Choose a PNG, JPEG or WebP under 12 MB.'); return; }
  const workspace = inquiry.activeWorkspace, position = placement('image');
  try {
    const bitmap = await createImageBitmap(file), scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    finishDrawing();
    const piece = addPiece(inquiry, '', null, { ...position, workspace }); Object.assign(piece, { filename: file.name, annotation: `Uploaded image: ${file.name}. Inference receives the caption, not image pixels.`, data: canvas.toDataURL('image/webp', .85), created: new Date().toISOString() });
    save(); renderArtifacts(); controls(); tell('Image kept. Add a caption to bring its meaning into the conversation.');
  } catch { tell('That image could not be opened. Nothing was uploaded to the server.'); }
});
function dictate() {
  if (recognition) { recognition.stop(); return; }
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { tell('Dictation is unavailable in this browser. You can still type.'); return; }
  const before = $('interjection').value;
  recognition = new Speech(); recognition.lang = navigator.language || 'en-US'; recognition.interimResults = true; recognition.continuous = true;
  recognition.onresult = event => { $('interjection').value = before + (before ? ' ' : '') + [...event.results].map(r => r[0].transcript).join(' '); $('interjection').dispatchEvent(new Event('input')); };
  recognition.onerror = event => tell(`Dictation stopped (${event.error}). Nothing was submitted.`);
  recognition.onend = () => { recognition = null; $('voice').setAttribute('aria-pressed', 'false'); };
  try { recognition.start(); $('voice').setAttribute('aria-pressed', 'true'); tell('Listening. Review before sending.'); }
  catch { recognition = null; tell('Dictation could not start. You can still type.'); }
}
if (storageBlocked) { $('storage').textContent = 'Storage unavailable. Export before closing.'; tell('The previous record could not be read and has not been overwritten.'); }
save(); $('interjection').value = inquiry.interjection; renderBoard(); controls(); transcript();
fetch('/api/status').then(r => r.json()).then(s => { $('connection').textContent = s.configured ? 'Modal inference configured' : 'Inference not connected'; }).catch(() => { $('connection').textContent = 'Inference server unavailable'; });
