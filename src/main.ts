/** 入口:主菜单 或 对局(由 URL 参数决定)。 */
import { GameMap, Team } from './sim/map';
import type { World } from './sim/world';
import { createWorld } from './sim/setup';
import { spawnHero, tryBuyback } from './sim/hero';
import { installBotAI } from './sim/ai/bots';
import { HEROES, heroByKey } from './data/heroes';
import type { Unit } from './sim/unit';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { MiniMap } from './render/minimap';
import { GameLoop } from './engine/loop';
import { InputManager } from './engine/input';
import { Hud } from './ui/hud';
import { KillFeed } from './ui/killfeed';
import { ShopPanel } from './ui/shop';
import { EndScreen } from './ui/endscreen';
import { Scoreboard } from './ui/scoreboard';
import { showMenu, createPauseMenu } from './ui/menu';
import { useItem } from './sim/items';
import { learnAbility, learnStatBonus } from './sim/abilities';
import { stateOf } from './sim/combat';
import { itemDef } from './data/items';
import { AudioDirector } from './audio/director';
import { UxFeedback } from './ui/uxFeedback';
import { CommandCursor } from './ui/commandCursor';
import { findFilteredTarget, type TargetTeamFilter } from './engine/targetFilters';
import { cursorTargetHintFor } from './ui/cursorTargetHint';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app')!;
app.addEventListener('contextmenu', (e) => e.preventDefault());

const modeParam = params.get('mode');
if (!modeParam) {
  showMenu(app);
} else {
  startGame(modeParam as 'play' | 'spectate');
}

function startGame(mode: 'play' | 'spectate'): void {
  const seed = Number(params.get('seed') ?? Math.floor(Math.random() * 1e9));
  const speed = Number(params.get('speed') ?? 1);
  const heroKey = params.get('hero') ?? 'rein';

  const map = new GameMap();
  const world: World = createWorld(map, { seed, creeps: true });

  // 阵容:每队 5 人(玩家占晨曦一个位置,其余为 bot)
  let hero: Unit | undefined;
  if (mode === 'play') {
    hero = spawnHero(world, heroByKey(heroKey) ?? HEROES[0], Team.Dawn);
  }
  for (const team of [Team.Dawn, Team.Night]) {
    const botCount = team === Team.Dawn && hero ? 4 : 5;
    const pool = HEROES.filter((h) => !(team === Team.Dawn && hero && h.key === hero.heroDef!.key));
    for (let i = 0; i < botCount; i++) {
      spawnHero(world, pool[i % pool.length], team);
    }
  }
  installBotAI(world, (id) => hero?.id === id);

  const camera = new Camera();
  camera.centerOn(hero?.pos ?? { x: 7520, y: 7520 });
  const renderer = new Renderer(app, world, camera);
  renderer.viewerTeam = mode === 'play' ? Team.Dawn : null;
  const hud = new Hud(app);
  hud.onLearn = (i) => { if (hero?.alive) learnAbility(world, hero, i); };
  hud.onLearnStat = () => { if (hero?.alive) learnStatBonus(hero); };
  const killfeed = new KillFeed(app);
  const shop = new ShopPanel(app);
  const endScreen = new EndScreen(app);
  const scoreboard = new Scoreboard(app);
  const ux = new UxFeedback();
  const commandCursor = new CommandCursor(app);
  const minimap = new MiniMap(app, renderer.terrain, camera, (wx, wy) => {
    ux.addWorldPulse({ kind: 'ping', pos: { x: wx, y: wy }, time: world.time });
  });
  const audio = new AudioDirector();
  const pauseMenu = createPauseMenu(app, () => { loop.paused = !loop.paused; });

  let pendingItemSlot = -1;
  type RejectReason =
    | 'dead'
    | 'not-learned'
    | 'passive'
    | 'cooldown'
    | 'no-mana'
    | 'silenced'
    | 'empty-slot'
    | 'no-active'
    | 'no-charges'
    | 'invalid-target'
    | 'blocked';
  const rejectLabel: Record<RejectReason, string> = {
    dead: 'DEAD',
    'not-learned': 'NOT LEARNED',
    passive: 'PASSIVE',
    cooldown: 'ON COOLDOWN',
    'no-mana': 'NO MANA',
    silenced: 'SILENCED',
    'empty-slot': 'EMPTY SLOT',
    'no-active': 'NO ACTIVE',
    'no-charges': 'NO CHARGES',
    'invalid-target': 'INVALID TARGET',
    blocked: "CAN'T USE",
  };
  const showReject = (reason: RejectReason, pos: { x: number; y: number }, hudKey?: string) => {
    if (hudKey) ux.flashHudSlot(hudKey, 'reject', world.time);
    ux.setCommandMessage({ kind: 'reject', label: rejectLabel[reason], time: world.time, color: '#ff3040' });
    ux.addWorldPulse({ kind: 'reject', pos, time: world.time });
  };

  const castRejectReason = (i: number): RejectReason | null => {
    if (!hero?.alive) return 'dead';
    const def = hero.heroDef?.abilities[i];
    const inst = hero.abilities[i];
    if (!def || !inst || inst.level <= 0) return 'not-learned';
    if (def.targetMode === 'passive' || (def.passiveModifier && !def.onCast && !def.channel)) return 'passive';
    if (world.time < inst.cooldownUntil) return 'cooldown';
    const mana = def.manaCost?.[Math.max(0, inst.level - 1)] ?? 0;
    if (hero.mp < mana) return 'no-mana';
    if (stateOf(hero).silenced) return 'silenced';
    return null;
  };

  const castInfo = (i: number) => {
    if (castRejectReason(i)) return null;
    if (!hero) return null;
    const def = hero.heroDef?.abilities[i];
    const inst = hero.abilities[i];
    if (!def || !inst) return null;
    const range = def.castRange?.[Math.max(0, inst.level - 1)] ?? 700;
    return { def, inst, range };
  };

  const targetAt = (p: { x: number; y: number }, filter?: TargetTeamFilter) => {
    if (!hero) return undefined;
    return findFilteredTarget(
      (pos, radius, pred) => world.queryRadius(pos, radius, pred),
      hero,
      p,
      90,
      filter,
    );
  };

  const previewCast = (i: number, p: { x: number; y: number }) => {
    const info = castInfo(i);
    if (!hero || !info) return false;
    const mode = info.def.targetMode === 'unit' ? 'unit' : 'area';
    const target = mode === 'unit' ? targetAt(p, info.def.targetTeam) : null;
    const valid = mode === 'unit' ? !!target : true;
    ux.setTargeting({
      abilityIndex: i,
      mode,
      origin: hero.pos,
      cursor: p,
      range: info.range,
      radius: mode === 'area' ? 220 : undefined,
      valid,
    });
    return valid;
  };

  const itemInfo = (slot: number) => {
    if (itemRejectReason(slot)) return null;
    if (!hero) return null;
    const inst = hero.inventory[slot];
    if (!inst) return null;
    const def = itemDef(inst.itemKey);
    const active = def.active;
    if (!active) return null;
    return { inst, def, active, range: active.castRange ?? 700 };
  };

  function itemRejectReason(slot: number): RejectReason | null {
    if (!hero?.alive) return 'dead';
    const inst = hero.inventory[slot];
    if (!inst) return 'empty-slot';
    const def = itemDef(inst.itemKey);
    if (!def.active) return 'no-active';
    if (world.time < inst.cooldownUntil) return 'cooldown';
    if (def.active.manaCost && hero.mp < def.active.manaCost) return 'no-mana';
    if (def.charges !== undefined && inst.charges <= 0) return 'no-charges';
    return null;
  }

  const itemUseFailureReason = (slot: number): RejectReason => {
    const reason = itemRejectReason(slot);
    if (reason) return reason;
    const inst = hero?.inventory[slot];
    if (inst) {
      const def = itemDef(inst.itemKey);
      if (def.rechargeable && inst.charges <= 0) return 'no-charges';
    }
    return 'blocked';
  };

  const previewItem = (slot: number, p: { x: number; y: number }) => {
    const info = itemInfo(slot);
    if (!hero || !info) return false;
    const mode = info.active.targetMode === 'unit' ? 'unit' : 'area';
    const target = mode === 'unit' ? targetAt(p, info.active.targetTeam) : null;
    const valid = mode === 'unit' ? !!target : true;
    ux.setTargeting({
      abilityIndex: -1,
      source: 'item',
      itemSlot: slot,
      mode,
      origin: hero.pos,
      cursor: p,
      range: info.range,
      radius: mode === 'area' ? 180 : undefined,
      valid,
    });
    return valid;
  };

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b' && hero && !hero.alive) tryBuyback(world, hero);
    if (e.key === 'Escape' && !ux.targeting) pauseMenu.toggle();
  });

  const input = new InputManager(renderer.canvas, camera, {
    onRightClick(p) {
      if (!hero?.alive) return;
      ux.clearCursorIntent();
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
    onLeftClick(p) {
      if (!hero?.alive) return;
      ux.clearCursorIntent();
      if (pendingItemSlot >= 0) {
        useItem(world, hero, pendingItemSlot, map.nearestWalkable(p));
        pendingItemSlot = -1;
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
    onPrepareCast(i, p) {
      const info = castInfo(i);
      if (!hero || !info) {
        if (hero) showReject(castRejectReason(i) ?? 'blocked', hero.pos, `ability-${i}`);
        return false;
      }
      ux.clearCommandMessage();
      if (info.def.targetMode === 'none') {
        hero.issueOrder({ type: 'cast', abilityIndex: i });
        ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
        ux.addWorldPulse({ kind: 'ping', pos: hero.pos, time: world.time });
        ux.clearTargeting();
        return false;
      }
      previewCast(i, p);
      return true;
    },
    onPreviewCast(i, p) {
      previewCast(i, p);
    },
    onCastKey(i, p) {
      const info = castInfo(i);
      if (!hero || !info) {
        if (hero) showReject(castRejectReason(i) ?? 'blocked', hero.pos, `ability-${i}`);
        return false;
      }
      if (info.def.targetMode === 'point') {
        const pos = map.nearestWalkable(p);
        hero.issueOrder({ type: 'cast', abilityIndex: i, pos });
        ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
        ux.clearCommandMessage();
        ux.addWorldPulse({ kind: 'ping', pos, time: world.time });
        ux.clearTargeting();
        return true;
      }
      if (info.def.targetMode === 'unit') {
        const target = targetAt(p, info.def.targetTeam);
        if (target) {
          hero.issueOrder({ type: 'cast', abilityIndex: i, targetId: target.id });
          ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
          ux.clearCommandMessage();
          ux.addWorldPulse({ kind: 'ping', pos: target.pos, targetId: target.id, time: world.time });
          ux.clearTargeting();
          return true;
        }
        previewCast(i, p);
        showReject('invalid-target', p, `ability-${i}`);
        return false;
      }
      return true;
    },
    onPrepareItem(slot, p) {
      const info = itemInfo(slot);
      if (!hero || !info) {
        if (hero) showReject(itemRejectReason(slot) ?? 'blocked', hero.pos, `item-${slot}`);
        return false;
      }
      ux.clearCommandMessage();
      if (info.active.targetMode === 'none') {
        const ok = useItem(world, hero, slot);
        ux.flashHudSlot(`item-${slot}`, ok ? 'confirm' : 'reject', world.time);
        if (ok) {
          ux.clearCommandMessage();
          ux.addWorldPulse({ kind: 'ping', pos: hero.pos, time: world.time });
        } else {
          showReject(itemUseFailureReason(slot), hero.pos, `item-${slot}`);
        }
        ux.clearTargeting();
        return false;
      }
      previewItem(slot, p);
      return true;
    },
    onPreviewItem(slot, p) {
      previewItem(slot, p);
    },
    onItemKey(slot, p) {
      const info = itemInfo(slot);
      if (!hero || !info) {
        if (hero) showReject(itemRejectReason(slot) ?? 'blocked', hero.pos, `item-${slot}`);
        return false;
      }
      if (info.active.targetMode === 'point') {
        const pos = map.nearestWalkable(p);
        const ok = useItem(world, hero, slot, pos);
        ux.flashHudSlot(`item-${slot}`, ok ? 'confirm' : 'reject', world.time);
        if (ok) {
          ux.clearCommandMessage();
          ux.addWorldPulse({ kind: 'ping', pos, time: world.time });
          ux.clearTargeting();
        } else {
          previewItem(slot, p);
          showReject(itemUseFailureReason(slot), pos, `item-${slot}`);
        }
        return ok;
      }
      if (info.active.targetMode === 'unit') {
        const target = targetAt(p, info.active.targetTeam);
        if (target) {
          const ok = useItem(world, hero, slot, undefined, target);
          ux.flashHudSlot(`item-${slot}`, ok ? 'confirm' : 'reject', world.time);
          if (ok) {
            ux.clearCommandMessage();
            ux.addWorldPulse({ kind: 'ping', pos: target.pos, targetId: target.id, time: world.time });
            ux.clearTargeting();
          } else {
            previewItem(slot, p);
            showReject(itemUseFailureReason(slot), target.pos, `item-${slot}`);
          }
          return ok;
        }
        previewItem(slot, p);
        showReject('invalid-target', p, `item-${slot}`);
        return false;
      }
      return true;
    },
    onStop() {
      if (hero) ux.addWorldPulse({ kind: 'stop', pos: hero.pos, time: world.time });
      hero?.issueOrder({ type: 'stop' });
    },
    onHold() {
      if (hero) ux.addWorldPulse({ kind: 'hold', pos: hero.pos, time: world.time });
      hero?.issueOrder({ type: 'hold' });
    },
    onCenterHero() { if (hero) camera.centerOn(hero.pos); },
    onTogglePause() { loop.paused = !loop.paused; },
    onToggleScoreboard(s) { scoreboard.setVisible(s, world); },
    onToggleShop() { shop.toggle(); },
    onPointerMove(screen) {
      ux.setCursorPosition(screen);
    },
    onPendingAttackMove(active) {
      if (active) {
        ux.setCursorIntent({ kind: 'attackmove', label: 'A-MOVE', time: world.time, color: '#ffd45a', targetHint: 'attack' });
      } else {
        ux.clearTargeting();
        ux.clearCursorIntent();
      }
    },
    onPendingCast(i) {
      if (i === null || !hero) {
        ux.clearTargeting();
        ux.clearCursorIntent();
      } else {
        const hotkey = ['Q', 'W', 'E', 'R'][i] ?? '?';
        const def = hero.heroDef?.abilities[i];
        ux.setCursorIntent({
          kind: 'cast',
          label: `CAST ${hotkey}`,
          time: world.time,
          color: '#5aa2ff',
          targetHint: cursorTargetHintFor(def?.targetMode, def?.targetTeam),
        });
      }
    },
    onPendingItem(slot) {
      if (slot === null || !hero) {
        ux.clearTargeting();
        ux.clearCursorIntent();
      } else {
        const info = itemInfo(slot);
        ux.setCursorIntent({
          kind: 'item',
          label: `ITEM ${slot + 1}`,
          time: world.time,
          color: '#d9b44a',
          targetHint: cursorTargetHintFor(info?.active.targetMode, info?.active.targetTeam),
        });
      }
    },
  });

  const loop = new GameLoop({
    step() {
      world.step();
      renderer.fx.consume(world, renderer.viewerTeam);
      killfeed.consume(world);
      audio.consume(world, hero);
    },
    render(alpha) {
      renderer.alpha = alpha;
      input.update(16.7);
      renderer.render(world, hero?.id ?? -1, ux);
      hud.update(world, hero, ux);
      commandCursor.update(world.time, ux);
      shop.update(world, hero);
      minimap.render(world, renderer.viewerTeam, ux);
      endScreen.check(world, mode === 'play' ? Team.Dawn : null);
    },
  });
  loop.speed = speed;
  loop.start();

  window.__game = { world, hero, camera, loop, renderer, ux };
}

declare global {
  interface Window {
    __game: { world: World; hero: Unit | undefined; camera: Camera; loop: GameLoop; renderer: Renderer; ux: UxFeedback };
  }
}
