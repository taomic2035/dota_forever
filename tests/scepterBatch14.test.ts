/** batch14 英雄大招阿哈利姆神杖升级测试(NEC 已有神杖,跳过)。 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { TIN, SBR, SLA, LYC, GEM } from '../src/data/heroes/batch14';
import { abilityDefAt, abilityCooldown } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';

// ============ TIN 巨化狂怒 ============
describe('tin 巨化狂怒:神杖升级', () => {
  it('tin 巨化狂怒:神杖 CD 60→40(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, TIN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(40);
  });

  it('tin 巨化狂怒:无杖持续 20 秒', () => {
    const w = newWorld();
    const h = ultHero(w, TIN, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'tin_rage_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.expiresAt - w.time).toBeGreaterThan(18);
      expect(buff.expiresAt - w.time).toBeLessThanOrEqual(21);
    }
  });

  it('tin 巨化狂怒:有杖持续 30 秒', () => {
    const w = newWorld();
    const h = ultHero(w, TIN, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'tin_rage_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.expiresAt - w.time).toBeGreaterThan(28);
    }
  });

  it('tin 巨化狂怒:有杖溅射半径提升至 500', () => {
    const w = newWorld();
    const h = ultHero(w, TIN, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'tin_rage_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.def.data?.cleaveRadius).toBe(500);
    }
  });

  it('tin 巨化狂怒:无杖溅射半径为 350', () => {
    const w = newWorld();
    const h = ultHero(w, TIN, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'tin_rage_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.def.data?.cleaveRadius).toBe(350);
    }
  });
});

// ============ SBR 星空裂击 ============
describe('sbr 星空裂击:神杖升级', () => {
  it('sbr 星空裂击:神杖 CD 80→55(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, SBR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('sbr 星空裂击:有杖伤害比无杖更高(×1.5)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, SBR, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 15; i++) w0.step();
    const hp0 = t0.hp;

    const w1 = newWorld();
    const h1 = ultHero(w1, SBR, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 15; i++) w1.step();
    const hp1 = t1.hp;

    expect(hp0).toBeLessThan(5000);
    expect(hp1).toBeLessThan(hp0);
  });

  it('sbr 星空裂击:有杖眩晕时间为 2.5 秒(无杖 1.6)', () => {
    // 无杖:眩晕 1.6s(约 48 步),过 60 步后应解除
    const w0 = newWorld();
    const h0 = ultHero(w0, SBR, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 15; i++) w0.step();
    const stunMod0 = t0.modifiers.find((m) => m.key === 'sbr_nether_stun');
    expect(stunMod0).toBeDefined();
    if (stunMod0) {
      expect(stunMod0.expiresAt - w0.time).toBeLessThanOrEqual(1.7);
    }

    // 有杖:眩晕 2.5s
    const w1 = newWorld();
    const h1 = ultHero(w1, SBR, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 15; i++) w1.step();
    const stunMod1 = t1.modifiers.find((m) => m.key === 'sbr_nether_stun');
    expect(stunMod1).toBeDefined();
    if (stunMod1) {
      expect(stunMod1.expiresAt - w1.time).toBeGreaterThan(2.3);
    }
  });

  it('sbr 星空裂击:目标在施法后被眩晕', () => {
    const w = newWorld();
    const h = ultHero(w, SBR, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(stateOf(t).stunned).toBeTruthy();
  });
});

// ============ SLA 暗影之舞 ============
describe('sla 暗影之舞:神杖升级', () => {
  it('sla 暗影之舞:神杖 CD 40→28(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, SLA, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('sla 暗影之舞:无杖持续 4 秒(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, SLA, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'sla_dance_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.expiresAt - w.time).toBeGreaterThan(3);
      expect(buff.expiresAt - w.time).toBeLessThanOrEqual(5);
    }
  });

  it('sla 暗影之舞:有杖持续 7 秒(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, SLA, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'sla_dance_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.expiresAt - w.time).toBeGreaterThan(6);
    }
  });

  it('sla 暗影之舞:施法后处于隐身状态', () => {
    const w = newWorld();
    const h = ultHero(w, SLA, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    expect(stateOf(h).invisible).toBeTruthy();
  });
});

// ============ LYC 变形 ============
describe('lyc 变形:神杖升级', () => {
  it('lyc 变形:神杖 CD 80→55(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, LYC, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(55);
  });

  it('lyc 变形:无杖持续 12 秒(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, LYC, { x: 7000, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'lyc_shift_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.expiresAt - w.time).toBeGreaterThan(10);
      expect(buff.expiresAt - w.time).toBeLessThanOrEqual(13);
    }
  });

  it('lyc 变形:有杖持续 20 秒(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, LYC, { x: 7000, y: 8000 }, true);
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w.step();
    const buff = h.modifiers.find((m) => m.key === 'lyc_shift_buff');
    expect(buff).toBeDefined();
    if (buff) {
      expect(buff.expiresAt - w.time).toBeGreaterThan(18);
    }
  });

  it('lyc 变形:有杖暴击倍率比无杖高 0.5(等级1)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, LYC, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w0.step();
    const buff0 = h0.modifiers.find((m) => m.key === 'lyc_shift_buff');
    const crit0 = buff0?.def.stats?.critMultiplier ?? 0;

    const w1 = newWorld();
    const h1 = ultHero(w1, LYC, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 5; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'lyc_shift_buff');
    const crit1 = buff1?.def.stats?.critMultiplier ?? 0;

    expect(crit1 - crit0).toBeCloseTo(0.5, 5);
  });
});

// ============ GEM 怒石迸发 ============
describe('gem 怒石迸发:神杖升级', () => {
  it('gem 怒石迸发:神杖 CD 90→65(等级1)', () => {
    const w = newWorld();
    const h = ultHero(w, GEM, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(65);
  });

  it('gem 怒石迸发:有杖对目标造成更多伤害', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, GEM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7200, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 40; i++) w0.step();
    const hp0 = t0.hp;

    const w1 = newWorld();
    const h1 = ultHero(w1, GEM, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7200, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 40; i++) w1.step();
    const hp1 = t1.hp;

    expect(hp0).toBeLessThan(5000);
    expect(hp1).toBeLessThan(hp0);
  });

  it('gem 怒石迸发:有杖命中半径 550 处的目标(无杖不命中)', () => {
    // 无杖半径 450,目标在 550 处不被命中
    const w0 = newWorld();
    const h0 = ultHero(w0, GEM, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7550, y: 8000 }); // 距施法点 550 > 450
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 40; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖不命中

    // 有杖半径 600,同位置目标被命中
    const w1 = newWorld();
    const h1 = ultHero(w1, GEM, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7550, y: 8000 }); // 距施法点 550 < 600
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 40; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖命中
  });

  it('gem 怒石迸发:目标未被眩晕(仅减速)', () => {
    const w = newWorld();
    const h = ultHero(w, GEM, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7200, y: 8000 } });
    for (let i = 0; i < 20; i++) w.step();
    expect(stateOf(t).stunned).toBeFalsy();
  });
});
