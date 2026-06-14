import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyDamage } from '../src/sim/combat';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 550, hpRegen: 0, maxMp: 100, mpRegen: 0,
    dmgMin: 40, dmgMax: 40, attackType: 'hero', armorType: 'hero',
    armor: 2, magicResist: 0.25, attackRange: 500, attackPoint: 0.4,
    bat: 1.7, projectileSpeed: 900, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 600,
    bountyMin: 100, bountyMax: 100, xpBounty: 50,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 5 });
});

function unitsBy(pred: (u: Unit) => boolean): Unit[] {
  return [...w.units.values()].filter(pred);
}

describe('buildings', () => {
  it('spawns full symmetric building set', () => {
    const dawn = unitsBy((u) => u.team === Team.Dawn && u.isBuilding());
    const night = unitsBy((u) => u.team === Team.Night && u.isBuilding());
    expect(dawn.length).toBe(night.length);
    expect(dawn.length).toBe(19); // 11塔+6营+主基地+圣坛
  });

  it('ancient invulnerable until both T4 towers fall', () => {
    const ancient = unitsBy((u) => u.team === Team.Night && u.buildingKind === 'ancient')[0];
    expect(applyDamage(w, ancient, { source: 0, attackType: 'hero', amount: 100 })).toBe(0);
    const t4s = unitsBy((u) => u.team === Team.Night && u.buildingKind === 'tower4');
    expect(t4s.length).toBe(2);
    for (const t of t4s) applyDamage(w, t, { source: 0, attackType: 'hero', amount: 1e6, flags: { pure: true } });
    for (let i = 0; i < 20; i++) w.step(); // 周期刷新保护状态
    expect(ancient.invulnerable).toBe(false);
    expect(applyDamage(w, ancient, { source: 0, attackType: 'hero', amount: 100 })).toBeGreaterThan(0);
  });

  it('tower prefers creeps but defends allied hero under attack', () => {
    const tower = unitsBy((u) => u.team === Team.Dawn && u.buildingKind === 'tower1' && u.lane === 'mid')[0];
    // 敌方小兵在塔射程内
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: tower.pos.x + 400, y: tower.pos.y }, name: 'c', stats: stats({ dmgMin: 0, dmgMax: 0, maxHp: 5000, projectileSpeed: 0, attackRange: 100 }) });
    // 双方英雄也在塔附近
    const ally = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: tower.pos.x + 200, y: tower.pos.y + 100 }, name: 'a', stats: stats({ maxHp: 5000 }) });
    // 敌英雄先放在自动仇恨范围之外(沿中路走廊,保证可走)
    const enemy = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: map.nearestWalkable({ x: tower.pos.x + 800, y: tower.pos.y - 800 }), name: 'e', stats: stats({ maxHp: 5000, dmgMin: 1, dmgMax: 1 }) });
    ally.issueOrder({ type: 'hold' });
    // 先让塔锁定小兵
    for (let i = 0; i < 15; i++) w.step();
    expect(tower.attackTargetId).toBe(creep.id);
    // 敌英雄攻击塔下友方英雄 → 塔转火
    enemy.issueOrder({ type: 'attack', targetId: ally.id });
    let switched = false;
    for (let i = 0; i < 120 && !switched; i++) {
      w.step();
      if (tower.attackTargetId === enemy.id) switched = true;
    }
    expect(switched).toBe(true);
  });

  it('fountain heals allied units in radius', () => {
    const fountain = unitsBy((u) => u.team === Team.Dawn && u.buildingKind === 'fountain')[0];
    const hero = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: fountain.pos.x + 300, y: fountain.pos.y - 300 }, name: 'h', stats: stats({ maxHp: 1000, maxMp: 400 }) });
    hero.hp = 100; hero.mp = 0;
    for (let i = 0; i < 90; i++) w.step(); // 3 秒
    expect(hero.hp).toBeGreaterThan(200); // ≥ +4%/s × 3s = +120
    expect(hero.mp).toBeGreaterThan(60);
  });

  it('fountain shreds enemy hero', () => {
    const fountain = unitsBy((u) => u.team === Team.Dawn && u.buildingKind === 'fountain')[0];
    const enemy = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: fountain.pos.x + 500, y: fountain.pos.y - 500 }, name: 'e', stats: stats({ maxHp: 1500 }) });
    for (let i = 0; i < 300 && enemy.alive; i++) w.step();
    expect(enemy.alive).toBe(false);
  });

  it('后门保护:无攻方小兵在侧时 T3 受击减伤,有兵在侧则全额', () => {
    const t3 = unitsBy((u) => u.team === Team.Dawn && u.buildingKind === 'tower3')[0];
    for (let i = 0; i < 12; i++) w.step(); // 无敌方小兵 → 进入后门保护
    expect(t3.backdoorProtected).toBe(true);
    const dealtProtected = applyDamage(w, t3, { source: 0, attackType: 'hero', amount: 100 });
    // 放敌方(夜魇)小兵在塔旁 → 解除保护
    w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: t3.pos.x + 120, y: t3.pos.y }, name: 'c', stats: stats({ maxHp: 800, dmgMin: 0, dmgMax: 0 }) });
    for (let i = 0; i < 12; i++) w.step();
    expect(t3.backdoorProtected).toBe(false);
    const dealtOpen = applyDamage(w, t3, { source: 0, attackType: 'hero', amount: 100 });
    expect(dealtOpen).toBeGreaterThan(dealtProtected); // 有兵在侧伤害更高(无后门减伤)
  });

  it('后门保护不及 T1(可被后门拆)', () => {
    const t1 = unitsBy((u) => u.team === Team.Dawn && u.buildingKind === 'tower1')[0];
    for (let i = 0; i < 12; i++) w.step();
    expect(t1.backdoorProtected).toBe(false); // T1 永不享后门保护
  });

  it('塔伤连击递增 + 对英雄 0.5×(经典 DotA1:久留塔下伤害递增)', () => {
    const tower = unitsBy((u) => u.team === Team.Dawn && u.buildingKind === 'tower1' && u.lane === 'mid')[0];
    tower.base.dmgMin = tower.base.dmgMax = 110; // 固定塔伤,便于测净递增(fold 从 base 起算)
    // 敌方英雄站塔射程内:无甲(测净伤)、高血不死、不动不还手
    const enemy = w.spawnUnit({
      kind: 'hero', team: Team.Night, pos: map.nearestWalkable({ x: tower.pos.x + 300, y: tower.pos.y }),
      name: 'e', stats: stats({ maxHp: 50000, armor: 0, dmgMin: 0, dmgMax: 0, moveSpeed: 0 }),
    });
    enemy.hp = enemy.calc.maxHp;
    const hits: number[] = [];
    let prevHp = enemy.hp;
    for (let i = 0; i < 30 * 12 && hits.length < 5; i++) {
      w.step();
      if (enemy.hp < prevHp - 0.01) { hits.push(prevHp - enemy.hp); prevHp = enemy.hp; }
    }
    expect(hits.length).toBeGreaterThanOrEqual(4);
    // 连击递增:非降序(封顶 ×1.5 后 plateau,且偶发 miss 不致回落)
    for (let i = 1; i < hits.length; i++) expect(hits[i]).toBeGreaterThanOrEqual(hits[i - 1] - 0.01);
    // 确有递增发生(首两击差 ≈ +20% 步进 ≈ +11)
    expect(hits[1]).toBeGreaterThan(hits[0]);
    expect(hits[1] - hits[0]).toBeGreaterThan(8);
    // 对英雄 0.5× 起:首击(streak0)≈ 110×0.5=55;若仍为 normal 0.75 则 ≈82.5。<70 区分二者
    expect(Math.min(...hits)).toBeLessThan(70);
    // 封顶:对英雄最高 0.5×1.5=0.75 → ≈82.5,不应超(无界递增才会更高)
    expect(Math.max(...hits)).toBeLessThan(90);
  });
});
