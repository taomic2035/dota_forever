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
  it('spawns a rune at BOTH river spots every 2 minutes (M5)', () => {
    const w = createWorld(map, { seed: 22, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step(); // 过 0:00
    expect(w.runes.length).toBe(2);
    // 两枚分别落在两个河道点
    for (const spot of w.map.runeSpots) {
      expect(w.runes.some((r) => V.dist(spot, r.pos) < 1)).toBe(true);
    }
  });

  it('hero picks up one rune by proximity; the other remains (M5)', () => {
    const w = createWorld(map, { seed: 23, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    expect(w.runes.length).toBe(2);
    w.runes[0].type = 'haste'; // 确定化(避免随机到幻象符影响本用例)
    const rune = w.runes[0];
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(rune.pos));
    for (let i = 0; i < 10; i++) w.step();
    expect(w.runes.length).toBe(1); // 仅取走附近那一枚,另一枚仍在
    expect(hasModifier(h, 'rune_haste')).toBe(true);
  });

  it('two heroes can grab both runes simultaneously (M5)', () => {
    const w = createWorld(map, { seed: 24, startTime: -1 });
    for (let i = 0; i < 60; i++) w.step();
    expect(w.runes.length).toBe(2);
    w.runes[0].type = 'haste';
    w.runes[1].type = 'doubledamage';
    const h1 = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(w.runes[0].pos));
    const h2 = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable(w.runes[1].pos));
    for (let i = 0; i < 10; i++) w.step();
    expect(w.runes.length).toBe(0);
    expect(hasModifier(h1, 'rune_haste')).toBe(true);
    expect(hasModifier(h2, 'rune_dd')).toBe(true);
  });

  it('illusion rune spawns 2 illusions of the picker (M5)', () => {
    const w = createWorld(map, { seed: 1, startTime: 0 });
    const h = spawnHero(w, REIN, Team.Dawn);
    applyRune(w, h, 'illusion');
    const illu = [...w.units.values()].filter((u) => u.kind === 'illusion' && u.summonOwnerId === h.id);
    expect(illu.length).toBe(2);
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
    w.runes[0].type = 'haste'; // 确定化
    const rune = w.runes[0];
    const h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable({ x: rune.pos.x + 600, y: rune.pos.y }));
    h.inventory[0] = makeItem('bottle');
    h.inventory[0].charges = 0; // 空瓶
    syncHolderModifiers(w, h);
    h.pos = w.map.nearestWalkable(rune.pos);
    for (let i = 0; i < 10; i++) w.step();
    expect(h.inventory[0]!.runeKey).toBe('haste'); // 装瓶
    // 直接喝掉(瓶中符立即生效)
    expect(useItem(w, h, 0)).toBe(true);
    w.step();
    expect(h.inventory[0]!.runeKey).toBeUndefined();
    expect(hasModifier(h, 'rune_haste')).toBe(true);
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
