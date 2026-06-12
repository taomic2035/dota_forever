/**
 * M12b 重生延迟重组测试
 * 经典 DotA:英雄死亡触发重生时,有约 3 秒「重组」窗口——
 * 期间无敌且无法行动,3 秒后原地满血复活;重生不算被击杀。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyDamage } from '../src/sim/combat';
import { applyModifier, hasModifier } from '../src/sim/modifiers';
import { WAK } from '../src/data/heroes/batch13';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();

function dummyStats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 1000, hpRegen: 0, maxMp: 200, mpRegen: 0, dmgMin: 40, dmgMax: 40,
    attackType: 'hero', armorType: 'hero', armor: 0, magicResist: 0,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 600, bountyMin: 50, bountyMax: 50, xpBounty: 50,
    ...over,
  };
}

let w: World;
beforeEach(() => {
  w = createWorld(map, { seed: 212, noBuildings: true, startTime: 0 });
});

function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

// ---------- 辅助:给单位施加重生 buff ----------
function grantReincarnation(u: Unit): void {
  applyModifier(w, u, {
    key: 'wak_reincarnation_buff',
    duration: 999,
    isBuff: true,
    data: { preventDeath: 1, reviveFull: 1 },
  }, u.id);
}

describe('重生延迟重组(M12b)', () => {
  it('致死后英雄仍存活、进入无敌重组状态、hp>0', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    w.step(); // 初始化面板
    grantReincarnation(hero);
    expect(hasModifier(hero, 'wak_reincarnation_buff')).toBe(true);

    // 致命一击
    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });

    // 断言:英雄未真死
    expect(hero.alive).toBe(true);
    // 无敌
    expect(hero.invulnerable).toBe(true);
    // hp > 0(存活)
    expect(hero.hp).toBeGreaterThan(0);
    // 有 reincarnating modifier
    expect(hasModifier(hero, 'reincarnating')).toBe(true);
    // grave buff 已被消耗(置 expiresAt=-Infinity,下一 modifier tick 移除)
    const grave = hero.modifiers.find((m) => m.key === 'wak_reincarnation_buff');
    expect(grave === undefined || grave.expiresAt <= w.time).toBe(true);
  });

  it('重组期间伤害无效(applyDamage 返回 0)', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    w.step();
    grantReincarnation(hero);

    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });
    expect(hero.invulnerable).toBe(true);

    const hpBefore = hero.hp;
    const dealt = applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 500, flags: { pure: true } });

    expect(dealt).toBe(0);
    expect(hero.hp).toBe(hpBefore); // 血量未变
  });

  it('重组结束后满血复活、无敌解除、modifier 移除', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    w.step(); // 初始化面板
    const maxHp = hero.calc.maxHp;
    grantReincarnation(hero);

    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });
    expect(hasModifier(hero, 'reincarnating')).toBe(true);
    expect(hero.invulnerable).toBe(true);

    // 推进超过 3 秒(约 100 步 @ 30Hz)
    run(100);

    // 重组结束:无敌解除
    expect(hero.invulnerable).toBe(false);
    // 满血
    expect(hero.hp).toBe(maxHp);
    // reincarnating modifier 已移除
    expect(hasModifier(hero, 'reincarnating')).toBe(false);
  });

  it('重生不触发 kill():unit_died 事件不出现', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    w.step();
    grantReincarnation(hero);

    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });

    // 无 unit_died 事件
    const died = w.events.some((e) => e.kind === 'unit_died' && e.unitId === hero.id);
    expect(died).toBe(false);
    // alive 仍为 true
    expect(hero.alive).toBe(true);
  });

  it('直接施加重生 buff 的普通英雄单位也能触发重组', () => {
    const hero = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7200, y: 8000 }, name: 'test', stats: dummyStats() });
    w.step();
    grantReincarnation(hero);

    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });

    expect(hero.alive).toBe(true);
    expect(hero.invulnerable).toBe(true);
    expect(hasModifier(hero, 'reincarnating')).toBe(true);

    // 等待重组结束
    run(100);
    expect(hero.invulnerable).toBe(false);
    expect(hero.hp).toBe(hero.calc.maxHp);
    expect(hasModifier(hero, 'reincarnating')).toBe(false);
  });

  it('WAK 施放重生大招后触发完整流程(通过技能施加 buff)', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    hero.level = 6;
    hero.heroMeta!.skillPoints = 1;
    hero.mp = 300;
    learnAbility(w, hero, 3); // 重生大招
    hero.issueOrder({ type: 'cast', abilityIndex: 3 });
    run(3); // 等施放
    expect(hasModifier(hero, 'wak_reincarnation_buff')).toBe(true);

    // 致死
    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });

    expect(hero.alive).toBe(true);
    expect(hero.invulnerable).toBe(true);
    expect(hasModifier(hero, 'reincarnating')).toBe(true);

    // 等待重组结束
    run(100);
    expect(hero.invulnerable).toBe(false);
    expect(hero.hp).toBe(hero.calc.maxHp);
  });

  it('无重生 buff 时正常死亡(确保非 reviveFull 分支不变)', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    w.step();
    // 不施加任何重生 buff

    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });

    expect(hero.alive).toBe(false);
    expect(hasModifier(hero, 'reincarnating')).toBe(false);
  });

  it('重组期间指令/前摇被清空(无法行动)', () => {
    const hero = spawnHero(w, WAK, Team.Dawn, { x: 7000, y: 8000 });
    w.step();
    grantReincarnation(hero);

    // 给英雄挂个指令
    hero.issueOrder({ type: 'move', pos: { x: 7500, y: 8000 } });

    applyDamage(w, hero, { source: 0, attackType: 'hero', amount: 99999, flags: { pure: true } });

    // 重组期间指令被清空
    expect(hero.order).toBeNull();
    expect(hero.windupTargetId).toBe(0);
    expect(hero.attackTargetId).toBe(0);
  });
});
