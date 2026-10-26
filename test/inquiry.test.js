import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshInquiry, beginTurn, addPiece, contextFor, recover } from '../public/inquiry.js';

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
  assert.deepEqual(branch.context.pieces, [{ id: kept.id, source: { turn: root.id, kind: 'response' }, original: 'Rest has value.', text: 'Rest can be worthwhile.', annotation: 'Do not imply unlimited leisure.' }]);
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
  assert.equal(restored.draft, 'My draft');
  assert.equal(restored.interjection, 'Unsent input');
});
