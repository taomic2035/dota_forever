/** batch15 英雄大招阿哈利姆神杖升级测试 */
import { describe, it, expect } from 'vitest';
import { ultHero, enemyDummy, newWorld } from './scepterTestUtil';
import { RUB, PHX, PAN, TUS, KPR, TRN } from '../src/data/heroes/batch15';
import { abilityDefAt, abilityCooldown, learnAbility } from '../src/sim/abilities';
import { stateOf } from '../src/sim/combat';
import { makeItem } from '../src/sim/items';
import { spawnHero } from '../src/sim/hero';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { applyModifier } from '../src/sim/modifiers';

// ============ RUB 奥术汲取(channel) ============
describe('rub 奥术汲取 神杖升级', () => {
  it('rub 奥术汲取:神杖 CD 90→60', () => {
    const w = newWorld();
    const h = ultHero(w, RUB, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(90);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(60);
  });

  it('rub 奥术汲取:无杖 tick 不附加 manaburn 效果', () => {
    const w = newWorld();
    const h = ultHero(w, RUB, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    // 等 castPoint(0.3s=9步) + 第一次 channel tick(0.5s=15步) 共 ~35步
    for (let i = 0; i < 35; i++) w.step();
    // 无杖:目标不应有 manaburn modifier
    const manaburn = t.modifiers.find((m) => m.key === 'rub_drain_manaburn');
    expect(manaburn).toBeUndefined();
  });

  it('rub 奥术汲取:有杖 tick 附加 manaburn 效果', () => {
    const w = newWorld();
    const h = ultHero(w, RUB, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7200, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t.id });
    for (let i = 0; i < 35; i++) w.step();
    // 有杖:目标应有 manaburn modifier(短时间,可能刚过期,检查过程中被命中)
    // 验证引导确实命中目标:目标 hp 降低
    expect(t.hp).toBeLessThan(5000);
    // 有杖还应减缓目标 mp 回复:验证 manaburn 在 channel 期间确实出现过
    // (直接检查在引导期短步后是否有 modifier 更可靠)
    const w2 = newWorld();
    const h2 = ultHero(w2, RUB, { x: 7000, y: 8000 }, true);
    const t2 = enemyDummy(w2, { x: 7200, y: 8000 });
    h2.issueOrder({ type: 'cast', abilityIndex: 3, targetId: t2.id });
    // 精确等到第一 tick(castPoint 9步 + tickInterval=0.5s=15步 = 24步)
    for (let i = 0; i < 25; i++) w2.step();
    const manaburn = t2.modifiers.find((m) => m.key === 'rub_drain_manaburn');
    expect(manaburn).toBeDefined();
  });
});

// ============ PHX 超新星 ============
describe('phx 超新星 神杖升级', () => {
  it('phx 超新星:神杖 CD 110→80', () => {
    const w = newWorld();
    const h = ultHero(w, PHX, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(110);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(80);
  });

  it('phx 超新星:无杖爆炸不命中 800 外(> 700 半径)的敌人', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, PHX, { x: 7000, y: 8000 });
    // 敌人在 800 距离,超出无杖 700 半径
    const t0 = enemyDummy(w0, { x: 7800, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    // castPoint 0.2s=6步 + egg 4s=120步 + buffer = 140步
    for (let i = 0; i < 140; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖 700 范围内未命中
  });

  it('phx 超新星:有杖爆炸命中 800(< 950 半径)的敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, PHX, { x: 7000, y: 8000 }, true);
    // 敌人在 800 距离,在神杖 950 半径内
    const t1 = enemyDummy(w1, { x: 7800, y: 8000 });
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 140; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖 950 范围命中
  });

  it('phx 超新星:被击中的敌人被眩晕(无杖),检查爆炸瞬间', () => {
    const w = newWorld();
    const h = ultHero(w, PHX, { x: 7000, y: 8000 });
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 300 < 700
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    // castPoint 0.2s ≈ 7步 + egg 4s = 120步 + buffer → 135步即可看到爆炸
    for (let i = 0; i < 135; i++) w.step();
    expect(t.hp).toBeLessThan(5000); // 被爆炸命中
    expect(stateOf(t).stunned).toBe(true); // 爆炸后 1.4s 内眩晕(还剩约 42-8 = 34步)
  });
});

// ============ PAN 滚滚妙妙 ============
describe('pan 滚滚妙妙 神杖升级', () => {
  it('pan 滚滚妙妙:神杖 CD 60→42', () => {
    const w = newWorld();
    const h = ultHero(w, PAN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(42);
  });

  it('pan 滚滚妙妙:无杖 buff 时 310 处的目标不受第一 tick 伤害(hero rooted)', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, PAN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7310, y: 8000 }); // 距 310 > 250
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    // 让施法完成(castPoint 0.2s = 6步,取7步保险)
    for (let i = 0; i < 7; i++) w0.step();
    // 施法完成后 root 住英雄防止移动
    applyModifier(w0, h0, { key: 'test_root', duration: 10, states: { rooted: true } }, h0.id);
    // 等第一 tick(0.3s = 9步)
    for (let i = 0; i < 12; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖 250 半径不覆盖 310 距离
  });

  it('pan 滚滚妙妙:有杖 310(< 375 半径)的敌人在 buff 期间受伤(hero rooted)', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, PAN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7310, y: 8000 }); // 距 310 < 375
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 7; i++) w1.step();
    applyModifier(w1, h1, { key: 'test_root', duration: 10, states: { rooted: true } }, h1.id);
    for (let i = 0; i < 12; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖 375 半径命中
  });

  it('pan 滚滚妙妙:有杖 buff 持续时间更长(神杖+1秒)', () => {
    // 无杖:3秒 = 90步
    const w0 = newWorld();
    const h0 = ultHero(w0, PAN, { x: 7000, y: 8000 });
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 8; i++) w0.step(); // 等施法完成
    const buff0 = h0.modifiers.find((m) => m.key === 'pan_roll_buff');
    expect(buff0).toBeDefined();
    const dur0 = buff0 ? buff0.expiresAt - w0.time : 0;

    // 有杖:4秒 = 120步
    const w1 = newWorld();
    const h1 = ultHero(w1, PAN, { x: 7000, y: 8000 }, true);
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    for (let i = 0; i < 8; i++) w1.step();
    const buff1 = h1.modifiers.find((m) => m.key === 'pan_roll_buff');
    expect(buff1).toBeDefined();
    const dur1 = buff1 ? buff1.expiresAt - w1.time : 0;

    expect(dur1).toBeGreaterThan(dur0);
  });
});

// ============ TUS 海象神拳 ============
describe('tus 海象神拳 神杖升级', () => {
  it('tus 海象神拳:神杖 CD 40→28', () => {
    const w = newWorld();
    const h = ultHero(w, TUS, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(40);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(28);
  });

  it('tus 海象神拳:无杖主目标周围 350 内的旁侧敌人不受震波', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, TUS, { x: 7000, y: 8000 });
    const primary0 = enemyDummy(w0, { x: 7150, y: 8000 }); // 距 150 < 200(射程)
    const side0 = enemyDummy(w0, { x: 7400, y: 8000 }); // 距 primary0 250 < 350
    const sideMpBefore = side0.hp;
    h0.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary0.id });
    for (let i = 0; i < 15; i++) w0.step();
    expect(primary0.hp).toBeLessThan(5000); // 主目标受到重拳
    expect(side0.hp).toBe(sideMpBefore);   // 无杖:旁侧不受震波
    expect(stateOf(side0).stunned).toBeFalsy(); // 旁侧不眩晕
  });

  it('tus 海象神拳:有杖主目标周围 350 内的旁侧敌人受震波伤害', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, TUS, { x: 7000, y: 8000 }, true);
    const primary1 = enemyDummy(w1, { x: 7150, y: 8000 });
    const side1 = enemyDummy(w1, { x: 7400, y: 8000 }); // 距 primary1 250 < 350
    h1.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary1.id });
    for (let i = 0; i < 15; i++) w1.step();
    expect(primary1.hp).toBeLessThan(5000);
    expect(side1.hp).toBeLessThan(5000); // 神杖震波命中
  });

  it('tus 海象神拳:有杖 350 外的敌人不受震波', () => {
    const w = newWorld();
    const h = ultHero(w, TUS, { x: 7000, y: 8000 }, true);
    const primary = enemyDummy(w, { x: 7150, y: 8000 });
    const far = enemyDummy(w, { x: 7600, y: 8000 }); // 距 primary 450 > 350
    h.issueOrder({ type: 'cast', abilityIndex: 3, targetId: primary.id });
    for (let i = 0; i < 15; i++) w.step();
    expect(far.hp).toBe(5000); // 超出 350 范围
    expect(stateOf(far).stunned).toBeFalsy();
  });
});

// ============ KPR 跃迁 ============
describe('kpr 跃迁 神杖升级', () => {
  it('kpr 跃迁:神杖 CD 60→40', () => {
    const w = newWorld();
    const h = ultHero(w, KPR, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(60);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(40);
  });

  it('kpr 跃迁:无杖传送友军后不附加护盾', () => {
    const wmap = new GameMap();
    const w = createWorld(wmap, { seed: 141, noBuildings: true, startTime: 0 });
    const caster = spawnHero(w, KPR, Team.Dawn, { x: 7000, y: 8000 });
    caster.level = 6; caster.heroMeta!.skillPoints = 1; caster.mp = 1000;
    learnAbility(w, caster, 3);
    const ally = spawnHero(w, RUB, Team.Dawn, { x: 8000, y: 8000 });
    ally.level = 1;

    caster.issueOrder({ type: 'cast', abilityIndex: 3, targetId: ally.id });
    // castPoint 0.5s = 15步
    for (let i = 0; i < 20; i++) w.step();
    const shieldMod = ally.modifiers.find((m) => m.key === 'kpr_recall_shield');
    expect(shieldMod).toBeUndefined(); // 无杖不附加护盾
  });

  it('kpr 跃迁:有杖传送友军后附加护盾', () => {
    const wmap = new GameMap();
    const w = createWorld(wmap, { seed: 141, noBuildings: true, startTime: 0 });
    const caster = spawnHero(w, KPR, Team.Dawn, { x: 7000, y: 8000 });
    caster.level = 6; caster.heroMeta!.skillPoints = 1; caster.mp = 1000;
    learnAbility(w, caster, 3);
    caster.inventory[0] = makeItem('scepter');
    const ally = spawnHero(w, RUB, Team.Dawn, { x: 8000, y: 8000 });
    ally.level = 1;

    caster.issueOrder({ type: 'cast', abilityIndex: 3, targetId: ally.id });
    for (let i = 0; i < 20; i++) w.step();
    const shieldMod = ally.modifiers.find((m) => m.key === 'kpr_recall_shield');
    expect(shieldMod).toBeDefined(); // 神杖:落地有护盾
    if (shieldMod) {
      expect(shieldMod.data?.shield).toBeGreaterThan(0);
    }
  });
});

// ============ TRN 过载生长 ============
describe('trn 过载生长 神杖升级', () => {
  it('trn 过载生长:神杖 CD 80→56', () => {
    const w = newWorld();
    const h = ultHero(w, TRN, { x: 7000, y: 8000 });
    const def = abilityDefAt(h, 3)!;
    expect(abilityCooldown(h, def, 1)).toBe(80);
    h.inventory[0] = makeItem('scepter');
    expect(abilityCooldown(h, def, 1)).toBe(56);
  });

  it('trn 过载生长:无杖不命中 800(> 700 半径)的敌人', () => {
    const w0 = newWorld();
    const h0 = ultHero(w0, TRN, { x: 7000, y: 8000 });
    const t0 = enemyDummy(w0, { x: 7800, y: 8000 }); // 距 800 > 700
    h0.issueOrder({ type: 'cast', abilityIndex: 3 });
    // castPoint 0.3s=9步 + tickInterval 1s=30步 共 50步
    for (let i = 0; i < 50; i++) w0.step();
    expect(t0.hp).toBe(5000); // 无杖 700 半径不覆盖
  });

  it('trn 过载生长:有杖命中 800(< 1000 半径)的敌人', () => {
    const w1 = newWorld();
    const h1 = ultHero(w1, TRN, { x: 7000, y: 8000 }, true);
    const t1 = enemyDummy(w1, { x: 7800, y: 8000 }); // 距 800 < 1000
    h1.issueOrder({ type: 'cast', abilityIndex: 3 });
    // castPoint 0.3s=9步 + tickInterval 1s=30步 共 50步
    for (let i = 0; i < 50; i++) w1.step();
    expect(t1.hp).toBeLessThan(5000); // 神杖 1000 范围命中
  });

  it('trn 过载生长:有杖缠绕目标在 root 到期后受到爆裂伤害', () => {
    // root 持续 2.5 + 1*0.5 = 3秒(等级1) = 90步,加 castPoint 0.3s=9步
    const w = newWorld();
    const h = ultHero(w, TRN, { x: 7000, y: 8000 }, true);
    const t = enemyDummy(w, { x: 7300, y: 8000 }); // 300 < 1000
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    // 等施法完成并等第一 tick(~40步)
    for (let i = 0; i < 45; i++) w.step();
    const hpAfterFirstTick = t.hp;
    expect(hpAfterFirstTick).toBeLessThan(5000); // root tick 伤害

    // 等待 root 到期后爆裂(root 3s = 90步,从施法后开始共 ~100步)
    for (let i = 0; i < 100; i++) w.step();
    // root 到期后应额外受到爆裂伤害
    expect(t.hp).toBeLessThan(hpAfterFirstTick);
  });

  it('trn 过载生长:无杖缠绕目标 root 到期不受额外爆裂伤害', () => {
    const w = newWorld();
    const h = ultHero(w, TRN, { x: 7000, y: 8000 }); // 无杖
    const t = enemyDummy(w, { x: 7300, y: 8000 });
    h.issueOrder({ type: 'cast', abilityIndex: 3 });
    // 等第一 tick
    for (let i = 0; i < 45; i++) w.step();
    const hpAfterFirstTick = t.hp;
    expect(hpAfterFirstTick).toBeLessThan(5000); // root tick 确实伤害

    // 等 root 到期后额外 10步,验证没有爆裂
    for (let i = 0; i < 110; i++) w.step();
    const hpAfterExpiry = t.hp;
    for (let i = 0; i < 10; i++) w.step();
    expect(t.hp).toBe(hpAfterExpiry); // 无杖 root 到期后不再受额外伤害
  });
});
