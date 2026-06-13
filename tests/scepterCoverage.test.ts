/**
 * 神杖覆盖完整性(商用级收口):断言全 112 英雄的大招(index 3)均具备阿哈利姆神杖
 * 升级(scepter 数值轴 或 scepterPassive 被动轴)。证明 DotA1「每英雄神杖」特性全覆盖。
 */
import { describe, it, expect } from 'vitest';
import { HEROES } from '../src/data/heroes';

describe('神杖覆盖完整性(全 112 英雄)', () => {
  it('每名英雄的大招均有神杖升级(scepter 或 scepterPassive)', () => {
    const missing = HEROES.filter((h) => {
      const ult = h.abilities[3];
      return !ult.scepter && !ult.scepterPassive;
    }).map((h) => h.key);
    expect(missing).toEqual([]);
  });
});
