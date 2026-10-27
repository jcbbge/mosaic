# Mosaic

A spatial instrument for developing a thought. Working name; experimental, domain-agnostic, not a chat product or a Made Well feature.

Start with a pink working sheet and an ongoing conversation. Keep notes, excerpts, sketches and images on the sheet. Unfold another sheet only when you choose. Full board reveals the same material in its connected, rotated arrangement.

## Run

Node 24 or newer. Run `npm ci`, then `npm start` to serve the app on port 3153. The only application dependency is `@highlighters/core`, used for marker strokes. For an orb, `.agents/setup` checks Node and installs the lockfile; `.amp/services.yaml` supervises the preview. Run `amp orb services ensure` and use the portal it returns.

Inference uses [Modal Endpoints](https://modal.com/docs/guide/endpoints). Configure these **server-side**, through secrets/environment variables or a local, ignored `.env` based on `.env.example`:

- `MODAL_PROXY_TOKEN`: the combined workspace proxy token, `wk-<id>.ws-<secret>`. Alternatively set `MODAL_PROXY_TOKEN_ID` and `MODAL_PROXY_TOKEN_SECRET` separately. An ID-only `MODAL_PROXY_TOKEN` can also be paired with `MODAL_PROXY_TOKEN_SECRET`. Modal API/deployment credentials are not interchangeable with proxy tokens.
- `MODAL_MODEL`: the exact model ID shown by the endpoint dashboard's request example or its `/v1/models` API. A Shared Endpoint model ID is its endpoint hostname; do not guess it from the model's marketing name.
- `MODAL_ENDPOINT_URL`: defaults to `https://inference.us-west.modal.direct/v1` for Shared Endpoints. A Dedicated Endpoint uses its own URL ending in `/v1`.

Restart the server after configuration. No endpoint, GPU deployment, proxy token or paid infrastructure is created automatically. Requests use the OpenAI-compatible `/chat/completions` interface. Missing configuration gives an actionable error, never a simulated reply. See [Modal's integration examples](https://modal.com/docs/guide/endpoint-integrations).

The server binds to loopback. This is a single-operator prototype, not an authenticated multi-tenant deployment. Do not expose it directly to the public Internet with a funded inference credential; use the orb's access-controlled portal or add proper application authentication before wider hosting. The public GitHub repository does not contain private inquiry records or credentials.

## Use

- Right-click the working paper for the radial tools. Space with board focus or Shift+F10 opens the same tools immediately; double-clicking empty paper also works. Escape or a click outside closes them. The small bottom hint is another entry point. Tools stay at the invocation point, not attached to a moving pointer. One native popover switches between tools and conversation; there are no separate typing/dictation/note dialogs.
- Chat as long as you like on the same sheet. Sending a message never unfolds or moves the board. Talk opens the single text/voice composer; Conversation reopens it. Enter sends; Shift+Enter adds a line. Optional dictation fills editable text without submitting it.
- Add a sticky note, draw freehand, or choose a PNG/JPEG/WebP image. Drag an artifact by its header; touching a card brings it to the front and saves its stacking order. Finish drawing to keep an editable sketch card; its drawing button reopens the original strokes. Images become Polaroid-like cards with an editable caption in the white space beneath them. Images are resized to at most 1280 pixels for browser storage, not kept as full-resolution file backups. Shapes, connectors and drawing over image pixels are not implemented.
- Comment on empty paper or right-click an artifact to attach a comment to its stable id. Comments support replies and resolve/reopen; this is local annotation, not yet multi-user discussion. Last four replies enter inference context with disclosed omissions; full threads remain in storage/export.
- Select a conversation passage and choose Highlight; the Marker selector offers chisel, bullet and fine nibs. With no selection, the message's Highlight button marks the whole message. The radial Highlight action opens the transcript, or marks an existing selection. These are real `@highlighters/core` ink overlays (`public/ink.js`), not background-color spans, and leave the words selectable. Highlight-only marks do not create board notes or add inference context. Pin to sheet separately keeps the selected passage or whole message as an editable note, with original text/source offsets and marker ink retained. Both marks and pins survive reload.
- The visible ← and → beside the input move between sheets. At the newest sheet, → unfolds a blank sheet. Neither arrow sends a message or calls inference; the sheet counter shows your position.
- The header selects Pivot or Shutter and Pink, Blueprint, Dot grid or Graph desktop. These preferences are saved per Mosaic. Patterns belong to the desktop; every sheet stays warm, subtly grained paper. The local raster texture was generated with ImageMagick Gaussian noise, seed 47, attenuation .055 over #fcfaf6. Shadows suggest paper edges and lifted cards without a 3D engine. Themes do not change grid geometry or artifact positions. Shutter slides clipped board views; it does not reflow the board. Browsers without the View Transition API use pivot instead.
- Options offers explicit unfolding with a lightweight thinking lens and a perspective for the next message. Skill lenses make a request, which may incur provider charges; these are authored prompts, not integrated AgentCore primitives. Choosing a perspective alone sends nothing. Ordinary messages return to conversation rather than repeating the exercise.
- Full board pulls back to the connected sheets. Drag empty space to pan, use the wheel or +/− to zoom, rotate the camera with ↶/↷, and Fit to recover the overview. Open sheet returns a region to editable focus. These camera actions never rewrite artifact coordinates or call inference. This is an unbounded camera around finite working sheets, not yet a general infinite-canvas editor.
- Notes and artifact captions enter bounded inference context. Image pixels and sketch geometry do **not** enter the model: describe their meaning in the caption. The originals remain visible on the board and included in exports. The model is told not to pretend it has seen them.
- Options contains saved Mosaics, export and next-context inspection. Up to 8 ancestral exchanges and 16 included pieces are sent. Exact submitted context remains recorded on each turn and in the export; this is not unlimited model memory.
- Browser storage is local, not shared or synced. Multi-user/agent collaboration is not implemented. Older inquiries migrate their recorded turns to sheets without deleting originals, drafts, annotations or source records. Export before clearing storage; treat exports as private.
- Speech recognition depends on browser support, permission and its speech service. It is not a server-side transcription implementation.

`npm test` exercises context, recovery and the HTTP/provider contract with a test fixture. `npm run check` checks JavaScript syntax. Neither constitutes a real Modal inference test. Read [the prototype brief](docs/inquiry.md) for boundaries and acceptance criteria.

## Design system

`public/style.css` owns the shared paper, color, typography and motion tokens. Content uses self-hosted **Inter** (Fontsource Variable 5.2.8); system labels, counters and status use **IBM Plex Mono** (Fontsource 5.2.7). Latin font files and their OFL licenses live in `public/fonts/`, with no third-party font requests. Leading is unitless: 1.55 for prose, 1.4 for system text and large notes, 1.5 for image/sketch captions. Heading leading tightens with size.

AGENTS.md requires project-local [Impeccable](https://github.com/pbakaus/impeccable) for all design/UI/layout work and [Emil Kowalski skills](https://github.com/emilkowalski/skills) for all motion and movement, with rendered and interaction verification. This is an agent instruction gate, not an automatic certification of design quality. Impeccable 4.8.0 is vendored with its references, license and checksum-verifying launcher; its engine is downloaded to a local cache, not checked in. Motion explains space rather than decorating every action: compositor transform animation, 160 ms press/radial-menu feedback, 280 ms shutter, and a deliberate 500 ms camera pivot so the large quarter-turn remains trackable. Pointer navigation is interruptible; keyboard menu invocation/navigation and reduced-motion navigation are immediate. Dragging remains 1:1. Text never fades out to hide a pane transition.

## Starting archive

- `archive/motion/`: the original shape-only pivot, shutter, scale/fade and hybrid experiments.
- `archive/studies/`: six authored application studies. These are static controls, not live inference.
- `docs/origin.md`: the exploration record inherited from Made Well's information-display lab.

Extracted from `jcbbge/madewell`, branch `lab/information-display`, on 2026-10-26. The original files and repository remain unchanged. The archive is a control, not the direction of the functional prototype.
