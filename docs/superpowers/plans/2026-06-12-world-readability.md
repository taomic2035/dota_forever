# World Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve battlefield readability by adding tested map visual classification, stronger world landmarks, minimap icon consistency, and clearer projectile families.

**Architecture:** Add a pure render helper for map semantics, keep gameplay simulation unchanged, and consume the helper from Canvas world/minimap renderers. Keep projectiles visual-only in `renderer.ts`.

**Tech Stack:** TypeScript, Canvas2D, Vitest, Vite screenshot helper.

---

## File Structure

- Create `src/render/mapReadability.ts`: pure visual classification for terrain cells and landmarks.
- Create `tests/mapReadability.test.ts`: locks semantic visual categories.
- Modify `src/render/renderer.ts`: use visual classification for terrain bake, landmark drawings, and projectile family styling.
- Modify `src/render/minimap.ts`: replace fragile glyph icons with vector landmark icons and draw camp/rune/shop/pit categories.
- Create `docs/ux/2026-06-12-world-readability-summary.md`: required UX batch summary.
- Create screenshots under `docs/screenshots/ux-world-readability-*.png`.

## Task 1: Tested Map Readability Helper

**Files:**
- Create: `src/render/mapReadability.ts`
- Create: `tests/mapReadability.test.ts`

- [ ] Write a failing test that expects river, base, ramp, tree wall, secret shop, pit, rune, and camp visual categories.
- [ ] Run `npm test -- tests/mapReadability.test.ts` and confirm it fails because the module does not exist.
- [ ] Implement `terrainVisualAt(map, cx, cy)` and `landmarkVisuals(map)`.
- [ ] Run `npm test -- tests/mapReadability.test.ts` and confirm it passes.
- [ ] Commit as `feat(ux): add map readability classification`.

## Task 2: World Terrain and Landmark Rendering

**Files:**
- Modify: `src/render/renderer.ts`

- [ ] Use `terrainVisualAt` inside terrain baking to select palette and overlays.
- [ ] Draw lane/ramp/base/riverside accents without changing map walkability.
- [ ] Replace world secret shop and pit text glyphs with vector marks.
- [ ] Run `npm run typecheck` and `npm test -- tests/mapReadability.test.ts tests/map.test.ts`.
- [ ] Commit as `feat(ux): strengthen world map readability`.

## Task 3: Minimap Icon Consistency

**Files:**
- Modify: `src/render/minimap.ts`

- [ ] Use `landmarkVisuals` to draw secret shops, pit, runes, and camps.
- [ ] Replace text glyphs with small vector icons.
- [ ] Keep existing unit, building, fog, camera box, and ping behavior.
- [ ] Run `npm run typecheck`.
- [ ] Commit as `feat(ux): clarify minimap landmarks`.

## Task 4: Projectile Family Readability

**Files:**
- Modify: `src/render/renderer.ts`

- [ ] Differentiate tower shots from normal attacks by source unit kind.
- [ ] Keep ability projectiles as magic orbs but increase trail contrast.
- [ ] Keep projectile simulation untouched.
- [ ] Run `npm run typecheck` and `npm test -- tests/combat.test.ts tests/buildings.test.ts`.
- [ ] Commit as `feat(ux): differentiate projectile families`.

## Task 5: Screenshots, Summary, Full Verification

**Files:**
- Create: `docs/ux/2026-06-12-world-readability-summary.md`
- Create: `docs/screenshots/ux-world-readability-lane.png`
- Create: `docs/screenshots/ux-world-readability-map.png`

- [ ] Start Vite on `127.0.0.1:5181`.
- [ ] Capture a lane/world screenshot.
- [ ] Capture a minimap/base-region screenshot with deterministic camera positioning.
- [ ] Write the UX batch summary.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit as `feat(ux): complete world readability pass`.

## Self-Review

- Spec coverage: terrain, landmarks, minimap, projectile families, screenshots, and summary are covered.
- Deferred intentionally: final hero model/icon art, full spell animation taxonomy, custom cursor asset polish, and final HUD/minimap placement.
- No open-ended plan gaps remain; each task has concrete files and verification commands.
