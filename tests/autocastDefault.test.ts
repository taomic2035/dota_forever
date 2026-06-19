import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('autocast 默认策略(Opus sim 决策:默认开启)', () => {
  it('学习 autocast 法球后默认开启(autocastOn=true)', () => {
    const hero = HEROES.find((h) => h.abilities.some((a) => a.tags.includes('autocast')));
    expect(hero, '应至少有一个英雄带 autocast 技能').toBeTruthy();
    const idx = hero!.abilities.findIndex((a) => a.tags.includes('autocast'));

    const w = createWorld(map, { seed: 1, startTime: 100 });
    const u = spawnHero(w, hero!, Team.Dawn, { x: 1000, y: 1000 });
    u.level = 3;
    u.heroMeta!.skillPoints = 1;

    expect(u.abilities[idx].autocastOn).toBeUndefined(); // 学习前未设
    expect(learnAbility(w, u, idx)).toBe(true);
    expect(u.abilities[idx].autocastOn).toBe(true); // 学习后默认开启(bot 安全 + 开箱即用)
  });

  it('非 autocast 技能不被自动开启', () => {
    const hero = HEROES.find((h) => h.abilities.some((a) => a.tags.includes('autocast')));
    const w = createWorld(map, { seed: 1, startTime: 100 });
    const u = spawnHero(w, hero!, Team.Dawn, { x: 1000, y: 1000 });
    u.level = 3;
    u.heroMeta!.skillPoints = 1;
    const nonAuto = u.heroDef!.abilities.findIndex((a) => !a.tags.includes('autocast') && a.targetMode !== 'passive');
    if (nonAuto < 0) return;
    learnAbility(w, u, nonAuto);
    expect(u.abilities[nonAuto].autocastOn).toBeUndefined();
  });
});
