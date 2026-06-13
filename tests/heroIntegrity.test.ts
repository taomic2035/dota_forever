/**
 * 全英雄内容完整性(商用级守卫):校验 112 名英雄的结构不变量——
 * 基础属性合理、4 技能齐备、大招在 index 3、数值数组长度匹配、key 全局唯一。
 * 捕捉跨海量内容(112×4 技能)的复制粘贴/漏配类 bug。
 */
import { describe, it, expect } from 'vitest';
import { HEROES } from '../src/data/heroes';

const HEX = /^#[0-9a-fA-F]{6}$/;
const PRIMARIES = ['str', 'agi', 'int'];
const AI_ROLES = ['carry', 'support', 'ganker', 'tank'];

describe('英雄内容完整性(全 112 名)', () => {
  it('roster 恰为 112 名,key 全局唯一', () => {
    expect(HEROES.length).toBe(112);
    const keys = HEROES.map((h) => h.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('每名英雄:身份字段与基础属性合理', () => {
    for (const h of HEROES) {
      const tag = h.key || h.name;
      expect(h.key, tag).toBeTruthy();
      expect(h.name, tag).toBeTruthy();
      expect(h.title, tag).toBeTruthy();
      expect(PRIMARIES, tag).toContain(h.primary);
      expect(AI_ROLES, tag).toContain(h.aiRole);
      expect(h.color, `${tag} color`).toMatch(HEX);
      expect(h.glyph, `${tag} glyph`).toBeTruthy();
      // 基础属性
      expect(h.baseStr, tag).toBeGreaterThan(0);
      expect(h.baseAgi, tag).toBeGreaterThan(0);
      expect(h.baseInt, tag).toBeGreaterThan(0);
      expect(h.gainStr, tag).toBeGreaterThanOrEqual(0);
      expect(h.baseDamage[0], tag).toBeLessThanOrEqual(h.baseDamage[1]);
      expect(h.baseMs, tag).toBeGreaterThanOrEqual(200);
      expect(h.attackRange, tag).toBeGreaterThan(0);
      expect(h.bat, tag).toBeGreaterThan(0);
      expect(h.attackPoint, tag).toBeGreaterThanOrEqual(0);
    }
  });

  it('每名英雄:恰 4 个技能,大招在 index 3 且为 ultimate', () => {
    for (const h of HEROES) {
      expect(h.abilities.length, h.key).toBe(4);
      expect(h.abilities[3].ultimate, `${h.key} R`).toBe(true);
      // 前三个非大招
      for (let i = 0; i < 3; i++) {
        expect(h.abilities[i].ultimate, `${h.key} ability ${i}`).not.toBe(true);
      }
    }
  });

  it('每个技能:字段齐备,数值数组长度匹配 maxLevel', () => {
    for (const h of HEROES) {
      for (const a of h.abilities) {
        const tag = `${h.key}.${a.key}`;
        expect(a.key, tag).toBeTruthy();
        expect(a.name, tag).toBeTruthy();
        expect(a.description, tag).toBeTruthy();
        expect(Array.isArray(a.tags), `${tag} tags`).toBe(true);
        expect(a.maxLevel, tag).toBeGreaterThanOrEqual(1);
        if (a.manaCost) expect(a.manaCost.length, `${tag} manaCost`).toBeGreaterThanOrEqual(a.maxLevel);
        if (a.cooldown) expect(a.cooldown.length, `${tag} cooldown`).toBeGreaterThanOrEqual(a.maxLevel);
        // 神杖数值轴(若声明)长度匹配
        if (a.scepter?.cooldown) expect(a.scepter.cooldown.length, `${tag} scepter.cooldown`).toBeGreaterThanOrEqual(a.maxLevel);
        if (a.scepter?.manaCost) expect(a.scepter.manaCost.length, `${tag} scepter.manaCost`).toBeGreaterThanOrEqual(a.maxLevel);
      }
    }
  });

  it('技能 key 全局唯一(避免 modifier/技能 key 冲突)', () => {
    const all = HEROES.flatMap((h) => h.abilities.map((a) => a.key));
    const dups = all.filter((k, i) => all.indexOf(k) !== i);
    expect([...new Set(dups)]).toEqual([]);
  });
});
