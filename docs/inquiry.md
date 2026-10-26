# Functional inquiry prototype

## Intent

The operator's six authored studies felt like a slideshow: predetermined answers led the reader instead of supporting exploration. Gaming was strongest because opposed perspectives changed the inquiry meaningfully. A persistent construction surface was absent. This prototype tests one domain-agnostic loop rather than building six products.

Start full-frame with typing or optional voice dictation. Every inference is a saved turn with a parent, user interjection, chosen move, perspective, exact submitted context and response. Navigating existing turns never calls a model. Each dial is explicitly labeled as a new inference action: the left applies the selected inquiry move; the right advances the perspective and asks again. The text form applies the currently selected pair. These are authored prompt prescriptions, not imported AgentCore skills or predetermined answers.

## Geometry

The initial frame is the pink origin. A new turn unfolds a large left pane and rotates the previous frame into the right half, recursively. Text remains in pane coordinates and left-aligned, including when its pane is vertical or upside down. It is never hidden during animation. Pivot, shutter, scale/fade and hybrid remain selectable; pivot is the default. Up to seven panes are visible, with older ancestry accessible through history. Existing-turn focus unfolds the selected turn and ancestors without inference. The origin can be revisited full-frame. This geometry represents ancestry, not a universal hierarchy of knowledge.

## Working surface

Select text from a user contribution or response; keep the exact excerpt with source identity and character offsets. Chisel, bullet and fine nibs use Highlighters' ink geometry, painted in pane-local coordinates so marks follow the words through rotation and reflow without wrapping or changing the source. Annotate it, edit a separate working expression, reorder or exclude it from the next context. Original turns remain unchanged. Add personal notes. A separate editable draft persists across navigation and inference. Nothing automatically assembles or replaces it. An explicit action appends selected pieces. Context preview shows the exact bounded payload before any dial or form submission; the used payload is saved on the turn. Older and truncated material is disclosed, not silently summarized.

The inquiry is browser-local, saved before a request and after every transition. Reload recovers recorded material. Interrupted pending turns become interrupted, never successful. Export contains the entire inquiry and its provenance. No cross-device collaboration, accounts, synchronization or unlimited model context is claimed. Storage failure must warn rather than claim durability.

## Inference and voice

One Node server proxies Modal Endpoints through their OpenAI-compatible Chat Completions API. Credentials stay server-side; no client key entry. The exact endpoint model ID and workspace proxy token must be configured; no default model is guessed. Missing configuration, rejection, timeout and cancellation retain the user's inputs and prior record. No automatic retries, tools, external execution or fake fallback. The deployed preview must not enable test responses. Tests inject a clearly labeled fixture provider into a separate server process only.

Voice uses the browser's optional SpeechRecognition API and fills editable text; it never auto-submits. Unsupported browsers have typing and an explicit message. Browser speech services may process audio externally. Real microphone/transcription accuracy is not established by DOM tests.

## Decision

DX hit: plain browser modules and Node's built-ins, no framework; one pinned dependency supplies the requested ink rendering. Cost: hand-managed DOM and transformed text measurement. UX hit: inference at deliberate turns, retained context and an adjacent construction surface. Cost: unfamiliar spatial orientation; comprehension and motion tolerance need user testing. AX hit: explicit ancestry, prompt snapshots, deterministic state and testable transport. Cost: provider access must be configured separately. Three expected hits justify this bounded prototype, not production rollout.

## Acceptance

- Empty full-frame entry; typed question and visible optional voice affordance.
- Successful, loading, missing-provider, failure and cancelled states.
- Both dials create distinct requests; history navigation creates none.
- No text visibility changes during motion; pane-local alignment/rotation at rest and in motion; all four treatments and reduced motion.
- Branching from an older turn does not erase descendants. Selections retain sources; context excludes unchecked pieces and unrelated branches.
- Edited pieces, annotations and draft survive navigation/reload. Explicit draft composition and JSON export retain origins.
- Desktop and narrow viewport render checks, real-pointer clip, server tests and syntax checks.
- Distinguish fixture-verified wiring from a real-provider run. No secret or real inquiry in repository or fixtures.
