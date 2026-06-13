import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { URS, LIF, ARC, SNP, HSK, IO } from '../src/data/heroes/batch18';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ---- URS 怒意 ----
describe('urs 怒意 神杖升级', () => {
  it('神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, URS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('无杖:施放怒意后周围敌人不受伤害', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 400
    const h = ultHero(w, URS, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖不伤敌
  });

  it('有杖:施放怒意震伤周围 400 内敌人', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 距 300 < 400
    const h = ultHero(w, URS, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖震击命中
  });

  it('有杖:400 外的敌人不受震伤', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7500, y: 8000 }); // 距 500 > 400
    const h = ultHero(w, URS, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBe(5000); // 距离过远不受影响
  });
});

// ---- LIF 猛扑寄生 ----
describe('lif 猛扑寄生 神杖升级', () => {
  it('神杖 CD 60→45', () => {
    const w = newWorld();
    const h = ultHero(w, LIF, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(45);
  });

  it('无杖:击晕持续 1.4 秒,0.5 秒时仍眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, LIF, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    // castPoint 0.2s ≈ 6 steps; 再等 10 steps ≈ 0.33s → 总 ~0.53s, 眩晕 1.4s 仍在
    for (let i = 0; i < 16; i++) w.step();
    expect(stateOf(t).stunned).toBe(true);
  });

  it('无杖:眩晕 1.6 秒后消散(1.4s stun)', () => {
    const w = newWorld();
    const h = ultHero(w, LIF, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    // castPoint 0.2s(6步) + 1.6s(48步) = 54 步 → 眩晕 1.4s 已过
    for (let i = 0; i < 54; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });

  it('有杖:击晕延长至 2.2 秒, 1.8 秒时仍眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, LIF, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    // castPoint 0.2s(6步) + 1.8s(54步) = 60 步 → 眩晕 2.2s 仍在
    for (let i = 0; i < 60; i++) w.step();
    expect(stateOf(t).stunned).toBe(true);
  });
});

// ---- ARC 风暴双子 ----
describe('arc 风暴双子 神杖升级', () => {
  it('神杖 CD 60→44', () => {
    const w = newWorld();
    const h = ultHero(w, ARC, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(44);
  });

  it('无杖:施放风暴双子后周围敌人不受伤害', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7400, y: 8000 }); // 距 400 < 450
    const h = ultHero(w, ARC, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 6; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖不伤敌
  });

  it('有杖:施放风暴双子释放静电风暴命中 450 内敌人', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7400, y: 8000 }); // 距 400 < 450
    const h = ultHero(w, ARC, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 6; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 神杖命中
  });

  it('有杖:450 外敌人不受静电风暴', () => {
    const w = newWorld();
    const t = enemyDummy(w, { x: 7600, y: 8000 }); // 距 600 > 450
    const h = ultHero(w, ARC, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 6; i++) w.step();
    expect(t.hp).toBe(5000); // 距离过远不受影响
  });
});

// ---- SNP 飞弹之吻 ----
describe('snp 飞弹之吻 神杖升级', () => {
  it('神杖 CD 60→44', () => {
    const w = newWorld();
    const h = ultHero(w, SNP, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(44);
  });

  it('有杖:轰炸范围扩大至 500,460 处敌人被命中', () => {
    const w = newWorld();
    // 目标在落点 460 处(无杖 350 外,有杖 500 内)
    const target = { x: 7000, y: 8000 };
    const t = enemyDummy(w, { x: 7000, y: 8460 }); // 距落点 460 < 500
    const h = ultHero(w, SNP, { x: 6000, y: 8000 }, true);
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: target });
    // castPoint 0.3s(9步) + 0.4s tick(12步) = ~21 步即触发第一次 tick
    for (let i = 0; i < 30; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 有杖命中
  });

  it('无杖:460 处敌人不被命中', () => {
    const w = newWorld();
    const target = { x: 7000, y: 8000 };
    const t = enemyDummy(w, { x: 7000, y: 8460 }); // 距落点 460 > 350
    const h = ultHero(w, SNP, { x: 6000, y: 8000 });
    h.mp = 1000;
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: target });
    for (let i = 0; i < 30; i++) w.step();
    expect(t.hp).toBe(5000); // 无杖不命中
  });
});

// ---- HSK 生命燃烧 ----
describe('hsk 生命燃烧 神杖升级', () => {
  it('神杖 CD 50→38', () => {
    const w = newWorld();
    const h = ultHero(w, HSK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(50);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(38);
  });

  it('无杖:生命燃烧目标不被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, HSK, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy(); // 无杖不眩晕
  });

  it('有杖:生命燃烧目标被眩晕 1 秒', () => {
    const w = newWorld();
    const h = ultHero(w, HSK, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    // castPoint 0.1s(3步) + 立即眩晕 → 5 步后应仍眩晕
    for (let i = 0; i < 8; i++) w.step();
    expect(stateOf(t).stunned).toBe(true); // 神杖眩晕
  });

  it('有杖:生命燃烧目标 1.2 秒后眩晕消散', () => {
    const w = newWorld();
    const h = ultHero(w, HSK, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7400, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    // castPoint 0.1s(3步) + 1.2s(36步) = 39 步 → 眩晕 1.0s 已过
    for (let i = 0; i < 39; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy(); // 眩晕已消散
  });
});

// ---- IO 转移 ----
describe('io 转移 神杖升级', () => {
  it('神杖 CD 70→50', () => {
    const w = newWorld();
    const h = ultHero(w, IO, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(50);
  });

  it('有杖:转移后施法者获得护盾 buff', () => {
    const w = newWorld();
    const h = ultHero(w, IO, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 9000, y: 8000 } });
    // castPoint 0.4s ≈ 12 步
    for (let i = 0; i < 15; i++) w.step();
    expect(h.modifiers.some((m) => m.key === 'io_relocate_sc_shield')).toBe(true);
  });

  it('无杖:转移后施法者无护盾 buff', () => {
    const w = newWorld();
    const h = ultHero(w, IO, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 9000, y: 8000 } });
    for (let i = 0; i < 15; i++) w.step();
    expect(h.modifiers.some((m) => m.key === 'io_relocate_sc_shield')).toBe(false);
  });

  it('有杖转移后施法者位置变更', () => {
    const w = newWorld();
    const h = ultHero(w, IO, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 9000, y: 8000 } });
    for (let i = 0; i < 20; i++) w.step();
    // 施法后位置应接近目标点
    expect(h.pos.x).toBeGreaterThan(8000);
  });
});
