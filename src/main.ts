/** 入口:装配 模拟 / 渲染 / 输入 / HUD / 主循环。M2:玩家英雄 + 兵线对线。 */
import { GameMap, Team } from './sim/map';
import type { World } from './sim/world';
import { createWorld } from './sim/setup';
import { spawnHero } from './sim/hero';
import { HEROES, heroByKey } from './data/heroes';
import type { Unit } from './sim/unit';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { GameLoop } from './engine/loop';
import { InputManager } from './engine/input';
import { Hud } from './ui/hud';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 20260610);
const speed = Number(params.get('speed') ?? 1);
const mode = params.get('mode') ?? 'play'; // play | spectate
const heroKey = params.get('hero') ?? 'rein';

const app = document.getElementById('app')!;
app.addEventListener('contextmenu', (e) => e.preventDefault());

const map = new GameMap();
const world: World = createWorld(map, { seed, creeps: true });

// 玩家英雄(观战模式不生成)
let hero: Unit | undefined;
if (mode === 'play') {
  hero = spawnHero(world, heroByKey(heroKey) ?? HEROES[0], Team.Dawn);
}

const camera = new Camera();
camera.centerOn(hero?.pos ?? { x: 7520, y: 7520 });
const renderer = new Renderer(app, world, camera);
const hud = new Hud(app);

const input = new InputManager(renderer.canvas, camera, {
  onRightClick(p) {
    if (!hero?.alive) return;
    // 右键敌人=攻击,地面=移动
    const target = world.queryRadius(p, 60, (u) => u.team !== hero!.team && !u.invulnerable)[0];
    if (target) hero.issueOrder({ type: 'attack', targetId: target.id });
    else hero.issueOrder({ type: 'move', pos: map.nearestWalkable(p) });
  },
  onLeftClick(p) {
    // 点击己方小兵(<50%)反补;空地取消
    if (!hero?.alive) return;
    void p;
  },
  onAttackMove(p) {
    if (!hero?.alive) return;
    const denyTarget = world.queryRadius(p, 60, (u) => u.team === hero!.team && u.kind === 'creep' && u.hp / u.calc.maxHp < 0.5)[0];
    if (denyTarget) hero.issueOrder({ type: 'attack', targetId: denyTarget.id });
    else hero.issueOrder({ type: 'attackmove', pos: map.nearestWalkable(p) });
  },
  onCastKey(_i, _p) { /* M3 技能 */ },
  onStop() { hero?.issueOrder({ type: 'stop' }); },
  onHold() { hero?.issueOrder({ type: 'hold' }); },
  onCenterHero() { if (hero) camera.centerOn(hero.pos); },
  onTogglePause() { loop.paused = !loop.paused; },
  onToggleScoreboard(_s) { /* M5 */ },
});

const loop = new GameLoop({
  step() {
    world.step();
  },
  render(alpha) {
    renderer.alpha = alpha;
    input.update(16.7);
    renderer.render(world, hero?.id ?? -1);
    hud.update(world, hero);
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
