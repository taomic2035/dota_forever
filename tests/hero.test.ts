import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero, installHeroRespawn, heroAttributes } from '../src/sim/hero';
import { REIN, AILI } from '../src/data/heroes';
import { applyDamage } from '../src/sim/combat';
import { addXp } from '../src/sim/economy';
import { XP_TABLE, BASE_HP, HP_PER_STR } from '../src/data/balance';

const map = new GameMap();

describe('hero entity', () => {
  it('level 1 panel derives from attributes', () => {
    const w = createWorld(map, { seed: 11 });
    const h = spawnHero(w, REIN, Team.Dawn);
    w.step(); // 触发重算
    expect(h.calc.maxHp).toBeCloseTo(BASE_HP + 23 * HP_PER_STR, 1); // 150+437=587
    // 主属性力量加攻:27+23 = 50
    expect(h.calc.dmgMin).toBeCloseTo(REIN.baseDamage[0] + 23, 1);
    // 敏捷折算护甲:2 + 15/7
    expect(h.calc.armor).toBeCloseTo(2 + 15 / 7, 2);
  });

  it('leveling up grows attributes by gains', () => {
    const w = createWorld(map, { seed: 11 });
    const h = spawnHero(w, AILI, Team.Dawn);
    addXp(w, h, XP_TABLE[2]); // 到 4 级
    expect(h.level).toBe(4);
    const a = heroAttributes(h);
    expect(a.agi).toBeCloseTo(26 + 2.9 * 3, 3);
    w.step();
    // 敏捷英雄主属性加攻
    expect(h.calc.dmgMin).toBeCloseTo(AILI.baseDamage[0] + a.agi, 1);
  });

  it('hero respawns at fountain after respawn time', () => {
    const w = createWorld(map, { seed: 11, startTime: 0 });
    installHeroRespawn(w);
    const h = spawnHero(w, REIN, Team.Dawn);
    h.level = 5;
    // 把英雄挪去河道送死
    h.pos = { x: 7520, y: 7520 };
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 1e6, flags: { pure: true } });
    expect(h.alive).toBe(false);
    w.step();
    const respawnAt = h.heroMeta!.respawnAt;
    expect(respawnAt).toBeGreaterThan(w.time); // 5级 → 22s
    while (w.time < respawnAt + 1) w.step();
    expect(h.alive).toBe(true);
    expect(h.hp).toBeCloseTo(h.calc.maxHp, 0);
    // 在泉水附近
    const fountain = [...w.units.values()].find((b) => b.buildingKind === 'fountain' && b.team === Team.Dawn)!;
    expect(Math.hypot(h.pos.x - fountain.pos.x, h.pos.y - fountain.pos.y)).toBeLessThan(900);
  });
});
