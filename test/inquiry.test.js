import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshInquiry, beginTurn, addPiece, contextFor, recover, unfold } from '../public/inquiry.js';

test('a branch uses its own ancestry and selected expressions without rewriting sources', () => {
  const inquiry = freshInquiry();
  const root = beginTurn(inquiry, 'Is recreation worthwhile?');
  root.response = 'Rest has value. So do commitments.'; root.status = 'complete';
  const concern = beginTurn(inquiry, 'Consider missed promises.', 'critical', 'against');
  concern.response = 'A promise creates an obligation.'; concern.status = 'complete';
  const rejected = addPiece(inquiry, 'Not for this request'); rejected.include = false;
  const kept = addPiece(inquiry, 'Rest has value.', { turn: root.id, kind: 'response' });
  kept.text = 'Rest can be worthwhile.'; kept.annotation = 'Do not imply unlimited leisure.';
  inquiry.draft = 'A provisional position, not consensus.';
  inquiry.focus = root.id;
  const branch = beginTurn(inquiry, 'What about shared recreation?', 'explore', 'for');
  assert.equal(branch.parent, root.id);
  assert.deepEqual(branch.context.history.map(t => t.id), [root.id]);
  assert.deepEqual(branch.context.pieces, [{ id: kept.id, source: { turn: root.id, kind: 'response' }, original: 'Rest has value.', text: 'Rest can be worthwhile.', annotation: 'Do not imply unlimited leisure.', artifact: { type: 'note', workspace: inquiry.activeWorkspace, x: 103, y: 180 } }]);
  assert.equal(branch.context.draft, 'A provisional position, not consensus.');
  assert.equal(root.response, 'Rest has value. So do commitments.');
  assert.equal(inquiry.turns[1], concern);
  kept.text = 'Later edit'; inquiry.draft = 'Later draft';
  assert.equal(branch.context.pieces[0].text, 'Rest can be worthwhile.');
  assert.equal(branch.context.draft, 'A provisional position, not consensus.');
});

test('context boundaries disclose omitted turns, pieces and shortened text without truncating the record', () => {
  const inquiry = freshInquiry();
  for (let i = 0; i < 10; i++) { const t = beginTurn(inquiry, `Input ${i}`); t.response = 'x'.repeat(i === 2 ? 4001 : 21); t.status = 'complete'; }
  for (let i = 0; i < 17; i++) addPiece(inquiry, `Piece ${i}`);
  const context = contextFor(inquiry, 'A new direction', 'ablate', 'against');
  assert.deepEqual(context.history.map(t => t.input), ['Input 2', 'Input 3', 'Input 4', 'Input 5', 'Input 6', 'Input 7', 'Input 8', 'Input 9']);
  assert.equal(context.history[0].response.length, 4000);
  assert.equal(context.pieces.at(-1).text, 'Piece 15');
  assert.deepEqual(context.omitted, { olderTurns: 2, extraPieces: 1, shortened: true });
  assert.equal(inquiry.turns[2].response.length, 4001);
  assert.equal(inquiry.pieces.length, 17);
});

test('JSON reload retains edits and source records but interrupted requests are not successful', () => {
  const inquiry = freshInquiry(), root = beginTurn(inquiry, 'Original question');
  root.response = 'First response'; root.status = 'complete';
  const piece = addPiece(inquiry, 'response', { turn: root.id, kind: 'response', start: 6, end: 14 });
  piece.annotation = 'An observation, not proof.';
  piece.nib = 'bullet'; piece.text = 'My revised expression';
  inquiry.highlights.push({ id: 'highlight-fixture', original: 'First', source: { turn: root.id, kind: 'response', start: 0, end: 5 }, nib: 'fine' });
  inquiry.draft = 'My draft'; inquiry.interjection = 'Unsent input';
  const pending = beginTurn(inquiry, 'A pending request');
  const restored = recover(JSON.parse(JSON.stringify(inquiry)));
  assert.equal(restored.turns[0].response, 'First response');
  assert.equal(restored.turns[1].id, pending.id);
  assert.equal(restored.turns[1].status, 'interrupted');
  assert.equal(restored.turns[1].context.history[0].response, 'First response');
  assert.equal(restored.pieces[0].annotation, 'An observation, not proof.');
  assert.deepEqual(restored.pieces[0].source, { turn: root.id, kind: 'response', start: 6, end: 14 });
  assert.equal(restored.pieces[0].original, 'response');
  assert.equal(restored.pieces[0].text, 'My revised expression');
  assert.equal(restored.pieces[0].nib, 'bullet');
  assert.deepEqual(restored.highlights, inquiry.highlights);
  assert.equal(restored.pieces.length, 1, 'highlight-only marks do not create canvas notes');
  assert.equal(restored.draft, 'My draft');
  assert.equal(restored.interjection, 'Unsent input');
});

test('conversation stays on its sheet; unfolding and reload retain artifact identity and local layout', () => {
  const inquiry = freshInquiry(), first = inquiry.activeWorkspace;
  inquiry.motion = 'shutter'; inquiry.theme = 'blueprint';
  const note = addPiece(inquiry, 'Connect sources without moving ownership.');
  note.x = 173; note.y = 91;
  const turn = beginTurn(inquiry, 'Help sharpen this.');
  turn.response = 'Keep the source authoritative.'; turn.status = 'complete';
  const next = beginTurn(inquiry, 'That distinction helps.');
  next.status = 'complete'; next.response = 'Access and ownership can stay separate.';
  assert.equal(inquiry.workspaces.length, 1);
  assert.equal(inquiry.activeWorkspace, first);
  assert.equal(next.workspace, first);
  const second = unfold(inquiry, 'Criticality');
  assert.equal(inquiry.turns.length, 2);
  assert.equal(second.parent, first);
  const sketch = addPiece(inquiry, 'Three connected teams');
  sketch.type = 'drawing'; sketch.strokes = [[{ x: 13, y: 97 }, { x: 141, y: 42 }]];
  const image = addPiece(inquiry, 'Source ownership diagram');
  image.type = 'image'; image.data = 'data:image/png;base64,test-fixture';
  const restored = recover(JSON.parse(JSON.stringify(inquiry)));
  assert.equal(restored.motion, 'shutter');
  assert.equal(restored.theme, 'blueprint');
  assert.equal(restored.activeWorkspace, second.id);
  assert.deepEqual(restored.pieces, inquiry.pieces);
  assert.deepEqual([restored.pieces[0].workspace, restored.pieces[0].x, restored.pieces[0].y], [first, 173, 91]);
  assert.equal(restored.pieces[1].workspace, second.id);
  assert.deepEqual(contextFor(restored, 'Continue', 'converse').pieces.map(p => p.text), [note.text, sketch.text, image.text]);
});

test('comments retain attachment, replies and stacking; context is a bounded independent snapshot', () => {
  const inquiry = freshInquiry(), first = inquiry.activeWorkspace;
  const note = addPiece(inquiry, 'An idea', null, { x: 231, y: 56 });
  note.z = 8;
  const comment = addPiece(inquiry, 'Keep the uncertainty visible.', null, { type: 'comment', target: note.id, x: 307, y: 191 });
  for (let i = 0; i < 6; i++) comment.replies.push({ id: `reply-${i}`, text: i === 5 ? 'x'.repeat(1001) : `Reply ${i}`, created: `2026-10-27T10:0${i}:00Z` });
  comment.resolved = true;
  unfold(inquiry);
  const image = addPiece(inquiry, 'An asynchronous upload', null, { type: 'image', workspace: first });
  assert.equal(image.z, 10, 'stacking follows the owning sheet, not the currently focused one');
  const restored = recover(JSON.parse(JSON.stringify(inquiry)));
  assert.deepEqual(restored.pieces, inquiry.pieces);
  const context = contextFor(restored, 'Continue');
  const material = context.pieces.find(p => p.id === comment.id).artifact;
  assert.deepEqual([material.target, material.resolved, material.x, material.y], [note.id, true, 307, 191]);
  assert.deepEqual(material.replies.map(r => r.text.length), [7, 7, 7, 1000]);
  assert.equal(material.omittedReplies, 2);
  assert.equal(context.omitted.shortened, true);
  restored.pieces.find(p => p.id === comment.id).replies[5].text = 'Later revision';
  assert.equal(material.replies.at(-1).text, 'x'.repeat(1000));
  assert.equal(comment.replies.length, 6);
  assert.equal(comment.z, 9);
});
