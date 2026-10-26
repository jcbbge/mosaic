import { studies } from './content.js';

// The geometry is the frozen motion study's inverse-camera construction.
// This standalone lab never reads or writes Made Well's store or calls a model.
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const key = 'spatial-applications-v1';
let saved = {};
let persistent = true;
try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { persistent = false; }
const fresh = () => ({ path: 'root', pos: 0, lens: 0, returns: [], custom: [], entries: [], selected: [], draft: '', scratch: '', branchTitle: '', observed: '', interpreted: '', conditions: [] });
const sessions = Object.fromEntries(studies.map(study => [study.id, { ...fresh(), ...saved[study.id] }]));
let study = studies.find(item => item.id === location.hash.slice(1)) || studies[0];
let mode = 'pivot';
let animation = 0;
let visual = sessions[study.id].pos;
const current = () => sessions[study.id];
const deck = () => current().path === 'root' ? study.nodes : current().path.startsWith('node:') ? study.nodes[Number(current().path.split(':')[1])].children : current().custom[Number(current().path.split(':')[1])].children;
const message = text => { $('message').textContent = text; };
const save = () => {
	try { localStorage.setItem(key, JSON.stringify(sessions)); }
	catch { persistent = false; }
	if (!persistent) $('storage-note').textContent = 'Browser storage is unavailable. Your inputs are only held in this tab: export before closing it. No data is sent to a server.';
};
const mix = (a, b, t) => a + (b - a) * t;
const bounds = (matrix, width, height) => {
	const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
	const x = Math.min(...corners.map(p => p.x)), y = Math.min(...corners.map(p => p.y));
	return { x, y, width: Math.max(...corners.map(p => p.x)) - x, height: Math.max(...corners.map(p => p.y)) - y };
};
const geometries = new Map();
function geometry(count) {
	if (geometries.has(count)) return geometries.get(count);
	const child = new DOMMatrix([0, .675, -1000 / 1350, 0, 1000, 0]);
	const frames = [new DOMMatrix()];
	for (let i = 1; i < count; i++) frames.push(frames[i - 1].multiply(child));
	const cameras = frames.map(frame => frame.inverse());
	const cells = frames.map((frame, i) => bounds(frame, i === count - 1 ? 1000 : 500, 675));
	const cellAt = (i, depth) => bounds(cameras[depth].translate(cells[i].x, cells[i].y), cells[i].width, cells[i].height);
	const result = { cells, cameras, cellAt };
	geometries.set(count, result);
	return result;
}
function paint() {
	const count = deck().length;
	const { cells, cameras, cellAt } = geometry(count);
	const depth = Math.min(Math.floor(visual), count - 2);
	const t = visual - depth;
	const rectangle = (box, i) => `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${i === count - 1 ? 'var(--pink)' : 'white'}" stroke="var(--ink)" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
	const scene = (d, omitPink = false) => `<g transform="${cameras[d]}">${cells.map((box, i) => omitPink && i === count - 1 ? '' : rectangle(box, i)).join('')}</g>`;
	const centered = (scale, dx = 0) => `translate(${500 + dx} 337.5) scale(${scale}) translate(-500 -337.5)`;
	const blendBox = (a, b) => Object.fromEntries(Object.keys(a).map(k => [k, mix(a[k], b[k], t)]));
	if (mode === 'pivot') {
		const turn = new DOMMatrix().translate(0, 1350 * t).rotate(-90 * t).scale(1.35 ** t, (1000 / 675) ** t);
		$('planes').innerHTML = `<g transform="${turn.multiply(cameras[depth])}">${cells.map(rectangle).join('')}</g>`;
	} else if (mode === 'shutter') {
		$('planes').innerHTML = cells.map((_, i) => rectangle(blendBox(cellAt(i, depth), cellAt(i, depth + 1)), i)).join('');
	} else if (mode === 'scale') {
		$('planes').innerHTML = `<g opacity="${1 - t}" transform="${centered(mix(1, 1.3, t))}">${scene(depth)}</g><g opacity="${t}" transform="${centered(mix(.72, 1, t))}">${scene(depth + 1)}</g>`;
	} else {
		$('planes').innerHTML = `<g opacity="${1 - t}" transform="${centered(mix(1, 1.04, t), -60 * t)}">${scene(depth, true)}</g><g opacity="${t}" transform="${centered(mix(.92, 1, t), 60 * (1 - t))}">${scene(depth + 1, true)}</g>${rectangle(blendBox(cellAt(count - 1, depth), cellAt(count - 1, depth + 1)), count - 1)}`;
	}
}
function finish() {
	cancelAnimationFrame(animation);
	visual = current().pos;
	$('stage').classList.remove('moving');
	$('stage').setAttribute('aria-busy', 'false');
}
function go(target) {
	cancelAnimationFrame(animation);
	const from = visual;
	current().pos = Math.max(0, Math.min(deck().length - 1, target));
	save();
	const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.min(850, 580 + 60 * Math.abs(current().pos - from));
	if (duration === 0 || from === current().pos) { finish(); render(); return; }
	$('stage').classList.add('moving');
	$('stage').setAttribute('aria-busy', 'true');
	const start = performance.now();
	function tick(now) {
		const elapsed = Math.min(1, (now - start) / duration);
		visual = mix(from, current().pos, (1 - Math.cos(Math.PI * elapsed)) / 2);
		paint();
		if (elapsed < 1) animation = requestAnimationFrame(tick);
		else { finish(); render(); }
	}
	animation = requestAnimationFrame(tick);
}
function openBranch(path) {
	finish();
	current().returns.push({ path: current().path, pos: current().pos });
	current().path = path;
	current().pos = visual = 0;
	save(); render();
	$('reader').focus({ preventScroll: true });
}
function returnTo(index) {
	finish();
	const parent = current().returns[index];
	current().path = parent.path;
	current().pos = visual = parent.pos;
	current().returns.length = index;
	save(); render();
}
function turnLens(direction) {
	finish();
	current().lens = (current().lens + direction + study.lenses.length) % study.lenses.length;
	save(); render();
}
function sourceMarkup(node) {
	return `${node.quote ? `<blockquote class="source"><p>“${escape(node.quote)}”</p><span class="small">${escape(node.speaker)}</span></blockquote>` : ''}${node.sources?.length ? `<details><summary>Grounding / original source</summary>${node.sources.map(([label, url]) => `<p><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a></p>`).join('')}</details>` : ''}`;
}
function render() {
	const s = current(), nodes = deck(), node = nodes[s.pos];
	$('study-kind').textContent = study.kind;
	$('study-title').textContent = study.title;
	$('study-question').textContent = study.question;
	$('study-note').textContent = study.note;
	$('studies').innerHTML = studies.map((item, i) => `<button data-study="${item.id}" aria-current="${item === study ? 'page' : 'false'}"><span class="ordinal">0${i + 1}</span>${item.tab}</button>`).join('');
	document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
	$('trail').innerHTML = s.returns.length ? s.returns.map((parent, i) => `<button data-return="${i}">← ${escape(parent.path === 'root' ? study.nodes[parent.pos].title : 'Previous possibility')}</button><span>/</span>`).join('') + '<span>Inside a possibility · not a decision</span>' : '<span>Overview / choose a region, or turn the left dial</span>';
	$('reader').classList.toggle('terminal', s.pos === nodes.length - 1);
	$('node-number').textContent = `${String(s.pos + 1).padStart(2, '0')} / ${String(nodes.length).padStart(2, '0')}`;
	$('lens-tag').textContent = study.lenses[s.lens];
	$('node-title').textContent = node.title;
	$('node-copy').innerHTML = `${node.author ? `<p class="small">${escape(node.author)}${node.author === 'Your input' && s.lens !== 0 ? ' / prewritten exploration prompt' : ''}</p>` : ''}<p class="lead">${escape(node.views[s.lens])}</p>`;
	$('node-extra').innerHTML = `${node.children ? '<button class="action" id="open-branch">Open this possibility ↗</button><p class="small">A separate sequence. Your return point stays saved.</p>' : ''}${study.id === 'memory' ? `<button id="collect" class="action" ${s.selected.some(item => item.pos === s.pos && item.lens === s.lens) ? 'disabled' : ''}>Keep this expression ↓</button><p class="small">Add this authored fragment to the composition below.</p>` : ''}${sourceMarkup(node)}`;
	$('node-extra').hidden = !$('node-extra').innerHTML;
	const { cellAt } = geometry(nodes.length);
	$('zones').innerHTML = nodes.map((item, i) => {
		if (i <= s.pos) return '';
		const box = cellAt(i, s.pos);
		const cls = box.width < 180 || box.height < 100 ? 'tiny' : box.width < 300 || box.height < 220 ? 'small-zone' : '';
		return `<button class="zone ${cls}" data-go="${i}" style="left:${box.x / 10}%;top:${box.y / 6.75}%;width:${box.width / 10}%;height:${box.height / 6.75}%" aria-label="Focus region ${i + 1}: ${escape(item.title)}"><span class="zone-index">${String(i + 1).padStart(2, '0')}</span><span class="zone-name">${escape(item.title)}</span><span class="small zone-mark" aria-hidden="true">${item.children ? '↳ 3 regions' : '3 readings'}</span></button>`;
	}).join('');
	$('map').innerHTML = nodes.map((item, i) => `<button data-go="${i}" aria-current="${s.pos === i ? 'page' : 'false'}">${i + 1} / ${escape(item.title)}</button>`).join('');
	$('position').textContent = `${s.pos + 1} / ${nodes.length}`;
	$('back').disabled = s.pos === 0 && !s.returns.length;
	$('back').setAttribute('aria-label', s.pos === 0 && s.returns.length ? 'Return to parent possibility' : 'Previous region');
	$('next').disabled = $('spatial-knob').disabled = s.pos === nodes.length - 1;
	$('next').setAttribute('aria-label', 'Next region');
	$('lens-name').textContent = study.lenses[s.lens];
	$('lens-knob').style.transform = `rotate(${s.lens * 90}deg)`;
	$('spatial-knob').style.transform = `rotate(${s.pos * -90}deg)`;
	$('reader').scrollTop = 0;
	paint();
	renderWorkspace();
}
function entriesMarkup() {
	return `<ol class="entries">${current().entries.map(entry => `<li><span class="small">${escape(entry.context)}</span><br>${escape(entry.text)}</li>`).join('')}</ol>`;
}
function renderWorkspace() {
	const s = current();
	const scratch = (label, placeholder) => `<label class="field">${label}<textarea id="scratch" placeholder="${placeholder}">${escape(s.scratch)}</textarea></label>`;
	if (study.id === 'weights') {
		$('workspace').innerHTML = `<h3>Separate what you noticed from what caused it.</h3><p class="small">A place to record an actual comparison, not a fake model simulator.</p>${scratch('Your observation', 'Same task, different responses: what changed?')}<button id="save-entry">Keep this observation</button>${entriesMarkup()}`;
	} else if (study.id === 'company') {
		$('workspace').innerHTML = `<div class="workspace-head"><h3>Open your own possibility.</h3><p class="small">No generated answer follows. Your note becomes a branch with prompts to investigate and challenge it.</p></div><form id="branch-form"><label class="field">A possible direction<input id="branch-title" maxlength="180" required value="${escape(s.branchTitle)}" placeholder="What if we connected…"></label>${scratch('What makes this worth exploring?', 'Keep assumptions and unknowns visible.')}<button class="action">Open as a branch ↗</button></form><div id="custom-branches">${s.custom.map((item, i) => `<button class="quiet-action" data-custom="${i}">${escape(item.title)} ↗</button>`).join('')}</div>`;
	} else if (study.id === 'rhythms') {
		$('workspace').innerHTML = `<h3>Observation and interpretation, held apart.</h3><p class="small">A personal reflection record. No prediction, scoring, or health assessment.</p><form id="observation-form"><div class="form-grid"><label class="field">What you noticed<textarea id="observed" required placeholder="A specific event, time, and circumstances">${escape(s.observed)}</textarea></label><label class="field">What you make of it<textarea id="interpreted" placeholder="A possible meaning—not an established cause">${escape(s.interpreted)}</textarea></label></div><button class="action">Keep this encounter</button></form>${entriesMarkup()}`;
	} else if (study.id === 'conversation') {
		$('workspace').innerHTML = `<h3>Add a correction without rewriting the past.</h3>${scratch('Your addition to this region', 'What is missing, misleading, or still unresolved?')}<button id="save-entry">Attach this correction</button>${entriesMarkup()}`;
	} else if (study.id === 'memory') {
		$('workspace').innerHTML = `<div class="workspace-head"><h3>A composition with its seams visible.</h3><p class="small">Keep expressions above, reorder them here, then explicitly assemble an editable draft. Lens changes never overwrite your draft.</p></div><div id="fragments">${s.selected.length ? s.selected.map((item, i) => `<div class="fragment"><p><span class="small">Region ${item.pos + 1} / ${escape(study.lenses[item.lens])} · authored fragment</span><br>${escape(item.text)}</p><button data-move="${i}" data-direction="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move fragment ${i + 1} earlier">↑</button><button data-move="${i}" data-direction="1" ${i === s.selected.length - 1 ? 'disabled' : ''} aria-label="Move fragment ${i + 1} later">↓</button><button data-remove="${i}" aria-label="Remove fragment ${i + 1}">×</button></div>`).join('') : '<p class="small">Nothing collected yet. “Keep this expression” adds the current reading.</p>'}</div><button id="assemble" class="action" ${s.selected.length ? '' : 'disabled'}>Assemble ${s.selected.length} fragments into draft</button><label class="field">Your draft · edited text is not automatically verified<textarea id="draft" placeholder="Your composition…">${escape(s.draft)}</textarea></label>`;
	} else {
		const flags = [['sleep', 'Sleep is being displaced'], ['friends', 'This is time with friends'], ['promise', 'An agreed responsibility is missed']];
		$('workspace').innerHTML = `<h3>Same four hours. Different circumstances.</h3><p class="small">Invented situation: an adult spends four hours gaming. These switches identify relevant considerations, not a verdict or diagnosis.</p><div class="conditions">${flags.map(([id, label]) => `<label><input type="checkbox" data-condition="${id}" ${s.conditions.includes(id) ? 'checked' : ''}>${label}</label>`).join('')}</div><div class="comparison"><div><h3>The concern</h3><p>${s.conditions.includes('sleep') ? 'Lost sleep is a concrete consequence worth examining. It does not prove the person has no ambition.' : 'Opportunity cost exists, but we have not established what this activity displaced.'}</p><p>${s.conditions.includes('promise') ? 'A missed agreement creates a responsibility question independent of whether gaming is a respectable hobby.' : 'No missed agreement is specified in this invented situation.'}</p></div><div><h3>The defense</h3><p>${s.conditions.includes('friends') ? 'The time includes companionship. Removing gaming may also remove this shared activity, not merely reclaim empty hours.' : 'Enjoyment can have value without a social or productive justification. We do not know what this person gets from playing.'}</p><p>These considerations can coexist. None establishes a clinical condition or an obligation to share someone else’s preferences.</p></div></div>${scratch('What would change your view?', 'Name evidence or a circumstance, not a character judgment.')}<button id="save-entry">Keep this position</button>${entriesMarkup()}`;
	}
}
document.addEventListener('click', event => {
	const button = event.target.closest('button');
	if (!button) return;
	if (button.dataset.study) { location.hash = button.dataset.study; return; }
	if (button.dataset.mode) { finish(); mode = button.dataset.mode; render(); return; }
	if (button.dataset.go !== undefined) { go(Number(button.dataset.go)); return; }
	if (button.dataset.return !== undefined) { returnTo(Number(button.dataset.return)); return; }
	if (button.dataset.custom !== undefined) { openBranch(`custom:${button.dataset.custom}`); return; }
	const s = current();
	if (button.id === 'next' || button.id === 'spatial-knob') go(s.pos + 1);
	if (button.id === 'back') s.pos === 0 && s.returns.length ? returnTo(s.returns.length - 1) : go(s.pos - 1);
	if (button.id === 'lens-next' || button.id === 'lens-knob') turnLens(1);
	if (button.id === 'lens-back') turnLens(-1);
	if (button.id === 'overview') { finish(); s.path = 'root'; s.returns = []; s.pos = visual = 0; save(); render(); }
	if (button.id === 'open-branch') openBranch(`node:${s.pos}`);
	if (button.id === 'collect') {
		s.selected.push({ pos: s.pos, lens: s.lens, text: deck()[s.pos].views[s.lens] }); save(); render(); message('Expression kept. Its region and lens remain attached.');
	}
	if (button.dataset.move !== undefined) {
		const i = Number(button.dataset.move), j = i + Number(button.dataset.direction);
		[s.selected[i], s.selected[j]] = [s.selected[j], s.selected[i]]; save(); renderWorkspace();
	}
	if (button.dataset.remove !== undefined) { s.selected.splice(Number(button.dataset.remove), 1); save(); render(); }
	if (button.id === 'assemble') {
		if (s.draft.trim() && !confirm('Replace your edited draft with the currently selected fragments? Export first if you want to keep both.')) return;
		s.draft = s.selected.map(item => item.text).join('\n\n'); save(); renderWorkspace(); message('Fragments assembled. You can edit the draft; no new text was generated.');
	}
	if (button.id === 'save-entry') {
		if (!s.scratch.trim()) { message('Write something first.'); return; }
		s.entries.push({ context: `${deck()[s.pos].title} / ${study.lenses[s.lens]}`, text: s.scratch.trim() }); s.scratch = ''; save(); renderWorkspace(); message('Kept in this browser. Export to retain a separate copy.');
	}
	if (button.id === 'clear' && confirm(`Clear your inputs for ${study.tab}? Other studies and the prewritten material will stay unchanged.`)) {
		finish(); sessions[study.id] = fresh(); visual = 0; save(); render(); message('Inputs cleared for this study only.');
	}
	if (button.id === 'export') {
		const url = URL.createObjectURL(new Blob([JSON.stringify({ study: study.id, motion: mode, content: study, inputs: s }, null, 2)], { type: 'application/json' }));
		const a = document.createElement('a'); a.href = url; a.download = `spatial-${study.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('Export prepared with your inputs and their source regions.');
	}
});
document.addEventListener('input', event => {
	const field = { scratch: 'scratch', draft: 'draft', 'branch-title': 'branchTitle', observed: 'observed', interpreted: 'interpreted' }[event.target.id];
	if (field) { current()[field] = event.target.value; save(); }
});
document.addEventListener('change', event => {
	if (!event.target.dataset.condition) return;
	const id = event.target.dataset.condition;
	current().conditions = event.target.checked ? [...current().conditions, id] : current().conditions.filter(item => item !== id);
	save(); renderWorkspace();
});
document.addEventListener('submit', event => {
	event.preventDefault();
	const s = current();
	if (event.target.id === 'branch-form') {
		const title = $('branch-title').value.trim();
		if (!title) return;
		const note = s.scratch.trim() || 'No supporting note yet.';
		const children = [
			{ title, views: [note, 'Your possibility is not an accepted architecture. What would it improve, and what might it make harder?', 'What is the smallest observation that could support or undermine this possibility?'], author: 'Your input' },
			{ title: 'What are we assuming?', views: ['Name one assumption behind this possibility.', 'What would happen if that assumption were false?', 'Find an example where the proposed connection would not help.'], author: 'Prewritten prompt' },
			{ title: 'Return with a question, not a commitment.', views: ['You can keep this thread without accepting it.', 'Compare it with another possibility before deciding.', 'Use the breadcrumb to return to the exact region you left.'], author: 'Prewritten prompt' },
		];
		s.custom.push({ title, children }); s.scratch = ''; s.branchTitle = ''; openBranch(`custom:${s.custom.length - 1}`);
	}
	if (event.target.id === 'observation-form') {
		if (!$('observed').value.trim()) return;
		s.entries.push({ context: deck()[s.pos].title, text: `Observed: ${$('observed').value.trim()}\nInterpretation: ${$('interpreted').value.trim() || 'Left open.'}` });
		s.observed = s.interpreted = '';
		save(); renderWorkspace(); message('Observation saved separately from its interpretation.');
	}
});
document.addEventListener('keydown', event => {
	if (event.target.closest('input, textarea, select, button, a, summary') || event.altKey || event.ctrlKey || event.metaKey) return;
	if (!['ArrowLeft', 'ArrowRight', '[', ']', 'Home', 'End'].includes(event.key)) return;
	event.preventDefault();
	if (event.key === '[' || event.key === ']') turnLens(event.key === '[' ? -1 : 1);
	else go(event.key === 'Home' ? 0 : event.key === 'End' ? deck().length - 1 : current().pos + (event.key === 'ArrowLeft' ? -1 : 1));
});
window.addEventListener('hashchange', () => {
	finish(); study = studies.find(item => item.id === location.hash.slice(1)) || studies[0]; visual = current().pos; message(''); render();
});
save(); render();
