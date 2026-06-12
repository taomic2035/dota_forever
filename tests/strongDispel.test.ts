/**
 * M6 强驱散 / 基础驱散分级测试
 * 验证 purge(w, u, removeBuffs, strong) 的分级语义:
 *   - strong=false(基础驱散):跳过含硬控(stunned/rooted)的减益
 *   - strong=true(强驱散):解除一切减益含硬控
 *   - 永久 modifier(expiresAt===Infinity)任何驱散均不移除
 *   - removeBuffs=false 驱散减益时,不移除 isBuff 的 modifier
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { applyModifier, hasModifier, purge } from '../src/sim/modifiers';
import { REIN } from '../src/data/heroes';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();
let w: World;
let u: Unit;

beforeEach(() => {
  w = createWorld(map, { seed: 42, startTime: 0 });
  // 使用同队英雄,用自身 id 作为 sourceId 避免 M1 魔免拦截
  u = spawnHero(w, REIN, Team.Dawn, { x: 7000, y: 8000 });
});

/** 添加眩晕 debuff(自身来源,避免 M1 拦截) */
function addStun(): void {
  applyModifier(w, u, { key: 'x_stun', duration: 5, states: { stunned: true } }, u.id);
}

/** 添加缠绕 debuff(自身来源) */
function addRoot(): void {
  applyModifier(w, u, { key: 'x_root', duration: 5, states: { rooted: true } }, u.id);
}

/** 添加普通减速 debuff(自身来源) */
function addSlow(): void {
  applyModifier(w, u, { key: 'x_slow', duration: 5, stats: { bonusMoveSpeedPct: -0.3 } }, u.id);
}

describe('M6 强驱散 / 基础驱散分级', () => {
  describe('基础驱散(strong=false)——跳过硬控', () => {
    it('基础驱散不移除眩晕 debuff', () => {
      addStun();
      expect(hasModifier(u, 'x_stun')).toBe(true);
      purge(w, u, false, false);
      expect(hasModifier(u, 'x_stun')).toBe(true); // 眩晕仍在
    });

    it('基础驱散不移除缠绕 debuff', () => {
      addRoot();
      expect(hasModifier(u, 'x_root')).toBe(true);
      purge(w, u, false, false);
      expect(hasModifier(u, 'x_root')).toBe(true); // 缠绕仍在
    });

    it('基础驱散能移除普通减速 debuff', () => {
      addSlow();
      expect(hasModifier(u, 'x_slow')).toBe(true);
      purge(w, u, false, false);
      expect(hasModifier(u, 'x_slow')).toBe(false); // 减速被移除
    });

    it('基础驱散:眩晕保留,减速移除(混合场景)', () => {
      addStun();
      addSlow();
      purge(w, u, false, false);
      expect(hasModifier(u, 'x_stun')).toBe(true);   // 眩晕仍在
      expect(hasModifier(u, 'x_slow')).toBe(false);  // 减速移除
    });

    it('基础驱散:眩晕+缠绕均保留', () => {
      addStun();
      addRoot();
      addSlow();
      purge(w, u, false, false);
      expect(hasModifier(u, 'x_stun')).toBe(true);   // 眩晕仍在
      expect(hasModifier(u, 'x_root')).toBe(true);   // 缠绕仍在
      expect(hasModifier(u, 'x_slow')).toBe(false);  // 减速移除
    });
  });

  describe('强驱散(strong=true)——可清硬控', () => {
    it('强驱散移除眩晕 debuff', () => {
      addStun();
      expect(hasModifier(u, 'x_stun')).toBe(true);
      purge(w, u, false, true);
      expect(hasModifier(u, 'x_stun')).toBe(false); // 眩晕被移除
    });

    it('强驱散移除缠绕 debuff', () => {
      addRoot();
      expect(hasModifier(u, 'x_root')).toBe(true);
      purge(w, u, false, true);
      expect(hasModifier(u, 'x_root')).toBe(false); // 缠绕被移除
    });

    it('强驱散移除普通减速 debuff', () => {
      addSlow();
      purge(w, u, false, true);
      expect(hasModifier(u, 'x_slow')).toBe(false);
    });

    it('强驱散:眩晕+减速全部移除', () => {
      addStun();
      addSlow();
      purge(w, u, false, true);
      expect(hasModifier(u, 'x_stun')).toBe(false);
      expect(hasModifier(u, 'x_slow')).toBe(false);
    });
  });

  describe('buff 不受 removeBuffs=false 驱散影响', () => {
    it('基础驱散(removeBuffs=false)不移除 isBuff modifier', () => {
      applyModifier(w, u, { key: 'x_buff', duration: 5, isBuff: true, stats: { bonusDamage: 10 } }, u.id);
      purge(w, u, false, false);
      expect(hasModifier(u, 'x_buff')).toBe(true); // buff 保留
    });

    it('强驱散(removeBuffs=false)也不移除 isBuff modifier', () => {
      applyModifier(w, u, { key: 'x_buff', duration: 5, isBuff: true, stats: { bonusDamage: 10 } }, u.id);
      purge(w, u, false, true);
      expect(hasModifier(u, 'x_buff')).toBe(true); // buff 保留
    });
  });

  describe('永久 modifier 不可驱散', () => {
    it('永久减益(expiresAt===Infinity)不被任何驱散移除', () => {
      // duration 未指定 → expiresAt=Infinity
      applyModifier(w, u, { key: 'x_perm_debuff', stats: { bonusMoveSpeedPct: -0.2 } }, u.id);
      purge(w, u, false, true); // 强驱散
      expect(hasModifier(u, 'x_perm_debuff')).toBe(true); // 永久不可驱散
    });

    it('永久 buff 不被 removeBuffs=true 驱散移除', () => {
      applyModifier(w, u, { key: 'x_perm_buff', isBuff: true, stats: { bonusDamage: 5 } }, u.id);
      purge(w, u, true); // 移除增益
      expect(hasModifier(u, 'x_perm_buff')).toBe(true); // 永久不可驱散
    });
  });

  describe('默认参数 strong 默认为 false(向后兼容)', () => {
    it('purge(w, u, false) 等同于基础驱散——不移除眩晕', () => {
      addStun();
      addSlow();
      purge(w, u, false); // 不传 strong,默认 false
      expect(hasModifier(u, 'x_stun')).toBe(true);   // 眩晕仍在
      expect(hasModifier(u, 'x_slow')).toBe(false);  // 减速移除
    });
  });
});
