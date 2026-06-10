/** 入口:装配 模拟 / 渲染 / 输入 / 主循环。M1:单英雄地图漫游。 */
import { GameMap, Team } from './sim/map';
import { World } from './sim/world';
import type { Unit } from './sim/unit';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { GameLoop } from './engine/loop';
import { InputManager } from './engine/input';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 20260610);
const speed = Number(params.get('speed') ?? 1);

const app = document.getElementById('app')!;
app.addEventListener('contextmenu', (e) => e.preventDefault());

const map = new GameMap();
const world = new World(map, seed);

// M1 测试英雄(通用面板;正式英雄数据 M3 接入)
const dawnFountain = map.buildings.find((b) => b.team === Team.Dawn && b.kind === 'fountain')!;
const hero: Unit = world.spawnUnit({
  kind: 'hero',
  team: Team.Dawn,
  pos: map.nearestWalkable({ x: dawnFountain.pos.x + 400, y: dawnFountain.pos.y - 400 }),
  name: '测试英雄',
  stats: {
    maxHp: 550, hpRegen: 1.2, maxMp: 280, mpRegen: 0.9,
    dmgMin: 48, dmgMax: 56, attackType: 'hero', armorType: 'hero',
    armor: 3, magicResist: 0.25, attackRange: 128, attackPoint: 0.45,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 305, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 200, bountyMax: 200, xpBounty: 100,
  },
});

const camera = new Camera();
camera.centerOn(hero.pos);
const renderer = new Renderer(app, world, camera);

const input = new InputManager(renderer.canvas, camera, {
  onRightClick(p) {
    hero.issueOrder({ type: 'move', pos: map.nearestWalkable(p) });
  },
  onLeftClick(_p) { /* M2:选中逻辑 */ },
  onAttackMove(p) {
    hero.issueOrder({ type: 'attackmove', pos: map.nearestWalkable(p) });
  },
  onCastKey(_i, _p) { /* M3 */ },
  onStop() { hero.issueOrder({ type: 'stop' }); },
  onHold() { hero.issueOrder({ type: 'hold' }); },
  onCenterHero() { camera.centerOn(hero.pos); },
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
    renderer.render(world, hero.id);
    drawDebugOverlay();
  },
});
loop.speed = speed;
loop.start();

// 调试信息
const dbg = document.createElement('div');
dbg.style.cssText = 'position:fixed;top:6px;left:8px;color:#9c8;font:12px monospace;pointer-events:none;text-shadow:0 1px 2px #000';
app.appendChild(dbg);
function drawDebugOverlay() {
  const t = world.time;
  const mm = Math.floor(Math.abs(t) / 60);
  const ss = Math.floor(Math.abs(t) % 60).toString().padStart(2, '0');
  dbg.textContent = `${t < 0 ? '-' : ''}${mm}:${ss} tick=${world.tick} units=${world.units.size} zoom=${camera.zoom.toFixed(2)}`;
}

// 自动化验证钩子
declare global {
  interface Window { __game: { world: World; hero: Unit; camera: Camera; loop: GameLoop } }
}
window.__game = { world, hero, camera, loop };
