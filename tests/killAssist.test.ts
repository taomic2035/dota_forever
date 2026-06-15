import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import type { World } from '../src/sim/world';
import type { Unit, UnitStats } from '../src/sim/unit';

const map = new GameMap();
function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 600, hpRegen: 0, maxMp: 0, mpRegen: 0,
    dmgMin: 60, dmgMax: 60, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0, attackRange: 150, attackPoint: 0.3,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 0, bountyMax: 0, xpBounty: 0, ...over,
  };
}
function mk(w: World, team: Team, x: number, y: number, over: Partial<UnitStats> = {}): Unit {
  return w.spawnUnit({ kind: 'hero', team, pos: { x, y }, name: 'h', stats: stats(over) });
}

describe('hero_kill assist attribution', () => {
  it('emits nearby allied assisters of the killer (not the killer)', () => {
    const w = createWorld(map, { seed: 3, noBuildings: true, startTime: 0 });
    const killer = mk(w, Team.Dawn, 7000, 8000, { dmgMin: 500, dmgMax: 500 });
    const ally = mk(w, Team.Dawn, 7200, 8000);      // within ASSIST_RADIUS of the victim
    const victim = mk(w, Team.Night, 7100, 8000, { dmgMin: 0, dmgMax: 0, maxHp: 400 });
    victim.level = 5;
    killer.issueOrder({ type: 'attack', targetId: victim.id });

    let assists: number[] | undefined;
    for (let i = 0; i < 120 && victim.alive; i++) {
      w.step();
      const ev = w.events.find((e) => e.kind === 'hero_kill');
      if (ev && ev.kind === 'hero_kill') assists = ev.assists;
    }
    expect(victim.alive).toBe(false);
    expect(assists).toContain(ally.id);
    expect(assists).not.toContain(killer.id);
  });
});
