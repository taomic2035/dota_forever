import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { applyDamage } from '../src/sim/combat';
import { createIllusion } from '../src/sim/abilities';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('经济金币修复(对照 DotA)', () => {
  it('A1:助攻英雄获得助攻金(不只是计数)', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const killer = spawnHero(w, HEROES[0], Team.Dawn, { x: 2000, y: 2000 });
    const assister = spawnHero(w, HEROES[1], Team.Dawn, { x: 2120, y: 2000 }); // 助攻圈内
    const victim = spawnHero(w, HEROES[2], Team.Night, { x: 2050, y: 2000 });
    killer.heroMeta!.gold = 0;
    assister.heroMeta!.gold = 0;
    victim.hp = 1;
    applyDamage(w, victim, { source: killer.id, attackType: killer.calc.attackType, amount: 99999 });
    for (let i = 0; i < 4; i++) w.step();
    expect(victim.alive).toBe(false);
    expect(killer.heroMeta!.gold).toBeGreaterThan(0); // 击杀赏金
    expect(assister.heroMeta!.assists).toBeGreaterThan(0); // 助攻计数
    expect(assister.heroMeta!.gold).toBeGreaterThan(0); // 助攻金(本次修复点)
  });

  it('A6:击杀幻象获得小额金', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const dawn = spawnHero(w, HEROES[0], Team.Dawn, { x: 2000, y: 2000 });
    const night = spawnHero(w, HEROES[2], Team.Night, { x: 6000, y: 6000 });
    createIllusion(w, night, 1, 0.33, 2.0, 30);
    const illu = [...w.units.values()].find((u) => u.kind === 'illusion');
    expect(illu, '应生成幻象').toBeTruthy();
    illu!.pos = { x: 2050, y: 2000 };
    dawn.heroMeta!.gold = 0;
    illu!.hp = 1;
    applyDamage(w, illu!, { source: dawn.id, attackType: dawn.calc.attackType, amount: 99999 });
    for (let i = 0; i < 4; i++) w.step();
    expect(illu!.alive).toBe(false);
    expect(dawn.heroMeta!.gold).toBeGreaterThan(0); // 杀幻象小额金(本次修复点)
  });
});
