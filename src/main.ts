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
import { itemDef } from './data/items';
import { AudioDirector } from './audio/director';
import { UxFeedback } from './ui/uxFeedback';

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
  const minimap = new MiniMap(app, renderer.terrain, camera, (wx, wy) => {
    ux.addWorldPulse({ kind: 'ping', pos: { x: wx, y: wy }, time: world.time });
  });
  const audio = new AudioDirector();
  const pauseMenu = createPauseMenu(app, () => { loop.paused = !loop.paused; });

  let pendingItemSlot = -1;

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b' && hero && !hero.alive) tryBuyback(world, hero);
    if (e.key === 'Escape') pauseMenu.toggle();
  });

  const input = new InputManager(renderer.canvas, camera, {
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
    onLeftClick(p) {
      if (!hero?.alive) return;
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
    onCastKey(i, p) {
      if (!hero?.alive) return;
      const def = hero.heroDef?.abilities[i];
      const inst = hero.abilities[i];
      if (!def || !inst || inst.level <= 0 || def.targetMode === 'passive') {
        ux.flashHudSlot(`ability-${i}`, 'reject', world.time);
        ux.addWorldPulse({ kind: 'reject', pos: hero.pos, time: world.time });
        return;
      }
      const range = def.castRange?.[Math.max(0, inst.level - 1)] ?? 700;
      if (def.targetMode === 'none') {
        hero.issueOrder({ type: 'cast', abilityIndex: i });
        ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
        ux.addWorldPulse({ kind: 'ping', pos: hero.pos, time: world.time });
      } else if (def.targetMode === 'point') {
        ux.setTargeting({ abilityIndex: i, mode: 'area', origin: hero.pos, range, radius: 220 });
        const pos = map.nearestWalkable(p);
        hero.issueOrder({ type: 'cast', abilityIndex: i, pos });
        ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
        ux.addWorldPulse({ kind: 'ping', pos, time: world.time });
      } else {
        ux.setTargeting({ abilityIndex: i, mode: 'unit', origin: hero.pos, range });
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
    },
    onItemKey(slot, p) {
      if (!hero?.alive) return;
      const inst = hero.inventory[slot];
      if (!inst) return;
      const def = itemDef(inst.itemKey);
      if (!def.active) return;
      if (def.active.targetMode === 'none') {
        useItem(world, hero, slot);
      } else if (def.active.targetMode === 'point') {
        useItem(world, hero, slot, map.nearestWalkable(p));
      } else {
        const target = world.queryRadius(p, 80, (u) => u.alive)[0];
        if (target) useItem(world, hero, slot, undefined, target);
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
    onCenterHero() { if (hero) camera.centerOn(hero.pos); },
    onTogglePause() { loop.paused = !loop.paused; },
    onToggleScoreboard(s) { scoreboard.setVisible(s, world); },
    onToggleShop() { shop.toggle(); },
    onPendingAttackMove(active) {
      if (!active) ux.clearTargeting();
    },
    onPendingCast(i) {
      if (i === null || !hero) ux.clearTargeting();
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
