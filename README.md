# Mosaic

A spatial instrument for developing a thought. Working name; experimental, domain-agnostic, not a chat product or a Made Well feature.

Start with a question in a full frame. Unfold an inquiry through different moves and perspectives. Keep, annotate and recombine its material on a persistent working surface without erasing earlier turns.

## Run

Node 24 or newer. Run `npm ci`, then `npm start` to serve the app on port 3153. The only application dependency is `@highlighters/core`, used for marker strokes. For an orb, `.agents/setup` checks Node and installs the lockfile; `.amp/services.yaml` supervises the preview. Run `amp orb services ensure` and use the portal it returns.

Inference uses [Modal Endpoints](https://modal.com/docs/guide/endpoints). Configure these **server-side**, through secrets/environment variables or a local, ignored `.env` based on `.env.example`:

- `MODAL_PROXY_TOKEN`: the combined workspace proxy token, `wk-<id>.ws-<secret>`. Alternatively set `MODAL_PROXY_TOKEN_ID` and `MODAL_PROXY_TOKEN_SECRET` separately. An ID-only `MODAL_PROXY_TOKEN` can also be paired with `MODAL_PROXY_TOKEN_SECRET`. Modal API/deployment credentials are not interchangeable with proxy tokens.
- `MODAL_MODEL`: the exact model ID shown by the endpoint dashboard's request example or its `/v1/models` API. A Shared Endpoint model ID is its endpoint hostname; do not guess it from the model's marketing name.
- `MODAL_ENDPOINT_URL`: defaults to `https://inference.us-west.modal.direct/v1` for Shared Endpoints. A Dedicated Endpoint uses its own URL ending in `/v1`.

Restart the server after configuration. No endpoint, GPU deployment, proxy token or paid infrastructure is created automatically. Requests use the OpenAI-compatible `/chat/completions` interface. Missing configuration gives an actionable error, never a simulated reply. See [Modal's integration examples](https://modal.com/docs/guide/endpoint-integrations).

The server binds to loopback. This is a single-operator prototype, not an authenticated multi-tenant deployment. Do not expose it directly to the public Internet with a funded inference credential; use the orb's access-controlled portal or add proper application authentication before wider hosting. The public GitHub repository does not contain private inquiry records or credentials.

## Use

- Type an opening question, or use optional browser dictation and review its text before submitting.
- The left dial asks using the selected inquiry move. The right dial advances the perspective and asks again. The form uses the displayed move/perspective. Each request may incur provider charges.
- History and peripheral panes only navigate recorded turns. Ask from an older turn to branch; existing descendants stay saved.
- Select response or contribution text, choose a chisel, bullet or fine nib, then mark and keep it, or discuss it. Ink overlays leave the original words selectable and unchanged; overlapping passes darken. Marks follow their source through scrolling, resizing and pane rotation. The working surface retains the exact source separately from edits and annotations. Checked pieces participate in the next context.
- Compose a draft yourself or explicitly append checked pieces. Inference never overwrites the draft.
- Inspect the next context before submitting and the exact used context on each recorded turn. Limits are disclosed, not disguised as unlimited memory.
- New inquiries preserve earlier ones in the saved-inquiry selector. Browser storage is local, not shared or synced. Export before clearing storage. The export includes full turns, prompt snapshots, pieces and draft; treat it as private.
- Speech recognition depends on browser support, permission and its speech service. It is not a server-side transcription implementation.

`npm test` exercises context, recovery and the HTTP/provider contract with a test fixture. `npm run check` checks JavaScript syntax. Neither constitutes a real Modal inference test. Read [the prototype brief](docs/inquiry.md) for boundaries and acceptance criteria.

## Starting archive

- `archive/motion/`: the original shape-only pivot, shutter, scale/fade and hybrid experiments.
- `archive/studies/`: six authored application studies. These are static controls, not live inference.
- `docs/origin.md`: the exploration record inherited from Made Well's information-display lab.

Extracted from `jcbbge/madewell`, branch `lab/information-display`, on 2026-10-26. The original files and repository remain unchanged. The archive is a control, not the direction of the functional prototype.
