export const moves = [
  { id: 'converse', mark: '·', label: 'Conversation', prompt: 'Continue the conversation naturally. Respond to what the person actually said. Contribute an idea, explanation or useful reaction; do not run an interview or require an answer. Do not apply a thinking exercise unless asked.' },
  { id: 'luck', mark: '✳', label: 'Luck', prompt: 'Look for an unexpected opening, useful accident or overlooked possibility in the working material. Offer a concrete contribution, not a questionnaire. Label speculation. This is a lightweight lens, not an imported AgentCore primitive.' },
  { id: 'explore', mark: '◇', label: 'Open possibilities', prompt: 'Offer a genuinely different possibility worth exploring. Contribute rather than interviewing the person. Do not choose a destination for them.' },
  { id: 'ablate', mark: '−', label: 'Remove an assumption', prompt: 'Identify a load-bearing assumption in the current thought. Remove it, inspect what survives and what changes, and invite the person to correct the assumption you selected.' },
  { id: 'critical', mark: '△', label: 'Find the hinge', prompt: 'Find the condition on which this thought depends most. Distinguish a value judgment from an empirical claim. Say what observation would change the conclusion.' },
  { id: 'connect', mark: '⋈', label: 'Make a connection', prompt: 'Offer one unexpected but useful connection. Label analogy as analogy, explain where it breaks, and use it to ask a more precise question.' },
  { id: 'compose', mark: '□', label: 'Try a synthesis', prompt: 'Offer a provisional formulation using the selected material and draft. Preserve unresolved disagreements rather than blending them into consensus. Do not claim the person has accepted it.' },
];
export const lenses = [
  { id: 'open', label: 'Open reading', prompt: 'Explore without prematurely choosing a side.' },
  { id: 'for', label: 'Strongest case for', prompt: 'Present the strongest fair case supporting the proposition, without fabricating evidence or pretending this is the only perspective.' },
  { id: 'against', label: 'Strongest case against', prompt: 'Present the strongest fair challenge to the proposition, without caricature, diagnosis or unsupported claims.' },
  { id: 'lived', label: 'Lived consequences', prompt: 'Consider concrete effects on the people involved. Distinguish supplied experience from hypothetical examples. Ask whose circumstances are missing.' },
];
export const freshInquiry = () => {
  const root = { id: crypto.randomUUID(), label: 'First sheet', created: new Date().toISOString() };
  return { version: 1, id: crypto.randomUUID(), question: '', turns: [], focus: null, pieces: [], highlights: [], workspaces: [root], activeWorkspace: root.id, draft: '', interjection: '', move: 'converse', lens: 'open', motion: 'pivot', theme: 'pink' };
};
export function unfold(inquiry, label = 'Open sheet') {
  const workspace = { id: crypto.randomUUID(), parent: inquiry.activeWorkspace, label, created: new Date().toISOString() };
  inquiry.workspaces.push(workspace);
  inquiry.activeWorkspace = workspace.id;
  return workspace;
}
export function ancestry(inquiry, id = inquiry.focus) {
  const result = [];
  const visited = new Set();
  while (id && !visited.has(id)) {
    visited.add(id);
    const turn = inquiry.turns.find(t => t.id === id);
    if (!turn) break;
    result.unshift(turn);
    id = turn.parent;
  }
  return result;
}
export function contextFor(inquiry, input, move = inquiry.move, lens = inquiry.lens) {
  const path = ancestry(inquiry);
  const selected = inquiry.pieces.filter(p => p.include);
  const recent = path.slice(-8);
  return {
    question: inquiry.question.slice(0, 6000), input: input.slice(0, 6000), move, lens, workspace: inquiry.activeWorkspace,
    history: recent.map(t => ({ id: t.id, input: t.input.slice(0, 2000), response: t.response.slice(0, 4000), status: t.status })),
    pieces: selected.slice(0, 16).map(p => ({ id: p.id, source: p.source, original: p.original.slice(0, 2000), text: p.text.slice(0, 2000), annotation: p.annotation.slice(0, 1000), artifact: { type: p.type, workspace: p.workspace, x: p.x, y: p.y, ...(p.type === 'comment' ? { target: p.target, resolved: p.resolved, replies: p.replies.slice(-4).map(r => ({ text: r.text.slice(0, 1000), created: r.created })), omittedReplies: Math.max(0, p.replies.length - 4) } : {}) } })),
    draft: inquiry.draft.slice(0, 8000),
    omitted: { olderTurns: Math.max(0, path.length - recent.length), extraPieces: Math.max(0, selected.length - 16), shortened: inquiry.question.length > 6000 || input.length > 6000 || inquiry.draft.length > 8000 || recent.some(t => t.input.length > 2000 || t.response.length > 4000) || selected.slice(0, 16).some(p => p.original.length > 2000 || p.text.length > 2000 || p.annotation.length > 1000 || p.replies?.some(r => r.text.length > 1000)) },
  };
}
export function beginTurn(inquiry, input, move = inquiry.move, lens = inquiry.lens) {
  if (!inquiry.question) inquiry.question = input.trim();
  const turn = { id: crypto.randomUUID(), parent: inquiry.focus, workspace: inquiry.activeWorkspace, input: input.trim(), move, lens, context: contextFor(inquiry, input.trim(), move, lens), response: '', status: 'pending', created: new Date().toISOString() };
  inquiry.turns.push(turn);
  inquiry.focus = turn.id;
  inquiry.move = move;
  inquiry.lens = lens;
  return turn;
}
export function addPiece(inquiry, text, source = null, options = {}) {
  const workspace = options.workspace || inquiry.activeWorkspace;
  const existing = inquiry.pieces.filter(p => p.workspace === workspace), count = existing.length;
  const piece = { id: crypto.randomUUID(), source, original: text, text, annotation: '', include: true, workspace, type: 'note', x: 65 + count % 3 * 38, y: 100 + count % 5 * 80, ...options, z: Math.max(0, ...existing.map((p, i) => p.z ?? i + 1)) + 1 };
  if (piece.type === 'comment') Object.assign(piece, { target: options.target || null, replies: [], resolved: false });
  inquiry.pieces.push(piece);
  return piece;
}
export function recover(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.turns) || !Array.isArray(value.pieces)) throw new Error('This is not a Mosaic inquiry export.');
  const inquiry = { ...freshInquiry(), ...value };
  if (!value.workspaces?.length) {
    inquiry.workspaces = value.turns.length ? value.turns.map((t, i) => ({ id: t.id, label: i ? 'Earlier facet' : 'First sheet' })) : inquiry.workspaces;
    inquiry.activeWorkspace = value.focus || inquiry.workspaces[0].id;
  }
  if (!inquiry.workspaces.some(w => w.id === inquiry.activeWorkspace)) inquiry.activeWorkspace = inquiry.workspaces[0].id;
  inquiry.pieces.forEach((p, i) => {
    p.workspace ||= inquiry.workspaces.some(w => w.id === p.source?.turn) ? p.source.turn : inquiry.workspaces[0].id;
    p.type ||= 'note'; p.x ??= 65 + i % 3 * 38; p.y ??= 100 + i % 5 * 80;
    p.z ??= i + 1;
    if (p.type === 'comment') { p.replies ||= []; p.resolved ??= false; p.target ??= null; }
  });
  for (const turn of inquiry.turns) {
    if (typeof turn.id !== 'string' || typeof turn.input !== 'string' || typeof turn.response !== 'string') throw new Error('The saved inquiry has an invalid turn.');
    if (turn.status === 'pending') { turn.status = 'interrupted'; turn.error = 'This request was interrupted. Your input and submitted context are retained; create a new turn to continue.'; }
  }
  if (inquiry.focus && !inquiry.turns.some(t => t.id === inquiry.focus)) inquiry.focus = inquiry.turns.at(-1)?.id || null;
  return inquiry;
}
