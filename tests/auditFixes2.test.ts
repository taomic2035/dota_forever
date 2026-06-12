import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyModifier } from '../src/sim/modifiers';
import { isVisibleTo } from '../src/sim/vision';
import { HEROES } from '../src/data/heroes';
import { BAN } from '../src/data/heroes/batch11';
import { TOWER_TRUE_SIGHT } from '../src/data/balance';

// 三轮审计 Wave1:塔真视(V2/B1)+ 沉默中断引导(A1)。
describe('防御塔真视(V2/B1)', () => {
  it('塔重算后 calc.trueSight = TOWER_TRUE_SIGHT', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    w.step();
    const tower = [...w.units.values()].find((u) => u.kind === 'tower');
    expect(tower).toBeTruthy();
    expect(tower!.calc.trueSight).toBe(TOWER_TRUE_SIGHT);
  });

  it('塔揭示塔下隐身敌人', () => {
    const w = createWorld(new GameMap(), { seed: 1 });
    w.step();
    const tower = [...w.units.values()].find((u) => u.kind === 'tower' && u.team === Team.Dawn)!;
    const enemy = spawnHero(w, HEROES[0], Team.Night, { x: tower.pos.x + 200, y: tower.pos.y });
    applyModifier(w, enemy, { key: 'invis_t', duration: 99, isBuff: true, states: { invisible: true } }, enemy.id);
    for (let i = 0; i < 60; i++) w.step(); // 视野/真视按间隔重算,步足够帧
    expect(isVisibleTo(w, Team.Dawn, enemy)).toBe(true); // 被塔真视揭示(此前隐身于塔下无敌)
  });
});

describe('沉默中断引导(A1)', () => {
  it('引导中被沉默立即中断', () => {
    const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
    const bane = spawnHero(w, BAN, Team.Dawn, { x: 7000, y: 8000 });
    bane.level = 6; bane.heroMeta!.skillPoints = 1; bane.mp = 400;
    learnAbility(w, bane, 3); // 末日缠绕(引导大招)
    const target = spawnHero(w, HEROES[0], Team.Night, { x: 7300, y: 8000 });
    bane.issueOrder({ type: 'cast', abilityIndex: 3, targetId: target.id });
    let channeling = false;
    for (let i = 0; i < 25 && !channeling; i++) { w.step(); channeling = !!bane.channeling; }
    expect(channeling).toBe(true); // 已进入引导
    applyModifier(w, bane, { key: 'sil_t', duration: 5, states: { silenced: true } }, bane.id);
    w.step();
    expect(bane.channeling).toBeNull(); // 沉默中断
  });
});
