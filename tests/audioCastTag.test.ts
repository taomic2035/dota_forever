import { describe, it, expect } from 'vitest';
import { representativeCastTag } from '../src/audio/director';
import { HEROES } from '../src/data/heroes';

describe('施法音色代表标签(representativeCastTag)', () => {
  it('大招优先于其他标签', () => {
    expect(representativeCastTag(['nuke', 'ultimate'])).toBe('ultimate');
    expect(representativeCastTag(['ultimate', 'stun'])).toBe('ultimate');
  });

  it('控制(stun)优先于范围/减速', () => {
    expect(representativeCastTag(['aoe', 'stun'])).toBe('stun');
    expect(representativeCastTag(['slow', 'stun'])).toBe('stun');
  });

  it('范围(aoe)优先于法球(orb)', () => {
    expect(representativeCastTag(['orb', 'aoe'])).toBe('aoe');
  });

  it('单一标签直接返回', () => {
    expect(representativeCastTag(['heal'])).toBe('heal');
    expect(representativeCastTag(['buff'])).toBe('buff');
  });

  it('空或缺失返回 undefined(走默认音色)', () => {
    expect(representativeCastTag([])).toBeUndefined();
    expect(representativeCastTag(undefined)).toBeUndefined();
  });

  it('全英雄技能标签均能解析(覆盖面:有标签的技能都映射到代表标签)', () => {
    let tagged = 0;
    for (const h of HEROES) {
      for (const ab of h.abilities ?? []) {
        if (ab.tags && ab.tags.length > 0) {
          expect(representativeCastTag(ab.tags), `${ab.key}`).toBeDefined();
          tagged++;
        }
      }
    }
    expect(tagged).toBeGreaterThan(100); // 大量技能有标签 → 施法音色普遍可区分
  });
});
