import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.js';

const context = { question: 'Should adults game?', input: 'What if it connects distant friends?', move: 'ablate', lens: 'against', history: [{ id: 'root', input: 'Initial thought', response: 'A prior response.' }], pieces: [{ id: 'piece', source: { turn: 'root', kind: 'response' }, original: 'Prior', text: 'An edited expression', annotation: 'Treat as hypothetical' }], draft: 'Rest and commitments can coexist.' };
async function serve(t, options) {
  const app = createApp(options); app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(() => new Promise(resolve => { app.closeAllConnections(); app.close(resolve); }));
  return `http://127.0.0.1:${app.address().port}`;
}
const send = (url, value = context, headers = {}) => fetch(`${url}/api/turn`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value) });

test('HTTP inference submits the selected operation and exact context, not a fabricated response', async t => {
  let received;
  const url = await serve(t, { apiKey: 'test-not-a-secret', model: 'test-fixture', baseUrl: 'https://test.invalid/v1/', fetcher: async (endpoint, options) => {
    received = { endpoint, options, body: JSON.parse(options.body) };
    return Response.json({ model: 'fixture-returned-model', choices: [{ message: { content: 'TEST FIXTURE: a distinctly new response.' }, finish_reason: 'length' }] });
  } });
  const response = await send(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { response: 'TEST FIXTURE: a distinctly new response.', model: 'fixture-returned-model', truncated: true });
  assert.equal(received.endpoint, 'https://test.invalid/v1/chat/completions');
  assert.equal(received.options.headers.Authorization, 'Bearer test-not-a-secret');
  assert.match(received.body.messages[0].content, /Remove it, inspect what survives/);
  assert.match(received.body.messages[0].content, /strongest fair challenge/);
  assert.deepEqual(JSON.parse(received.body.messages[1].content), context);
  const status = await (await fetch(`${url}/api/status`)).text();
  assert.equal(status.includes('test-not-a-secret'), false);
  assert.equal((await fetch(`${url}/server.js`)).status, 404);
  assert.equal((await fetch(`${url}/.env`)).status, 404);
  const ink = await (await fetch(`${url}/ink.js`)).text();
  assert.match(ink, /from '\/vendor\/highlighters.js'/);
  const vendor = await fetch(`${url}/vendor/highlighters.js`);
  assert.equal(vendor.status, 200);
  const chunk = /from "(\.\/chunk-[^"]+\.js)"/.exec(await vendor.text())[1];
  assert.equal((await fetch(new URL(chunk, `${url}/vendor/highlighters.js`))).status, 200);
});

test('unconfigured inference and provider errors never become successful or leak credentials', async t => {
  const missing = await serve(t, { apiKey: '', model: '' });
  const failure = await send(missing);
  assert.equal(failure.status, 503);
  assert.equal((await failure.json()).code, 'PROVIDER_NOT_CONFIGURED');
  let calls = 0;
  const rejected = await serve(t, { apiKey: 'test-not-a-secret', model: 'fixture', fetcher: async () => { calls++; return Response.json({ error: 'sensitive-provider-detail' }, { status: 401 }); } });
  const response = await send(rejected), body = await response.text();
  assert.equal(response.status, 502);
  assert.match(body, /PROVIDER_REJECTED/);
  assert.equal(body.includes('sensitive-provider-detail'), false);
  assert.equal(body.includes('test-not-a-secret'), false);
  assert.equal(calls, 1);
});

test('invalid and cross-site requests are rejected before any provider call', async t => {
  let calls = 0;
  const url = await serve(t, { apiKey: 'fixture', model: 'fixture', fetcher: async () => { calls++; throw new Error('Should not run'); } });
  assert.equal((await send(url, { ...context, move: 'execute' })).status, 400);
  assert.equal((await send(url, { ...context, input: 'x'.repeat(6001) })).status, 400);
  assert.equal((await send(url, { ...context, history: [null] })).status, 400);
  assert.equal((await send(url, { ...context, pieces: [null] })).status, 400);
  assert.equal((await send(url, context, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal(calls, 0);
});
