# Working sheets and a conversation

## Current experiment

The earlier prototype conflated each chat exchange with a new spatial pane. That felt like an interrogation and a slideshow. This iteration separates conversation from workspace transitions, while keeping the fractal pivot as the central spatial mechanism. It supersedes the earlier turn-as-pane interaction, not the archived motion studies.

A new Mosaic opens on warm, subtly grained paper over a pink desktop. Right-click or Space reveals a compact radial tool menu at the invocation point; it does not follow pointer motion. Talk switches that same native popover to the single text/dictation composer and transcript. Conversation continues as long as desired without moving the board and can be tucked away. Responses are requested briefly, as contributions rather than mandatory questions. Conversation is recorded locally but is not automatically pasted onto the canvas.

The operator's research reference is Maggie Appleton's [Planning with Agents: Divided Worlds, Boundary Objects, and Thicker Interfaces](https://maggieappleton.com/planning-agents). The useful framing is a boundary object: material people and agents can point at and work on, with representations appropriate to each. The accompanying notes add a restraint: interaction must earn its place, and sustained prose can be better than a visual control. Mosaic should help discover the relevant dimensions of a problem, not assume its skill menu already defines the design space. This reference informs the experiment; it is not evidence that the prototype achieves that goal. Caption-only media context and browser-local storage remain explicit gaps.

## Material

Notes, selected conversation excerpts, comments, freehand sketches and uploaded images belong to sheets. Each artifact has a stable id, owning workspace, local coordinates and saved stacking order. Touching a card raises it above its neighbors; dragging stays 1:1 with no position animation. Moving the camera never changes these coordinates. A note can be edited independently of its original source; pins retain turn identity and excerpt offsets. Separate highlight-only records use the real Highlighters renderer with a visible chisel/bullet/fine selector, remain selectable and do not silently create board notes or enter inference context. Comments may stand alone or reference an artifact id, with durable replies and resolve/reopen. The next context carries the last four replies per included comment, with omission counts, not a lossy rewrite of the stored thread. Sketches keep native stroke points, editable through their card's drawing control, rather than only a raster snapshot. Image uploads are resized browser-local previews in Polaroid-like cards with editable bottom captions, not full-resolution archival file storage. Unsupported files and decoding errors are explicit. Shapes, connectors and painting onto images remain unimplemented.

Material captions and notes enter the next bounded inference context, including artifacts on earlier sheets. Pixels and stroke geometry are not sent to Modal in this iteration. The image/sketch captions and options explain that limitation, and the model is instructed not to claim visual understanding. Inference never overwrites a canvas artifact.

## Space

Visible left/right arrows beside the input navigate existing sheets. Forward at the newest sheet unfolds a blank sheet. Navigation and blank unfolding never submit a prompt or call inference, and the counter shows the focused sheet's position. Options retains explicit unfolding with criticality, ablation, luck or connection: it opens a sheet and requests a contribution using that lens, not another prescribed stage. These are prompt prescriptions, not the actual AgentCore primitives. Options also offers a perspective for the next message without submitting or navigating. Ordinary chat uses the conversation operation, even after a skill contribution.

Each successive sheet occupies a stable transformed region of one global board, using the original rotated-child construction in reverse. Focusing a sheet rotates and scales the camera so the active sheet is large on the left and its predecessors remain folded beside it. Text, drawings and images remain attached to their sheets throughout motion. Text alignment is left-relative to the sheet, including when rotated. Reduced motion jumps directly to the target.

Pivot and Shutter are presentation choices over that same geometry. Pivot animates the camera transform; Shutter uses a directional sliding View Transition over the clipped board region (pivot fallback where unsupported). Neither changes the fold matrices, sheet dimensions or artifact coordinates. Rapid navigation may interrupt a transition; stale callbacks cannot restore an older focus. Keyboard navigation is immediate. Pink, Blueprint, Dot grid and Graph theme the desktop only; the sheets remain lightly textured warm paper. Subtle shadows suggest raised note edges and physical image cards, without a 3D scene. The patterns do not add snapping or layout rules. Theme and transition preferences are retained with the inquiry. Shared font, leading, color and motion tokens are documented in README.md. AGENTS.md gates all design/UI/layout work on Impeccable and all motion on Emil's project-local skills; these are review instructions, not automatic proof of compliance. Radial pointer invocation uses a 160 ms origin-anchored reveal; keyboard invocation and reduced motion are immediate.

Full board frames all sheets, not only the seven nearest ancestors. It uses the same DOM artifacts, not duplicates, summaries or a flattened export. Pan, zoom, camera rotation and Fit support exploration; Open sheet returns to editable focus. Other sheets and the overview are read-only until focused. Rotating the view does not rotate or move anyone's artifacts in the stored record. There is an unbounded camera around finite sheets; arbitrary infinite per-sheet editing, layout branching and simultaneous multiplayer editing are not implemented.

## Persistence and inference

The existing browser-local library retains turns, exact submitted context, artifacts, drafts, provenance and unsent text. Legacy inquiries migrate their turns into sheets; no original response is rewritten. Pending requests recover as interrupted, not successful. Save failure warns and offers export rather than claiming persistence. Export contains the entire local inquiry including image previews and native strokes.

The Node server proxies the existing Modal endpoint. Keys remain server-side. No automatic retries, simulated fallback, external execution, inference on navigation, shared store, accounts or agent write API. Requests retain the documented bounds: 8 ancestral exchanges, 16 selected pieces, character caps and disclosed omissions. This is not an unlimited context window. Browser dictation is optional, never auto-submits, and may use the browser vendor's speech service.

## Verification contract

- Multiple chat exchanges leave the active sheet and camera unchanged.
- Explicit blank unfolding adds a sheet but does not call inference; optional lens calls are distinguishable from chat.
- Canvas material retains identity, ownership, local layout, captions and original sources across focus, overview, rotation, navigation and reload.
- Drawing, sketch re-editing, image upload and caption editing work through the UI.
- Partial transcript selection pins only that excerpt and retains offsets.
- Highlighter-only marks preserve exact original text/offsets/nib through reload without adding board notes; all three nibs render, including overlapping marks and after resize.
- Right-click/keyboard tools stay within the viewport; one composer serves typing/dictation. Comments retain attachments, replies and resolution across reload, with independent bounded context snapshots. Card stacking survives navigation without duplicating material.
- Existing HTTP, context and interrupted-recovery tests pass; include a public-state regression for chat versus unfolding.
- Inspect empty, focused, overview, conversation and narrow rendered states, plus a real-pointer recording of transitions and camera exploration. Distinguish live inference from fixture coverage and browser dictation wiring from real microphone accuracy.

## Resume point

The radial-menu paper workspace is the current prototype to revisit, not a replacement for the fractal mechanism. Eight automated tests and JavaScript syntax checks pass; the previous session also exercised live Modal inference, all marker nibs, comments/replies, image captions, drawing, keyboard/reduced-motion controls and narrow layouts. Twenty-sheet navigation retained artifact records without extra inference, but deep-board rendering showed slow frames in the orb; profile before claiming long-board motion is polished. Multiplayer/shared persistence and agent access remain unimplemented, as do shapes, connectors and drawing over image pixels. Keep those limitations explicit rather than treating this local prototype as a deployed collaborative service.
