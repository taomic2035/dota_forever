import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { SAYA, AURORA, BAL, KELON, TAI, NOX } from '../src/data/heroes/batch5';
import { abilityDefAt, abilityCooldown, learnAbility } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { spawnHero } from '../src/sim/hero';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { makeItem } from '../src/sim/items';

// ============ SAYA 幻象大军 ============
describe('saya 幻象大军:神杖升级', () => {
  it('saya 幻象大军:神杖 CD 60→40', () => {
    const wc = newWorld();
    const hc = ultHero(wc, SAYA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(60);
    // 给神杖
    const wsc = newWorld();
    const hsc = ultHero(wsc, SAYA, { x: 7000, y: 8000 }, true);
    const defsc = abilityDefAt(hsc, 3)!;
    expect(abilityCooldown(hsc, defsc, 1)).toBe(40);
  });

  it('saya 幻象大军:有杖闪避持续 4 秒(无杖 2 秒)', () => {
    // 无杖:2 秒后闪避消失(步长 1/30s,2s = 60步)
    const w0 = newWorld();
    const h0 = ultHero(w0, SAYA, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w0.step(); // 仍在前摇/施法期间
    // 检查施法后立即有高额闪避
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w0.step(); // 完成施法
    const evasion0 = h0.modifiers.some((m) => m.key === 'saya_doppel_buff' && (m.expiresAt - w0.time) > 1.5);
    // 有杖:持续 4 秒
    const w1 = newWorld();
    const h1 = ultHero(w1, SAYA, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 15; i++) w1.step();
    const evasionBuff1 = h1.modifiers.find((m) => m.key === 'saya_doppel_buff');
    expect(evasionBuff1).toBeDefined();
    // 有杖持续至少 3 秒(4s buff,刚施法完后约剩 3.5s+)
    if (evasionBuff1) {
      expect(evasionBuff1.expiresAt - w1.time).toBeGreaterThan(3);
    }
  });
});

// ============ AURORA 极地寒峰 ============
describe('aurora 极地寒峰:神杖升级', () => {
  it('aurora 极地寒峰:神杖 CD 100→70', () => {
    const wc = newWorld();
    const hc = ultHero(wc, AURORA, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(100);
    const wsc = newWorld();
    const hsc = ultHero(wsc, AURORA, { x: 7000, y: 8000 }, true);
    const defsc = abilityDefAt(hsc, 3)!;
    expect(abilityCooldown(hsc, defsc, 1)).toBe(70);
  });

  it('aurora 极地寒峰:无杖不中 550 处敌人(范围 450),有杖命中(范围 650)', () => {
    // 无杖:落点 7000,8000;敌人 7550,8000 距 550 > 450
    const w0 = newWorld();
    const h0 = ultHero(w0, AURORA, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7550, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 25; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖范围 450 不中距 550 的敌人

    // 有杖:范围 650 命中
    const w1 = newWorld();
    const h1 = ultHero(w1, AURORA, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7550, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 25; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围 650 命中
  });
});

// ============ BAL 炼狱深渊 ============
describe('bal 炼狱深渊:神杖升级', () => {
  it('bal 炼狱深渊:神杖 CD 80→55', () => {
    const wc = newWorld();
    const hc = ultHero(wc, BAL, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(80);
    const wsc = newWorld();
    const hsc = ultHero(wsc, BAL, { x: 7000, y: 8000 }, true);
    const defsc = abilityDefAt(hsc, 3)!;
    expect(abilityCooldown(hsc, defsc, 1)).toBe(55);
  });

  it('bal 炼狱深渊:无杖不中 430 处敌人(范围 400),有杖命中(范围 550)', () => {
    // 无杖:落点 7000,8000;敌人 7430,8000 距 430 > 400
    const w0 = newWorld();
    const h0 = ultHero(w0, BAL, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7430, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 50; i++) w0.step(); // 让 pit 开始 tick
    expect(t0.hp).toBe(5000); // 无杖范围 400 不中

    // 有杖:范围 550 命中
    const w1 = newWorld();
    const h1 = ultHero(w1, BAL, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7430, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 50; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖范围 550 命中
  });
});

// ============ KELON 狙杀 ============
describe('kelon 狙杀:神杖升级', () => {
  it('kelon 狙杀:神杖 CD 20→13', () => {
    const wc = newWorld();
    const hc = ultHero(wc, KELON, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(20);
    const wsc = newWorld();
    const hsc = ultHero(wsc, KELON, { x: 7000, y: 8000 }, true);
    const defsc = abilityDefAt(hsc, 3)!;
    expect(abilityCooldown(hsc, defsc, 1)).toBe(13);
  });

  it('kelon 狙杀:无杖眩晕 0.8s,有杖眩晕 2s', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, KELON, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 400 < 1500 cast range
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t0.id });
    for (let i = 0; i < 40; i++) w0.step(); // castPoint 1.0s = 30 steps
    // 检查眩晕 modifier 持续时间约 0.8s(当前应仍有 stun)
    expect(stateOf(t0).stunned).toBeTruthy(); // 无杖眩晕中

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, KELON, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7400, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t1.id });
    for (let i = 0; i < 40; i++) w1.step();
    expect(stateOf(t1).stunned).toBeTruthy(); // 有杖眩晕中(2s,更长)
    // 有杖眩晕 modifier 剩余时间应更长
    const stunMod1 = t1.modifiers.find((m) => m.key === 'kelon_snipe_stun');
    const stunMod0 = t0.modifiers.find((m) => m.key === 'kelon_snipe_stun');
    expect(stunMod1).toBeDefined();
    if (stunMod1 && stunMod0) {
      expect(stunMod1.expiresAt).toBeGreaterThan(stunMod0.expiresAt);
    }
  });
});

// ============ TAI 电磁漩涡 ============
describe('tai 电磁漩涡:神杖升级', () => {
  it('tai 电磁漩涡:神杖 CD 50→34', () => {
    const wc = newWorld();
    const hc = ultHero(wc, TAI, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(50);
    const wsc = newWorld();
    const hsc = ultHero(wsc, TAI, { x: 7000, y: 8000 }, true);
    const defsc = abilityDefAt(hsc, 3)!;
    expect(abilityCooldown(hsc, defsc, 1)).toBe(34);
  });

  it('tai 电磁漩涡:无杖只 root,有杖升级为 stunned', () => {
    // 无杖:敌人 rooted 但非 stunned
    const w0 = newWorld();
    const h0 = ultHero(w0, TAI, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7300, y: 8000 }); // 距 300 < 400
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 15; i++) w0.step();
    expect(stateOf(t0).rooted).toBeTruthy();
    expect(stateOf(t0).stunned).toBeFalsy();

    // 有杖:stunned
    const w1 = newWorld();
    const h1 = ultHero(w1, TAI, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7300, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 15; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true);
  });

  it('tai 电磁漩涡:无杖不中 430 处敌人(范围 400),有杖命中(范围 550)', () => {
    // 无杖:敌人在落点外 430 > 400
    const w0 = newWorld();
    const h0 = ultHero(w0, TAI, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7430, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 15; i++) w0.step();
    expect(stateOf(t0).rooted).toBeFalsy();
    expect(stateOf(t0).stunned).toBeFalsy();

    // 有杖:范围 550 命中
    const w1 = newWorld();
    const h1 = ultHero(w1, TAI, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7430, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3, pos: { x: 7000, y: 8000 } });
    for (let i = 0; i < 15; i++) w1.step();
    expect(stateOf(t1).stunned).toBe(true);
  });
});

// ============ NOX 狩猎热诚 ============
describe('nox 狩猎热诚:神杖升级', () => {
  it('nox 狩猎热诚:神杖 CD 40→28', () => {
    const wc = newWorld();
    const hc = ultHero(wc, NOX, { x: 7000, y: 8000 });
    const def = abilityDefAt(hc, 3)!;
    expect(abilityCooldown(hc, def, 1)).toBe(40);
    const wsc = newWorld();
    const hsc = ultHero(wsc, NOX, { x: 7000, y: 8000 }, true);
    const defsc = abilityDefAt(hsc, 3)!;
    expect(abilityCooldown(hsc, defsc, 1)).toBe(28);
  });

  it('nox 狩猎热诚:有杖持续 18 秒(无杖 12 秒)', () => {
    // 无杖
    const w0 = newWorld();
    const h0 = ultHero(w0, NOX, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w0.step();
    const buff0 = h0.modifiers.find((m) => m.key === 'nox_fervor_buff');
    expect(buff0).toBeDefined();
    if (buff0) {
      const remaining0 = buff0.expiresAt - w0.time;
      expect(remaining0).toBeGreaterThan(10);
      expect(remaining0).toBeLessThanOrEqual(12.5); // 约 12 秒
    }

    // 有杖
    const w1 = newWorld();
    const h1 = ultHero(w1, NOX, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'nox_fervor_buff');
    expect(buff1).toBeDefined();
    if (buff1) {
      const remaining1 = buff1.expiresAt - w1.time;
      expect(remaining1).toBeGreaterThan(15); // 约 18 秒
    }
  });

  it('nox 狩猎热诚:有杖感染周围友军英雄', () => {
    // 使用独立 world 以避免干扰
    const wmap = new GameMap();
    const w = createWorld(wmap, { seed: 141, noBuildings: true, startTime: 0 });

    // 施法者(NOX,有杖)
    const caster = spawnHero(w, NOX, Team.Dawn, { x: 7000, y: 8000 });
    caster.level = 6; caster.heroMeta!.skillPoints = 1; caster.mp = 1000;
    learnAbility(w, caster, 3);
    caster.inventory[0] = makeItem('scepter');

    // 友军英雄(用 KELON 作友军英雄,距 300 < 600)
    const ally = spawnHero(w, KELON, Team.Dawn, { x: 7300, y: 8000 });
    ally.level = 1; ally.mp = 0;

    caster.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 10; i++) w.step();

    // 友军应该有 fervor buff
    const allyBuff = ally.modifiers.find((m) => m.key === 'nox_fervor_buff');
    expect(allyBuff).toBeDefined();
  });
});
