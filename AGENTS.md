# Mosaic

- Read README.md and docs/inquiry.md before changing the functional prototype.
- Domain-agnostic inquiry, not a prescribed answer or automatic execution system.
- Preserve the archive as the original control.
- Navigation recovers recorded material; inference is explicit and creates a new turn. Never silently regenerate or overwrite a turn.
- Keep text attached to its pane, left-aligned in pane coordinates, throughout motion. Start a new inquiry full-frame.
- Preserve the sheet dimensions, fold matrices and artifact coordinates when changing themes or motion styles. Paper grids are decorative, never snapping/layout rules.
- Design gate: before any UI/layout/typography/material change, read `.agents/skills/impeccable/SKILL.md` and its applicable references, including `reference/craft-floor.md`. Preserve the operator's sparse, paper-based visual world and existing fractal geometry. Run the skill's detector on changed UI files and inspect the rendered result; explain any brief-driven exceptions.
- Motion gate: before any animation, transition, gesture or movement change, read the installed Emil Kowalski skills in `.agents/skills/animate/SKILL.md` (including `RECIPES.md`) and `.agents/skills/emil-design-eng/SKILL.md`; use `apple-design` for direct manipulation. Emil governs motion when general design advice differs. The operator's explicit interaction requirements take precedence over generic advice.
- These gates apply to every future UI change, not only new components. Verify keyboard, reduced-motion, interruption and real-pointer behavior before calling motion complete. Do not add decorative movement to frequently used tools.
- Keep typography and paper/motion tokens in `public/style.css`: self-hosted Inter for content, IBM Plex Mono for system communication, unitless size-appropriate leading. No per-feature font stacks or parallel timing systems. Preserve visible text during transitions, interrupt from the current presentation, honor reduced motion, and keep direct manipulation 1:1.
- Keep model output, user contributions, selected excerpts and edits distinguishable. Preserve source links and ancestry.
- Never put inference credentials in browser code, local storage, logs or commits.
- Run `npm test` and `npm run check`. Inspect rendered states and a real-pointer recording for appearance/motion changes.
- Do not claim live inference was tested when only a fixture was available.
