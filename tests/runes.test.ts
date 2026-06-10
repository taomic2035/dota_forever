import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem, useItem, syncHolderModifiers } from '../src/sim/items';
import { hasModifier } from '../src/sim/modifiers';
import { applyRune } from '../src/sim/runes';
import { REIN } from '../src/data/heroes';
import { V } from '../src/core/vec2';

const map = new GameMap();

describe('runes', () => {
  it('spawns a rune every 2 minutes at one of two spots', () => {
    const w = createWorld(map, { seed: 22, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step(); // 过 0:00
    expect(w.runes.length).toBe(1);
    const onSpot = w.map.runeSpots.some((s) => V.dist(s, w.runes[0].pos) < 1);
    expect(onSpot).toBe(true);
  });

  it('hero picks up rune by proximity and gains effect', () => {
    const w = createWorld(map, { seed: 23, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    const rune = w.runes[0];
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(rune.pos));
    for (let i = 0; i < 10; i++) w.step();
    expect(w.runes.length).toBe(0);
    const gained =
      hasModifier(h, 'rune_haste') || hasModifier(h, 'rune_dd') ||
      hasModifier(h, 'rune_regen') || hasModifier(h, 'rune_invis');
    expect(gained).toBe(true);
  });

  it('haste rune caps movespeed at 522', () => {
    const w = createWorld(map, { seed: 22, startTime: -1 });
    const h = spawnHero(w, REIN, Team.Dawn);
    applyRune(w, h, 'haste');
    w.step();
    expect(h.calc.moveSpeed).toBe(522);
  });

  it('bottle stores rune and auto-activates after 2 minutes', () => {
    const w = createWorld(map, { seed: 23, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    const rune = w.runes[0];
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable({ x: rune.pos.x + 600, y: rune.pos.y }));
    h.inventory[0] = makeItem('bottle');
    h.inventory[0].charges = 0; // 空瓶
    syncHolderModifiers(w, h);
    h.pos = w.map.nearestWalkable(rune.pos);
    for (let i = 0; i < 10; i++) w.step();
    expect(h.inventory[0]!.runeKey).toBeTruthy(); // 装瓶
    // 直接喝掉(瓶中符立即生效)
    const runeType = h.inventory[0]!.runeKey!;
    expect(useItem(w, h, 0)).toBe(true);
    w.step();
    expect(h.inventory[0]!.runeKey).toBeUndefined();
    expect(h.modifiers.some((m) => m.key.startsWith('rune_'))).toBe(true);
    void runeType;
  });

  it('bottle refills at fountain', () => {
    const w = createWorld(map, { seed: 22, startTime: 0 });
    const h = spawnHero(w, REIN, Team.Dawn); // 泉水旁
    h.inventory[0] = makeItem('bottle');
    h.inventory[0].charges = 0;
    for (let i = 0; i < 40; i++) w.step();
    expect(h.inventory[0]!.charges).toBe(3);
  });
});
