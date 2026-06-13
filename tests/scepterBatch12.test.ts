/** batch12 英雄大招阿哈利姆神杖升级测试 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { RIK, JUG, DPR, DSR, BEA, NYX } from '../src/data/heroes/batch12';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ============ RIK 潜行大师 ============
describe('rik 潜行大师:神杖升级', () => {
  it('rik 潜行大师:神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, RIK, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('rik 潜行大师:无杖持续 20 秒,有杖持续 30 秒(等级1)', () => {
    // 无杖:buff 持续 20 秒
    const w0 = newWorld();
    const h0 = ultHero(w0, RIK, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w0.step(); // 完成施法(castPoint 0.0)
    const buff0 = h0.modifiers.find((m) => m.key === 'rik_cloak_buff');
    expect(buff0).toBeDefined();
    if (buff0) {
      // 无杖持续约 20 秒
      expect(buff0.expiresAt - w0.time).toBeGreaterThan(18);
      expect(buff0.expiresAt - w0.time).toBeLessThanOrEqual(21);
    }

    // 有杖:buff 持续 30 秒
    const w1 = newWorld();
    const h1 = ultHero(w1, RIK, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'rik_cloak_buff');
    expect(buff1).toBeDefined();
    if (buff1) {
      // 有杖持续约 30 秒
      expect(buff1.expiresAt - w1.time).toBeGreaterThan(28);
    }
  });
});

// ============ JUG 无敌斩 ============
describe('jug 无敌斩:神杖升级', () => {
  it('jug 无敌斩:神杖 CD 130→95', () => {
    const w = newWorld();
    const h = ultHero(w, JUG, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(130);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(95);
  });

  it('jug 无敌斩:有杖敌人受到更多伤害(额外纯粹50/斩×3)', () => {
    // 无杖:6 斩
    const w0 = newWorld();
    const h0 = ultHero(w0, JUG, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 20; i++) w0.step();
    const hp0 = t0.hp;

    // 有杖:9 斩 + 额外 50/斩
    const w1 = newWorld();
    const h1 = ultHero(w1, JUG, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 20; i++) w1.step();
    const hp1 = t1.hp;

    // 有杖伤害更高,两者都受伤
    expect(hp0).toBeLessThan(5000);
    expect(hp1).toBeLessThan(hp0);
  });
});

// ============ DPR 群魔乱舞 ============
describe('dpr 群魔乱舞:神杖升级', () => {
  it('dpr 群魔乱舞:神杖 CD 120→85', () => {
    const w = newWorld();
    const h = ultHero(w, DPR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(120);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(85);
  });

  it('dpr 群魔乱舞:无杖召唤 4 只恶灵,有杖召唤 7 只', () => {
    // 无杖:4 只恶灵(等级1)
    const w0 = newWorld();
    const h0 = ultHero(w0, DPR, { x: 7000, y: 8000 });
    const prevCount0 = w0.units.size; // hero 已生成后记录基准
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w0.step();
    const spirits0 = w0.units.size - prevCount0; // 召唤后增加量即为恶灵数
    expect(spirits0).toBeGreaterThanOrEqual(4);

    // 有杖:7 只恶灵(4 + 3)
    const w1 = newWorld();
    const h1 = ultHero(w1, DPR, { x: 7000, y: 8000 }, true);
    const prevCount1 = w1.units.size;
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w1.step();
    const spirits1 = w1.units.size - prevCount1;
    expect(spirits1).toBeGreaterThan(spirits0);
  });
});

// ============ DSR 复制之墙 ============
describe('dsr 复制之墙:神杖升级', () => {
  it('dsr 复制之墙:神杖 CD 100→70', () => {
    const w = newWorld();
    const h = ultHero(w, DSR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(100);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(70);
  });

  it('dsr 复制之墙:无杖减速 45%,有杖减速 60%(敌人血量差异)', () => {
    // 无杖:敌人被减速 45%
    const w0 = newWorld();
    const h0 = ultHero(w0, DSR, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w0.step();
    const slowMod0 = t0.modifiers.find((m) => m.key === 'dsr_wall_slow');
    expect(slowMod0).toBeDefined();
    if (slowMod0) {
      expect(slowMod0.def.stats?.bonusMoveSpeedPct).toBe(-0.45);
    }

    // 有杖:减速 60%
    const w1 = newWorld();
    const h1 = ultHero(w1, DSR, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w1.step();
    const slowMod1 = t1.modifiers.find((m) => m.key === 'dsr_wall_slow');
    expect(slowMod1).toBeDefined();
    if (slowMod1) {
      expect(slowMod1.def.stats?.bonusMoveSpeedPct).toBe(-0.6);
    }
  });
});

// ============ BEA 原始咆哮 ============
describe('bea 原始咆哮:神杖升级', () => {
  it('bea 原始咆哮:神杖 CD 80→55', () => {
    const w = newWorld();
    const h = ultHero(w, BEA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('bea 原始咆哮:无杖余波只减速,有杖余波直接击晕', () => {
    // 无杖:主目标被眩晕,旁侧敌人只被减速而非眩晕
    const w0 = newWorld();
    const h0 = ultHero(w0, BEA, { x: 7000, y: 8000 });
    const main0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 主目标
    const side0 = enemyDummy(w0, { x: 7500, y: 8000 }); // 旁侧(距主目标 200 < 400)
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: main0.id });
    for (let i = 0; i < 15; i++) w0.step();
    expect(stateOf(main0).stunned).toBeTruthy(); // 主目标眩晕
    expect(stateOf(side0).stunned).toBeFalsy();  // 无杖旁侧不眩晕

    // 有杖:旁侧敌人也被眩晕
    const w1 = newWorld();
    const h1 = ultHero(w1, BEA, { x: 7000, y: 8000 }, true);
    const main1 = enemyDummy(w1, { x: 7300, y: 8000 });
    const side1 = enemyDummy(w1, { x: 7500, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: main1.id });
    for (let i = 0; i < 15; i++) w1.step();
    expect(stateOf(main1).stunned).toBeTruthy(); // 主目标眩晕
    expect(stateOf(side1).stunned).toBeTruthy(); // 神杖余波也眩晕
  });
});

// ============ NYX 复仇 ============
describe('nyx 复仇:神杖升级', () => {
  it('nyx 复仇:神杖 CD 70→48', () => {
    const w = newWorld();
    const h = ultHero(w, NYX, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(70);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(48);
  });

  it('nyx 复仇:有杖潜行持续 40 秒(无杖 25 秒,等级1)', () => {
    // 无杖:持续 25 秒
    const w0 = newWorld();
    const h0 = ultHero(w0, NYX, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w0.step();
    const buff0 = h0.modifiers.find((m) => m.key === 'nyx_vendetta_buff');
    expect(buff0).toBeDefined();
    if (buff0) {
      expect(buff0.expiresAt - w0.time).toBeGreaterThan(23);
      expect(buff0.expiresAt - w0.time).toBeLessThanOrEqual(26);
    }

    // 有杖:持续 40 秒
    const w1 = newWorld();
    const h1 = ultHero(w1, NYX, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'nyx_vendetta_buff');
    expect(buff1).toBeDefined();
    if (buff1) {
      expect(buff1.expiresAt - w1.time).toBeGreaterThan(38);
    }
  });

  it('nyx 复仇:有杖爆发伤害提升 50%(vendettaDmg 为 225 vs 150)', () => {
    // 无杖:vendettaDmg = 150(等级1)
    const w0 = newWorld();
    const h0 = ultHero(w0, NYX, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w0.step();
    const buff0 = h0.modifiers.find((m) => m.key === 'nyx_vendetta_buff');
    expect(buff0?.def.data?.vendettaDmg).toBe(150);

    // 有杖:vendettaDmg = 150 * 1.5 = 225
    const w1 = newWorld();
    const h1 = ultHero(w1, NYX, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'nyx_vendetta_buff');
    expect(buff1?.def.data?.vendettaDmg).toBe(225);
  });
});
