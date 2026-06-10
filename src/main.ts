/** 入口:装配 模拟 / 渲染 / 输入 / HUD / 主循环。M2:玩家英雄 + 兵线对线。 */
import { GameMap, Team } from './sim/map';
import type { World } from './sim/world';
import { createWorld } from './sim/setup';
import { spawnHero } from './sim/hero';
import { installBotAI } from './sim/ai/bots';
import { HEROES, heroByKey } from './data/heroes';
import type { Unit } from './sim/unit';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { GameLoop } from './engine/loop';
import { InputManager } from './engine/input';
import { Hud } from './ui/hud';
import { KillFeed } from './ui/killfeed';
import { ShopPanel } from './ui/shop';
import { tryBuyback } from './sim/hero';
import { useItem } from './sim/items';
import { itemDef } from './data/items';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 20260610);
const speed = Number(params.get('speed') ?? 1);
const mode = params.get('mode') ?? 'play'; // play | spectate
const heroKey = params.get('hero') ?? 'rein';

const app = document.getElementById('app')!;
app.addEventListener('contextmenu', (e) => e.preventDefault());

const map = new GameMap();
const world: World = createWorld(map, { seed, creeps: true });

// 阵容:每队 5 人(玩家占晨曦一个位置,其余为 bot)
let hero: Unit | undefined;
if (mode === 'play') {
  hero = spawnHero(world, heroByKey(heroKey) ?? HEROES[0], Team.Dawn);
}
for (const team of [Team.Dawn, Team.Night]) {
  const botCount = team === Team.Dawn && hero ? 4 : 5;
  for (let i = 0; i < botCount; i++) {
    // 排除玩家已选英雄,循环取剩余
    const pool = HEROES.filter((h) => !(team === Team.Dawn && hero && h.key === hero.heroDef!.key));
    spawnHero(world, pool[i % pool.length], team);
  }
}
installBotAI(world, (id) => hero?.id === id);

const camera = new Camera();
camera.centerOn(hero?.pos ?? { x: 7520, y: 7520 });
const renderer = new Renderer(app, world, camera);
renderer.viewerTeam = mode === 'play' ? Team.Dawn : null;
const hud = new Hud(app);
const killfeed = new KillFeed(app);
const shop = new ShopPanel(app);
/** 等待地面点击的物品槽位,-1 = 无 */
let pendingItemSlot = -1;

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'b' && hero && !hero.alive) tryBuyback(world, hero);
});

const input = new InputManager(renderer.canvas, camera, {
  onRightClick(p) {
    if (!hero?.alive) return;
    // 右键敌人=攻击,地面=移动
    const target = world.queryRadius(p, 60, (u) => u.team !== hero!.team && !u.invulnerable)[0];
    if (target) hero.issueOrder({ type: 'attack', targetId: target.id });
    else hero.issueOrder({ type: 'move', pos: map.nearestWalkable(p) });
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
    if (denyTarget) hero.issueOrder({ type: 'attack', targetId: denyTarget.id });
    else hero.issueOrder({ type: 'attackmove', pos: map.nearestWalkable(p) });
  },
  onCastKey(_i, _p) { /* M3 技能 */ },
  onItemKey(slot, p) {
    if (!hero?.alive) return;
    const inst = hero.inventory[slot];
    if (!inst) return;
    const def = itemDef(inst.itemKey);
    if (!def.active) return;
    if (def.active.targetMode === 'none') {
      useItem(world, hero, slot);
    } else if (def.active.targetMode === 'point') {
      // 鼠标处快速施放
      useItem(world, hero, slot, map.nearestWalkable(p));
    } else {
      const target = world.queryRadius(p, 80, (u) => u.alive)[0];
      if (target) useItem(world, hero, slot, undefined, target);
    }
  },
  onStop() { hero?.issueOrder({ type: 'stop' }); },
  onHold() { hero?.issueOrder({ type: 'hold' }); },
  onCenterHero() { if (hero) camera.centerOn(hero.pos); },
  onTogglePause() { loop.paused = !loop.paused; },
  onToggleScoreboard(_s) { /* M5 */ },
  onToggleShop() { shop.toggle(); },
});

const loop = new GameLoop({
  step() {
    world.step();
    killfeed.consume(world);
  },
  render(alpha) {
    renderer.alpha = alpha;
    input.update(16.7);
    renderer.render(world, hero?.id ?? -1);
    hud.update(world, hero);
    shop.update(world, hero);
  },
});
loop.speed = speed;
loop.start();

// 自动化验证钩子
declare global {
  interface Window {
    __game: { world: World; hero: Unit | undefined; camera: Camera; loop: GameLoop };
  }
}
window.__game = { world, hero, camera, loop };
