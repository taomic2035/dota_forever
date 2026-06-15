import { describe, it, expect } from 'vitest';
import { GameMap } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { kill } from '../src/sim/combat';
import { PITLORD_RESPAWN } from '../src/data/balance';

describe('boss respawn timer exposed on world (for HUD)', () => {
  it('exposes a live bossId and Infinity respawn while alive', () => {
    const w = createWorld(new GameMap(), { seed: 5, creeps: true, startTime: 0 });
    for (let i = 0; i < 5; i++) w.step(); // boss spawns at 0:00
    expect(w.bossId).not.toBe(0);
    expect(w.getUnit(w.bossId)?.alive).toBe(true);
    expect(w.bossRespawnAt).toBe(Infinity);
  });

  it('schedules bossRespawnAt 8-11 min after the boss dies', () => {
    const w = createWorld(new GameMap(), { seed: 5, creeps: true, startTime: 0 });
    for (let i = 0; i < 5; i++) w.step();
    const boss = w.getUnit(w.bossId)!;
    kill(w, boss, 0);      // emits unit_died (visible next step)
    w.step();              // pitlord processes the death event
    expect(w.bossRespawnAt).toBeGreaterThanOrEqual(w.time + PITLORD_RESPAWN[0] - 1);
    expect(w.bossRespawnAt).toBeLessThanOrEqual(w.time + PITLORD_RESPAWN[1] + 1);
  });
});
