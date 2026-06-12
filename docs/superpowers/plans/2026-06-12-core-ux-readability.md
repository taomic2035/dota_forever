# Core UX Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first UX milestone from `docs/ux/2026-06-12-core-ux-design.md`: readable command feedback, targeting feedback, fixed HUD console, and combat feedback aligned with the approved generated references.

**Architecture:** Keep simulation authoritative. Add a small UI-facing feedback model that records short-lived command/targeting cues without changing gameplay rules. Render world-space cues in `Renderer`/`FxLayer`, fixed-screen information in `Hud`, and minimap cues in `MiniMap`.

**Tech Stack:** TypeScript, Vite, Canvas2D, DOM HUD, vitest, Playwright screenshot helper.

---

## File Structure

- Create `src/ui/uxFeedback.ts`: owns transient UX-only command pulses, targeting state, HUD slot flash state, and ping state.
- Modify `src/engine/input.ts`: exposes pending command mode and forwards cursor/target intent transitions.
- Modify `src/main.ts`: constructs `UxFeedback`, records command success/reject states, passes it to render/UI layers.
- Modify `src/render/renderer.ts`: draws selection rings, command pulses, targeting overlays, and stronger hit/health readability.
- Modify `src/render/fx.ts`: tunes floating text and adds explicit command/impact particle helpers if needed.
- Modify `src/render/minimap.ts`: keeps the existing camera box and aligns minimap pings with `UxFeedback`.
- Modify `src/ui/hud.ts`: replaces the current compact panel with a fixed console layout and slot state flashes.
- Test `tests/uxFeedback.test.ts`: pure tests for transient UX model timing and state clearing.
- Test `tests/fxlayer.test.ts`: validates effect rendering lifecycle without DOM regressions.
- Add screenshots under `docs/screenshots/ux-*`.

## Task 1: UX Feedback Model

**Files:**
- Create: `src/ui/uxFeedback.ts`
- Create: `tests/uxFeedback.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/uxFeedback.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { UxFeedback } from '../src/ui/uxFeedback';

describe('UxFeedback', () => {
  it('expires world pulses deterministically', () => {
    const ux = new UxFeedback();
    ux.addWorldPulse({ kind: 'move', pos: { x: 100, y: 200 }, time: 10 });

    expect(ux.worldPulsesAt(10.1)).toHaveLength(1);
    expect(ux.worldPulsesAt(10.7)).toHaveLength(0);
  });

  it('tracks targeting mode and clears it after confirm or cancel', () => {
    const ux = new UxFeedback();
    ux.setTargeting({ abilityIndex: 1, mode: 'line', origin: { x: 10, y: 20 }, range: 900, radius: 110 });

    expect(ux.targeting?.abilityIndex).toBe(1);
    expect(ux.targeting?.mode).toBe('line');

    ux.clearTargeting();
    expect(ux.targeting).toBeNull();
  });

  it('records HUD slot flashes by stable key', () => {
    const ux = new UxFeedback();
    ux.flashHudSlot('ability-2', 'reject', 5);

    expect(ux.hudFlashFor('ability-2', 5.2)?.kind).toBe('reject');
    expect(ux.hudFlashFor('ability-2', 5.7)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/uxFeedback.test.ts
```

Expected: FAIL with module resolution error for `../src/ui/uxFeedback`.

- [ ] **Step 3: Implement UX feedback model**

Create `src/ui/uxFeedback.ts`:

```ts
import type { Vec2 } from '../core/vec2';

export type WorldPulseKind = 'move' | 'attack' | 'attackmove' | 'reject' | 'stop' | 'hold' | 'ping';
export type TargetingMode = 'point' | 'unit' | 'line' | 'area';
export type HudFlashKind = 'confirm' | 'reject' | 'learn' | 'cooldown';

export interface WorldPulse {
  kind: WorldPulseKind;
  pos: Vec2;
  time: number;
  targetId?: number;
}

export interface TargetingState {
  abilityIndex: number;
  mode: TargetingMode;
  origin: Vec2;
  range: number;
  radius?: number;
  width?: number;
}

interface HudFlash {
  key: string;
  kind: HudFlashKind;
  time: number;
}

const WORLD_PULSE_LIFE = 0.55;
const HUD_FLASH_LIFE = 0.45;

export class UxFeedback {
  private pulses: WorldPulse[] = [];
  private hudFlashes: HudFlash[] = [];
  targeting: TargetingState | null = null;

  addWorldPulse(pulse: WorldPulse): void {
    this.pulses.push(pulse);
    if (this.pulses.length > 32) this.pulses.splice(0, this.pulses.length - 32);
  }

  worldPulsesAt(now: number): WorldPulse[] {
    this.pulses = this.pulses.filter((p) => now - p.time <= WORLD_PULSE_LIFE);
    return this.pulses;
  }

  setTargeting(state: TargetingState): void {
    this.targeting = state;
  }

  clearTargeting(): void {
    this.targeting = null;
  }

  flashHudSlot(key: string, kind: HudFlashKind, time: number): void {
    this.hudFlashes.push({ key, kind, time });
    if (this.hudFlashes.length > 24) this.hudFlashes.splice(0, this.hudFlashes.length - 24);
  }

  hudFlashFor(key: string, now: number): HudFlash | null {
    this.hudFlashes = this.hudFlashes.filter((f) => now - f.time <= HUD_FLASH_LIFE);
    for (let i = this.hudFlashes.length - 1; i >= 0; i--) {
      const flash = this.hudFlashes[i];
      if (flash.key === key) return flash;
    }
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/uxFeedback.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/uxFeedback.ts tests/uxFeedback.test.ts
git commit -m "feat(ux): add transient feedback model"
```

## Task 2: Command and Targeting Feedback Wiring

**Files:**
- Modify: `src/engine/input.ts`
- Modify: `src/main.ts`
- Modify: `src/render/renderer.ts`
- Test: `tests/uxFeedback.test.ts`

- [ ] **Step 1: Extend tests for range-clamped targeting data**

Append to `tests/uxFeedback.test.ts`:

```ts
it('replaces targeting state when a new ability is selected', () => {
  const ux = new UxFeedback();
  ux.setTargeting({ abilityIndex: 0, mode: 'area', origin: { x: 0, y: 0 }, range: 600, radius: 250 });
  ux.setTargeting({ abilityIndex: 2, mode: 'unit', origin: { x: 50, y: 60 }, range: 700 });

  expect(ux.targeting).toEqual({ abilityIndex: 2, mode: 'unit', origin: { x: 50, y: 60 }, range: 700 });
});
```

- [ ] **Step 2: Run focused test**

Run:

```bash
npm test -- tests/uxFeedback.test.ts
```

Expected: PASS after Task 1; this locks replacement behavior.

- [ ] **Step 3: Add feedback callbacks to input manager**

Modify `src/engine/input.ts` `InputCallbacks`:

```ts
  onPendingAttackMove(active: boolean): void;
  onPendingCast(index: number | null): void;
```

Update key and click paths:

```ts
if (this.pendingCast >= 0) {
  this.cb.onCastKey(this.pendingCast, world);
  this.pendingCast = -1;
  this.cb.onPendingCast(null);
} else if (this.pendingCast === -2) {
  this.cb.onAttackMove(world);
  this.pendingCast = -1;
  this.cb.onPendingAttackMove(false);
}
```

For right-click and escape:

```ts
this.pendingCast = -1;
this.cb.onPendingCast(null);
this.cb.onPendingAttackMove(false);
```

For `a`:

```ts
case 'a':
  this.pendingCast = -2;
  this.cb.onPendingAttackMove(true);
  break;
```

For QWER:

```ts
private quickCast(i: number, world: Vec2) {
  this.cb.onPendingCast(i);
  this.cb.onCastKey(i, world);
}
```

- [ ] **Step 4: Wire command pulses in `main.ts`**

Add import:

```ts
import { UxFeedback } from './ui/uxFeedback';
```

Create before minimap construction:

```ts
const ux = new UxFeedback();
```

Pass it to render and UI calls in Task 3 and Task 4. For now, record pulses in callbacks:

```ts
onRightClick(p) {
  if (!hero?.alive) return;
  const target = world.queryRadius(p, 60, (u) => u.team !== hero!.team && !u.invulnerable)[0];
  if (target) {
    hero.issueOrder({ type: 'attack', targetId: target.id });
    ux.addWorldPulse({ kind: 'attack', pos: target.pos, targetId: target.id, time: world.time });
  } else {
    const pos = map.nearestWalkable(p);
    hero.issueOrder({ type: 'move', pos });
    ux.addWorldPulse({ kind: 'move', pos, time: world.time });
  }
},
onAttackMove(p) {
  if (!hero?.alive) return;
  const denyTarget = world.queryRadius(p, 60, (u) => u.team === hero!.team && u.kind === 'creep' && u.hp / u.calc.maxHp < 0.5)[0];
  if (denyTarget) {
    hero.issueOrder({ type: 'attack', targetId: denyTarget.id });
    ux.addWorldPulse({ kind: 'attack', pos: denyTarget.pos, targetId: denyTarget.id, time: world.time });
  } else {
    const pos = map.nearestWalkable(p);
    hero.issueOrder({ type: 'attackmove', pos });
    ux.addWorldPulse({ kind: 'attackmove', pos, time: world.time });
  }
},
onStop() {
  if (hero) ux.addWorldPulse({ kind: 'stop', pos: hero.pos, time: world.time });
  hero?.issueOrder({ type: 'stop' });
},
onHold() {
  if (hero) ux.addWorldPulse({ kind: 'hold', pos: hero.pos, time: world.time });
  hero?.issueOrder({ type: 'hold' });
},
onPendingAttackMove(active) {
  if (!active) ux.clearTargeting();
},
onPendingCast(i) {
  if (i === null || !hero) ux.clearTargeting();
},
```

Expose it through the existing debug hook for deterministic screenshots:

```ts
window.__game = { world, hero, camera, loop, renderer, ux };
```

Update the global declaration:

```ts
declare global {
  interface Window {
    __game: { world: World; hero: Unit | undefined; camera: Camera; loop: GameLoop; renderer: Renderer; ux: UxFeedback };
  }
}
```

In `onCastKey`, flash HUD and reject when invalid:

```ts
if (!def || !inst || inst.level <= 0 || def.targetMode === 'passive') {
  ux.flashHudSlot(`ability-${i}`, 'reject', world.time);
  if (hero) ux.addWorldPulse({ kind: 'reject', pos: hero.pos, time: world.time });
  return;
}
```

- [ ] **Step 5: Add renderer method signature**

Change `Renderer.render` signature:

```ts
render(world: World, selectedId: number, ux?: import('../ui/uxFeedback').UxFeedback) {
```

Call it from `src/main.ts`:

```ts
renderer.render(world, hero?.id ?? -1, ux);
```

- [ ] **Step 6: Draw world pulses in `renderer.ts`**

Inside `render`, after `this.drawMapMarkers(world);`:

```ts
if (ux) this.drawUxPulses(world, ux);
```

Add method:

```ts
private drawUxPulses(world: World, ux: import('../ui/uxFeedback').UxFeedback): void {
  const ctx = this.ctx;
  for (const pulse of ux.worldPulsesAt(world.time)) {
    const age = world.time - pulse.time;
    const u = Math.max(0, Math.min(1, age / 0.55));
    const p = this.camera.worldToScreen(pulse.pos);
    const color =
      pulse.kind === 'move' ? '#7cff6b' :
      pulse.kind === 'attack' ? '#ff4c42' :
      pulse.kind === 'attackmove' ? '#ffd45a' :
      pulse.kind === 'reject' ? '#ff3040' :
      pulse.kind === 'ping' ? '#48d8ff' :
      '#cfe8ff';
    ctx.save();
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, this.s(5) * (1 - u * 0.35));
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.s(34 + 80 * u), 0, Math.PI * 2);
    ctx.stroke();
    if (pulse.kind === 'attack' || pulse.kind === 'attackmove') {
      ctx.beginPath();
      ctx.moveTo(p.x - this.s(22), p.y);
      ctx.lineTo(p.x + this.s(22), p.y);
      ctx.moveTo(p.x, p.y - this.s(22));
      ctx.lineTo(p.x, p.y + this.s(22));
      ctx.stroke();
    }
    ctx.restore();
  }
}
```

- [ ] **Step 7: Run checks**

Run:

```bash
npm run typecheck
npm test -- tests/uxFeedback.test.ts
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add src/engine/input.ts src/main.ts src/render/renderer.ts tests/uxFeedback.test.ts
git commit -m "feat(ux): show command feedback pulses"
```

## Task 3: Fixed HUD Console

**Files:**
- Modify: `src/ui/hud.ts`
- Modify: `src/main.ts`
- Test: `npm run typecheck`

- [ ] **Step 1: Add `UxFeedback` to HUD update**

Change signature:

```ts
update(world: World, hero: Unit | undefined, ux?: import('./uxFeedback').UxFeedback): void {
```

Update caller:

```ts
hud.update(world, hero, ux);
```

- [ ] **Step 2: Replace bottom panel CSS with fixed console dimensions**

In `Hud` constructor, replace `this.bottom.style.cssText` with:

```ts
this.bottom.style.cssText = [
  'position:absolute;bottom:0;left:50%;transform:translateX(-50%);pointer-events:auto;',
  'width:min(1180px,calc(100vw - 18px));height:172px;box-sizing:border-box;',
  'background:linear-gradient(#182015f6,#070a06fb);border:1px solid #5a4a25;border-bottom:none;',
  'box-shadow:0 -8px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,230,150,.08);',
  'border-radius:8px 8px 0 0;padding:8px 10px;font-size:12px;',
].join('');
```

- [ ] **Step 3: Render a stable HUD grid**

Replace the main `this.bottom.innerHTML` in `update` with a fixed three-zone layout:

```ts
const abilityHtml = (hero.heroDef?.abilities ?? []).map((_, i) => this.abilitySlot(world, hero, i, ux)).join('');
const itemHtml = hero.inventory.map((inst, i) => this.itemSlot(world, inst, i, ux)).join('');
this.bottom.innerHTML = `
  <div style="display:grid;grid-template-columns:260px 1fr 260px;gap:10px;height:100%;">
    <div style="display:grid;grid-template-columns:74px 1fr;gap:8px;min-width:0;">
      <div style="position:relative;width:74px;height:74px;border-radius:4px;border:2px solid ${hero.heroDef?.color ?? '#888'};background:${dead ? '#252525' : (hero.heroDef?.color ?? '#555') + '33'};display:flex;align-items:center;justify-content:center;font-size:34px;color:${hero.heroDef?.color ?? '#ccc'}">
        ${hero.heroDef?.glyph ?? '?'}
        <span style="position:absolute;left:-5px;bottom:-7px;background:#0b0d09;border:1px solid #caa84a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#ffd76a;font-weight:800">${hero.level}</span>
        ${m.skillPoints > 0 ? `<span style="position:absolute;top:-7px;right:-7px;background:#ffd54f;color:#1a1a0a;font-size:11px;font-weight:800;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px #ffd54f">+${m.skillPoints}</span>` : ''}
      </div>
      <div style="min-width:0;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">
          <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hero.name}</b>
          <span style="color:#d9b44a;white-space:nowrap">${m.kills}/${m.deaths}/${m.assists}</span>
        </div>
        ${this.meter('hp', hero.hp, hero.calc.maxHp, '#4caf50', '#1f6b2b')}
        ${this.meter('mp', hero.mp, hero.calc.maxMp, '#42a5f5', '#14569a')}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px 8px;margin-top:5px;color:#cfc7a5;font-size:11px;">
          <span>DMG ${Math.round(hero.calc.dmgMin)}-${Math.round(hero.calc.dmgMax)}</span>
          <span>ARM ${hero.calc.armor.toFixed(1)}</span>
          <span>MS ${Math.round(hero.calc.moveSpeed)}</span>
          <span>LH/DN ${m.lastHits}/${m.denies}</span>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:end;justify-content:center;gap:5px;min-width:0;">
      ${abilityHtml}
      ${this.statBonusSlot(hero)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,64px);gap:5px;align-content:end;justify-content:end;">
      ${itemHtml}
    </div>
  </div>`;
```

Add helper inside class:

```ts
private meter(label: string, value: number, max: number, top: string, bottom: string): string {
  const safeMax = Math.max(1, max);
  const frac = Math.max(0, Math.min(1, value / safeMax));
  return `<div style="background:#070807;border:1px solid #1f2418;height:17px;margin:3px 0;position:relative">
    <div style="background:linear-gradient(${top},${bottom});height:100%;width:${frac * 100}%"></div>
    <span style="position:absolute;inset:0;text-align:center;font-size:11px;line-height:17px;text-shadow:0 1px 2px #000">${Math.ceil(value)} / ${Math.round(max)}</span>
  </div>`;
}
```

- [ ] **Step 4: Make ability slots fixed and flash-aware**

Change `abilitySlot` signature:

```ts
private abilitySlot(world: World, hero: Unit, i: number, ux?: import('./uxFeedback').UxFeedback): string {
```

Add near border calculation:

```ts
const flash = ux?.hudFlashFor(`ability-${i}`, world.time);
const flashShadow = flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' : '';
```

Use fixed slot CSS:

```ts
style="position:relative;width:66px;height:66px;border:1.5px solid ${border};border-radius:4px;background:${bg};
display:flex;flex-direction:column;align-items:center;justify-content:center;${flashShadow}${lvl === 0 && !learnable ? 'opacity:.55;' : ''}"
```

- [ ] **Step 5: Make item slots fixed and hotkey-visible**

Change empty item slot dimensions from `38x30` to `64x64` and include the hotkey:

```ts
return `<div style="position:relative;width:64px;height:64px;border:1px solid #2c3520;border-radius:4px;background:#0d100a;
  font-size:10px;color:#555;display:flex;align-items:center;justify-content:center">
  <span style="position:absolute;top:2px;left:4px;color:#777">${i + 1}</span>
</div>`;
```

For filled slots:

```ts
style="position:relative;width:64px;height:64px;border:1px solid #5a6a3a;border-radius:4px;
background:${onCd ? '#1a1a1a' : '#222b18'};font-size:11px;color:#cfd8a0;display:flex;flex-direction:column;
align-items:center;justify-content:center;overflow:hidden;${onCd ? 'opacity:.5;' : ''}"
```

- [ ] **Step 6: Run checks**

Run:

```bash
npm run typecheck
npm test -- tests/hero.test.ts tests/items.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/hud.ts src/main.ts
git commit -m "feat(ux): rebuild fixed hero console"
```

## Task 4: Targeting Overlay and Combat Readability

**Files:**
- Modify: `src/main.ts`
- Modify: `src/render/renderer.ts`
- Modify: `src/render/fx.ts`
- Test: `tests/fxlayer.test.ts` and `tests/fxstyle.test.ts`

- [ ] **Step 1: Feed ability targeting state from `main.ts`**

In `onCastKey`, before issuing a valid point or unit cast, set targeting once for render feedback:

```ts
const range = def.castRange?.[Math.max(0, inst.level - 1)] ?? 700;
if (def.targetMode === 'point') {
  ux.setTargeting({
    abilityIndex: i,
    mode: 'area',
    origin: hero.pos,
    range,
    radius: 220,
  });
  const pos = map.nearestWalkable(p);
  hero.issueOrder({ type: 'cast', abilityIndex: i, pos });
  ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
  ux.addWorldPulse({ kind: 'ping', pos, time: world.time });
} else if (def.targetMode === 'unit') {
  ux.setTargeting({
    abilityIndex: i,
    mode: 'unit',
    origin: hero.pos,
    range,
  });
  const target = world.queryRadius(p, 90, (u) => u.alive && u.id !== hero!.id)[0];
  if (target) {
    hero.issueOrder({ type: 'cast', abilityIndex: i, targetId: target.id });
    ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
    ux.addWorldPulse({ kind: 'ping', pos: target.pos, targetId: target.id, time: world.time });
  } else {
    ux.flashHudSlot(`ability-${i}`, 'reject', world.time);
    ux.addWorldPulse({ kind: 'reject', pos: p, time: world.time });
  }
}
```

For no-target spells:

```ts
hero.issueOrder({ type: 'cast', abilityIndex: i });
ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
ux.addWorldPulse({ kind: 'ping', pos: hero.pos, time: world.time });
```

- [ ] **Step 2: Draw targeting overlay**

In `Renderer.render`, after `drawUxPulses`:

```ts
if (ux?.targeting) this.drawTargetingOverlay(ux.targeting);
```

Add method:

```ts
private drawTargetingOverlay(t: import('../ui/uxFeedback').TargetingState): void {
  const ctx = this.ctx;
  const origin = this.camera.worldToScreen(t.origin);
  const range = this.s(t.range);
  ctx.save();
  ctx.strokeStyle = 'rgba(80,170,255,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (t.radius) {
    ctx.strokeStyle = 'rgba(80,170,255,0.75)';
    ctx.fillStyle = 'rgba(80,170,255,0.08)';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, this.s(t.radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
```

- [ ] **Step 3: Strengthen hero and enemy selection rings**

In `drawUnit`, replace the team ring alpha with higher contrast:

```ts
ctx.strokeStyle = u.team === Team.Dawn ? 'rgba(80,235,100,0.85)' : u.team === Team.Night ? 'rgba(255,76,66,0.85)' : 'rgba(190,190,190,0.65)';
ctx.lineWidth = Math.max(1.5, this.s(3));
```

For selected ring:

```ts
ctx.strokeStyle = '#9cff74';
ctx.lineWidth = Math.max(2, this.s(4));
```

- [ ] **Step 4: Tune floating text readability**

In `src/render/fx.ts`, update floating text font and outline:

```ts
ctx.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`;
ctx.lineWidth = Math.max(3, fs * 0.18);
ctx.strokeStyle = 'rgba(0,0,0,0.92)';
```

For `last_hit`, increase gold size:

```ts
this.texts.push({ text: `+${e.gold}`, pos: { x: e.pos.x, y: e.pos.y - 20 }, color: '#ffd24a', size: 16, t: 0, life: 1.05, vy: -58 });
```

- [ ] **Step 5: Run checks**

Run:

```bash
npm run typecheck
npm test -- tests/fxstyle.test.ts tests/fxlayer.test.ts
```

If `tests/fxlayer.test.ts` does not exist, run:

```bash
npm test -- tests/fxstyle.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/render/renderer.ts src/render/fx.ts
git commit -m "feat(ux): add targeting and combat readability overlays"
```

## Task 5: Minimap Ping Feedback Alignment

**Files:**
- Modify: `src/render/minimap.ts`
- Modify: `src/main.ts`
- Test: `npm run typecheck`

- [ ] **Step 1: Extend minimap render signature**

Change:

```ts
render(world: World, viewerTeam: Team | null): void {
```

to:

```ts
render(world: World, viewerTeam: Team | null, ux?: import('../ui/uxFeedback').UxFeedback): void {
```

Update caller:

```ts
minimap.render(world, renderer.viewerTeam, ux);
```

- [ ] **Step 2: Record minimap Alt-click pings in `UxFeedback`**

Change minimap construction in `src/main.ts` from:

```ts
const minimap = new MiniMap(app, renderer.terrain, camera);
```

to:

```ts
const minimap = new MiniMap(app, renderer.terrain, camera, (wx, wy) => {
  ux.addWorldPulse({ kind: 'ping', pos: { x: wx, y: wy }, time: world.time });
});
```

- [ ] **Step 3: Draw ping pulses**

In `src/render/minimap.ts`, keep the existing `const k = SIZE / WORLD;`. After the current `this.pings` rendering block and before the existing camera viewport rectangle, add:

```ts
if (ux) {
  for (const pulse of ux.worldPulsesAt(world.time).filter((p) => p.kind === 'ping')) {
    const age = world.time - pulse.time;
    const u = Math.max(0, Math.min(1, age / 0.55));
    ctx.strokeStyle = `rgba(72,216,255,${1 - u})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pulse.pos.x * k, pulse.pos.y * k, 6 + 12 * u, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/minimap.ts src/main.ts
git commit -m "feat(ux): align minimap ping feedback"
```

## Task 6: Screenshots, UX Summary, and Full Verification

**Files:**
- Create: `docs/ux/2026-06-12-core-ux-readability-summary.md`
- Create: `docs/screenshots/ux-lane-hud.png`
- Create: `docs/screenshots/ux-cast-feedback.png`

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 5180
```

Expected: Vite listening on `http://127.0.0.1:5180`.

- [ ] **Step 2: Capture lane HUD screenshot**

Run:

```bash
node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-lane-hud.png 3500
```

Expected: PNG exists and shows a playable lane/HUD state.

- [ ] **Step 3: Capture targeting screenshot**

Use the `window.__game.ux` hook from Task 2 to force a deterministic targeting overlay before the screenshot:

```bash
node scripts/shot.mjs "http://127.0.0.1:5180/?mode=play&hero=zola&seed=42&speed=1" docs/screenshots/ux-cast-feedback.png 1500 "(() => { const g = window.__game; const h = g.hero; if (!h) return false; g.ux.setTargeting({ abilityIndex: 0, mode: 'line', origin: h.pos, range: 900, width: 120 }); return true; })()"
```

Expected: PNG exists and shows the targeting overlay.

- [ ] **Step 4: Write UX batch summary**

Create `docs/ux/2026-06-12-core-ux-readability-summary.md`:

```md
# Core UX Readability Batch Summary

Date: 2026-06-12

## Player-Facing Changes

- Added transient world command pulses for move, attack, attack-move, stop, hold, reject, and cast confirmation.
- Rebuilt the bottom HUD as a fixed-size command console with stable ability and inventory cells.
- Added targeting/cast feedback overlays and clearer combat floating text.
- Aligned minimap ping feedback with the world-space UX pulse model.

## Design Mapping

- `docs/ux/references/ux-target-lane-hud.png`: HUD console, lane readability, floating gold/damage.
- `docs/ux/references/ux-target-cast-feedback.png`: cast range, target pulse, enemy emphasis.
- `docs/ux/references/ux-target-map-base.png`: minimap and world landmark direction for later map pass.

## Verification

- `npm run typecheck`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- `docs/screenshots/ux-lane-hud.png`: captured
- `docs/screenshots/ux-cast-feedback.png`: captured

## Remaining UX Debt

- Full map/base readability pass.
- Unit and spell visual taxonomy pass.
- Full command cursor icon polish beyond world-space pulses.
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run typecheck
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src docs tests
git commit -m "feat(ux): complete core readability pass"
```

---

## Self-Review

Spec coverage:

- HUD console: Task 3.
- Command feedback: Task 1 and Task 2.
- Targeting feedback: Task 2 and Task 4.
- Combat readability: Task 4.
- Minimap camera/ping: Task 5.
- Summary protocol and screenshots: Task 6.

Known deferred items:

- Full map/base readability is intentionally deferred to the second UX milestone.
- Unit and spell identity taxonomy is intentionally deferred to the third UX milestone.
- Exact generated-image asset extraction is intentionally excluded; generated images are references only.
