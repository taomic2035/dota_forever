import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { itemDef, TOME_XP, TOME_COOLDOWN } from '../src/data/items';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('知识之书', () => {
  it('使用 → 获得经验 + 进入每英雄冷却', () => {
    const w = createWorld(map, { seed: 3, startTime: 300 });
    const h = spawnHero(w, HEROES[0], Team.Dawn);
    const onUse = itemDef('tome_knowledge').active!.onUse;
    const beforeXp = h.heroMeta!.xp;
    const beforeLevel = h.level;
    expect(onUse(w, h)).toBe(true);
    // XP 或等级提升(addXp 可能把 xp 转化为等级)
    expect(h.heroMeta!.xp > beforeXp || h.level > beforeLevel).toBe(true);
    expect(h.heroMeta!.tomeReadyAt).toBe(w.time + TOME_COOLDOWN);
  });

  it('冷却中再次使用 → 失败(不给经验)', () => {
    const w = createWorld(map, { seed: 3, startTime: 300 });
    const h = spawnHero(w, HEROES[0], Team.Dawn);
    const onUse = itemDef('tome_knowledge').active!.onUse;
    expect(onUse(w, h)).toBe(true);
    expect(onUse(w, h)).toBe(false); // 冷却中
  });

  it('冷却到期后可再次使用', () => {
    const w = createWorld(map, { seed: 3, startTime: 300 });
    const h = spawnHero(w, HEROES[0], Team.Dawn);
    const onUse = itemDef('tome_knowledge').active!.onUse;
    onUse(w, h);
    h.heroMeta!.tomeReadyAt = w.time - 1; // 模拟冷却已过
    expect(onUse(w, h)).toBe(true);
  });

  it('常量合理(温和经验 + 防滥用冷却)', () => {
    expect(TOME_XP).toBeGreaterThan(0);
    expect(TOME_COOLDOWN).toBeGreaterThanOrEqual(300); // ≥5min 防滥用
  });
});
