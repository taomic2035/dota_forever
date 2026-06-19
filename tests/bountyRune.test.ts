import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { applyRune } from '../src/sim/runes';
import { bountyRuneGold, RUNE_TYPES } from '../src/data/balance';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('bountyRuneGold', () => {
  it('基础 + 每分钟成长(温和)', () => {
    expect(bountyRuneGold(0)).toBe(50);
    expect(bountyRuneGold(60)).toBe(56); // +6/min
    expect(bountyRuneGold(600)).toBe(110); // 10min
    expect(bountyRuneGold(-30)).toBe(50); // 负时间钳到 0
  });
});

describe('赏金符', () => {
  it('已注册为符文类型', () => {
    expect(RUNE_TYPES).toContain('bounty');
  });

  it('拾取赏金符 → 英雄获得金币(按时间成长)', () => {
    const w = createWorld(map, { seed: 5, startTime: 600 }); // 10min
    const h = spawnHero(w, HEROES[0], Team.Dawn);
    const before = h.heroMeta!.gold;
    applyRune(w, h, 'bounty');
    expect(h.heroMeta!.gold - before).toBe(bountyRuneGold(600)); // +110
  });
});
