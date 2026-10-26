import { moves, lenses, freshInquiry, ancestry, contextFor, beginTurn, addPiece, recover } from './inquiry.js';
import { createScene } from './scene.js';
import { mountInk } from './ink.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const key = 'mosaic-inquiries-v1';
let inquiry = freshInquiry(), library = {}, controller = null, selection = null, recognition = null, storageBlocked = false;
let inkDisposers = [];
try {
  const saved = JSON.parse(localStorage.getItem(key) || 'null');
  if (saved) { library = saved.inquiries; inquiry = recover(library[saved.current]); library[inquiry.id] = inquiry; }
} catch { storageBlocked = true; }
const tell = text => { $('notice').textContent = text; };
function save() {
  if (storageBlocked) { $('storage').textContent = 'storage unavailable—export before closing'; return; }
  library[inquiry.id] = inquiry;
  try { localStorage.setItem(key, JSON.stringify({ current: inquiry.id, inquiries: library })); }
  catch { storageBlocked = true; $('storage').textContent = 'storage full or unavailable—export before closing'; tell('Browser storage could not save this change. Your material is still in this tab; export it before leaving.'); }
}
const title = (list, id) => list.find(x => x.id === id)?.label || id;
const scene = createScene($('stage'), $('world'), focus, refreshInk);
function refreshInk() {
  inkDisposers.forEach(dispose => dispose());
  inkDisposers = [];
  for (const copy of $('world').querySelectorAll('.pane-copy')) {
    const turn = copy.closest('.pane').dataset.turn;
    const pieces = inquiry.pieces.filter(p => p.source?.turn === turn && p.source.kind === copy.dataset.kind);
    if (pieces.length) inkDisposers.push(mountInk(copy, pieces));
  }
}
function makePane(id) {
  const article = document.createElement('article');
  article.dataset.turn = id;
  article.className = 'pane';
  article.innerHTML = '<div class="pane-inner"><div class="pane-meta"></div><h2 class="pane-title"></h2><div class="pane-scroll"><p class="source-label">Your contribution</p><div class="pane-copy user-copy" data-kind="user"></div><p class="source-label">Model response</p><div class="pane-copy response-copy" data-kind="response"></div><p class="pane-error"></p></div><button class="pane-action">Bring this turn into focus ↖</button></div>';
  article.querySelector('.pane-action').dataset.focus = id;
  updatePane(id, article);
  return article;
}
function updatePane(id, article = scene.get(id)) {
  if (!article) return;
  const turn = inquiry.turns.find(t => t.id === id), index = inquiry.turns.indexOf(turn);
  article.classList.toggle('origin', !turn.parent);
  article.classList.toggle('pending', turn.status === 'pending');
  article.querySelector('.pane-meta').innerHTML = `<span>TURN ${String(index + 1).padStart(2, '0')} · ${escape(title(moves, turn.move))}</span><span>${escape(title(lenses, turn.lens))}</span>`;
  article.querySelector('.pane-title').textContent = turn.parent ? title(moves, turn.move) : 'A question, opened.';
  article.querySelector('.user-copy').textContent = turn.input || 'Continue from this recorded thought.';
  article.querySelector('.response-copy').textContent = turn.response;
  const error = article.querySelector('.pane-error');
  error.textContent = turn.error || (turn.truncated ? 'The provider reached the output limit. This response may be incomplete.' : '');
  error.hidden = !error.textContent;
}
function renderScene(animate = false) {
  const path = ancestry(inquiry).reverse();
  scene.show(path.slice(0, 7).map(t => t.id), animate, inquiry.motion, makePane);
  $('scene-position').textContent = `${Math.min(7, path.length)} visible / ${inquiry.turns.length} recorded`;
}
function renderControls() {
  $('landing').hidden = Boolean(inquiry.turns.length);
  $('inquiry').hidden = !inquiry.turns.length;
  $('inquiry-title').textContent = inquiry.question;
  $('question').value = inquiry.opening || '';
  $('move').innerHTML = moves.map(m => `<option value="${m.id}" ${m.id === inquiry.move ? 'selected' : ''}>${m.mark} ${m.label}</option>`).join('');
  $('lens').innerHTML = lenses.map(l => `<option value="${l.id}" ${l.id === inquiry.lens ? 'selected' : ''}>${l.label}</option>`).join('');
  $('lens-dial').title = `Ask a new turn: ${lenses[(lenses.findIndex(l => l.id === inquiry.lens) + 1) % lenses.length].label}`;
  $('move-dial').title = `Ask a new turn: ${title(moves, inquiry.move)}`;
  $('move-dial').textContent = moves.find(m => m.id === inquiry.move)?.mark || '↗';
  for (const button of document.querySelectorAll('[data-motion]')) button.setAttribute('aria-pressed', String(button.dataset.motion === inquiry.motion));
  for (const id of ['move-dial', 'lens-dial', 'submit-turn', 'new', 'move', 'lens', 'sessions']) $(id).disabled = Boolean(controller);
  $('cancel').hidden = !controller;
  $('history').innerHTML = inquiry.turns.map((t, i) => {
    const sibling = inquiry.turns.some((s, j) => j < i && s.parent === t.parent);
    return `<button data-history="${t.id}" ${t.id === inquiry.focus ? 'aria-current="step"' : ''} class="${sibling ? 'branch' : ''}" ${controller ? 'disabled' : ''}>${sibling ? '↳ ' : ''}${i + 1} · ${escape(title(moves, t.move))} / ${escape(title(lenses, t.lens))}${t.status !== 'complete' ? ` · ${escape(t.status)}` : ''}</button>`;
  }).join('');
  const turn = inquiry.turns.find(t => t.id === inquiry.focus);
  $('record-context').textContent = turn ? JSON.stringify(turn.context, null, 2) : '';
  $('sessions').innerHTML = Object.values({ ...library, [inquiry.id]: inquiry }).map(item => `<option value="${escape(item.id)}" ${item.id === inquiry.id ? 'selected' : ''}>${escape((item.question || 'Untitled inquiry').slice(0, 60))}</option>`).join('');
  preview();
}
function renderPieces() {
  $('piece-count').textContent = `${inquiry.pieces.length} pieces`;
  $('pieces').innerHTML = inquiry.pieces.map((p, i) => `<article class="piece" data-piece="${p.id}">
    <div class="piece-head"><label><input type="checkbox" data-field="include" ${p.include ? 'checked' : ''}>Next context</label><div><button data-order="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move piece ${i + 1} earlier">↑</button><button data-order="1" ${i === inquiry.pieces.length - 1 ? 'disabled' : ''} aria-label="Move piece ${i + 1} later">↓</button><button data-remove aria-label="Remove piece ${i + 1}">×</button></div></div>
    ${p.source ? `<button class="piece-source" data-history="${p.source.turn}">Turn ${inquiry.turns.findIndex(t => t.id === p.source.turn) + 1} / ${escape(p.source.kind)} · original retained</button>` : '<span class="caption">Your note</span>'}
    <textarea data-field="text" aria-label="Working expression ${i + 1}">${escape(p.text)}</textarea><textarea class="annotation" data-field="annotation" aria-label="Annotation ${i + 1}" placeholder="Why keep this? What do you question?">${escape(p.annotation)}</textarea>
    ${p.source ? `<details><summary>Unedited source excerpt</summary><p class="caption">${escape(p.original)}</p></details>` : ''}</article>`).join('');
  $('compose-draft').disabled = !inquiry.pieces.some(p => p.include);
  preview();
}
function preview() {
  const next = contextFor(inquiry, inquiry.interjection);
  $('context-preview').textContent = JSON.stringify(next, null, 2);
  const { olderTurns, extraPieces, shortened } = next.omitted;
  $('context-limits').textContent = `${olderTurns} older turns and ${extraPieces} additional pieces omitted. ${shortened ? 'Some long material is shortened for this request; the full originals remain recorded.' : 'No included text shortened.'} The right dial advances to the next perspective before submitting.`;
}
function restoreFields() {
  $('draft').value = inquiry.draft;
  $('interjection').value = inquiry.interjection;
  $('note').value = inquiry.note || '';
}
function focus(id) {
  if (controller || !inquiry.turns.some(t => t.id === id)) return;
  inquiry.focus = id;
  const turn = inquiry.turns.find(t => t.id === id);
  inquiry.move = turn.move;
  inquiry.lens = turn.lens;
  selection = null; $('selection-tray').hidden = true;
  save(); renderControls(); renderScene(true);
}
async function ask(input, move = inquiry.move, lens = inquiry.lens) {
  if (controller || (!inquiry.question && !input.trim())) return;
  recognition?.stop();
  const turn = beginTurn(inquiry, input, move, lens);
  controller = new AbortController();
  save(); renderControls(); renderScene(true);
  tell('A new turn is being generated. Its input and context have been recorded.');
  try {
    const response = await fetch('/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(turn.context), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'The inference request failed.');
    turn.response = result.response;
    turn.model = result.model;
    turn.truncated = result.truncated;
    turn.status = 'complete';
    if (inquiry.interjection === input) inquiry.interjection = '';
    $('interjection').value = inquiry.interjection;
    tell('Turn recorded. Select a passage to keep it, interject, or try another perspective.');
  } catch (error) {
    turn.status = error.name === 'AbortError' ? 'cancelled' : 'failed';
    turn.error = error.name === 'AbortError' ? 'Cancelled locally. The provider may already have processed the request. Nothing was retried.' : error.message;
    tell(turn.error);
  } finally {
    controller = null;
    save(); updatePane(turn.id); refreshInk(); renderControls();
  }
}
function exportInquiry() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(inquiry, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `mosaic-${inquiry.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function captureSelection() {
  const selected = window.getSelection();
  if (!selected || selected.isCollapsed || !selected.rangeCount) return;
  const range = selected.getRangeAt(0), node = range.commonAncestorContainer;
  const copy = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest('.pane-copy');
  const article = copy?.closest('.pane');
  if (!copy || article.dataset.turn !== inquiry.focus) return;
  const text = selected.toString().trim();
  if (!text) return;
  const prefix = range.cloneRange(); prefix.selectNodeContents(copy); prefix.setEnd(range.startContainer, range.startOffset);
  const raw = selected.toString(), start = prefix.toString().length + raw.length - raw.trimStart().length;
  selection = { text, source: { turn: article.dataset.turn, kind: copy.dataset.kind, start, end: start + text.length } };
  $('selection-text').textContent = text;
  $('selection-tray').hidden = false;
}
document.addEventListener('mouseup', captureSelection);
document.addEventListener('keyup', captureSelection);
$('start-form').addEventListener('submit', event => { event.preventDefault(); ask($('question').value.trim()); });
$('turn-form').addEventListener('submit', event => { event.preventDefault(); ask(inquiry.interjection); });
$('note-form').addEventListener('submit', event => { event.preventDefault(); const value = $('note').value.trim(); if (value) { addPiece(inquiry, value); inquiry.note = ''; $('note').value = ''; save(); renderPieces(); } });
document.addEventListener('input', event => {
  const field = { question: 'opening', draft: 'draft', interjection: 'interjection', note: 'note' }[event.target.id];
  if (field) { inquiry[field] = event.target.value; save(); preview(); }
  const parent = event.target.closest('[data-piece]');
  if (parent && event.target.dataset.field) { const p = inquiry.pieces.find(p => p.id === parent.dataset.piece); p[event.target.dataset.field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value; save(); preview(); $('compose-draft').disabled = !inquiry.pieces.some(p => p.include); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'move' || event.target.id === 'lens') { inquiry[event.target.id] = event.target.value; save(); renderControls(); }
  if (event.target.id === 'sessions' && !controller) { save(); inquiry = recover(library[event.target.value]); save(); location.reload(); }
});
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.history) focus(button.dataset.history);
  if (button.dataset.motion) { inquiry.motion = button.dataset.motion; save(); renderControls(); }
  if (button.id === 'move-dial') ask(inquiry.interjection);
  if (button.id === 'lens-dial') ask(inquiry.interjection, inquiry.move, lenses[(lenses.findIndex(l => l.id === inquiry.lens) + 1) % lenses.length].id);
  if (button.id === 'cancel') controller?.abort();
  if (button.id === 'export') exportInquiry();
  if (button.id === 'new' && !controller) { save(); inquiry = freshInquiry(); save(); location.reload(); }
  if (button.id === 'workspace-link') $('board').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  if (button.id === 'keep-selection' && selection) { const piece = addPiece(inquiry, selection.text, selection.source); piece.nib = $('nib').value; selection = null; $('selection-tray').hidden = true; window.getSelection().removeAllRanges(); save(); renderPieces(); refreshInk(); }
  if (button.id === 'discuss-selection' && selection) { inquiry.interjection = `${inquiry.interjection ? inquiry.interjection + '\n\n' : ''}Let’s examine this passage: “${selection.text}”`; $('interjection').value = inquiry.interjection; save(); preview(); $('interjection').focus(); }
  if (button.id === 'compose-draft') { const text = inquiry.pieces.filter(p => p.include).map(p => p.text).join('\n\n'); inquiry.draft += (inquiry.draft && text ? '\n\n' : '') + text; $('draft').value = inquiry.draft; save(); preview(); }
  const parent = button.closest('[data-piece]');
  if (parent) {
    const index = inquiry.pieces.findIndex(p => p.id === parent.dataset.piece);
    if ('order' in button.dataset) { const target = index + Number(button.dataset.order); if (target >= 0 && target < inquiry.pieces.length) [inquiry.pieces[index], inquiry.pieces[target]] = [inquiry.pieces[target], inquiry.pieces[index]]; save(); renderPieces(); }
    if ('remove' in button.dataset && confirm('Remove this working piece? Its original turn will stay in the inquiry.')) { inquiry.pieces.splice(index, 1); save(); renderPieces(); refreshInk(); }
  }
  if (button.classList.contains('voice')) dictate(button);
});
function dictate(button) {
  if (recognition) { recognition.stop(); return; }
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { tell('Dictation is not supported by this browser. Type instead; no microphone recording was started.'); return; }
  const target = $(button.dataset.target), before = target.value;
  recognition = new Speech(); recognition.lang = navigator.language || 'en-US'; recognition.interimResults = true; recognition.continuous = true;
  button.setAttribute('aria-pressed', 'true');
  recognition.onresult = event => { target.value = before + (before ? ' ' : '') + [...event.results].map(r => r[0].transcript).join(' '); target.dispatchEvent(new Event('input', { bubbles: true })); };
  recognition.onerror = event => tell(`Dictation stopped (${event.error}). You can still type; nothing was submitted.`);
  recognition.onend = () => { recognition = null; button.setAttribute('aria-pressed', 'false'); };
  try { recognition.start(); tell('Listening. Click the voice button again to stop. Review the text; dictation never submits it.'); }
  catch { recognition = null; button.setAttribute('aria-pressed', 'false'); tell('The browser could not start dictation. Type your thought instead.'); }
}
if (storageBlocked) tell('The browser record could not be read. It has not been overwritten. This tab can work in memory; export before closing.');
save(); restoreFields(); renderControls(); renderPieces();
if (inquiry.turns.length) renderScene();
fetch('/api/status').then(r => r.json()).then(status => { $('connection').textContent = status.configured ? `Inference configured · ${status.model}` : 'Inference not connected'; $('connection').title = status.configured ? 'A real request will verify the connection.' : 'Set the Modal endpoint model and proxy token on the server.'; }).catch(() => { $('connection').textContent = 'Inference server unavailable'; });
