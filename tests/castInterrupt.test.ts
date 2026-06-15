import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { learnAbility } from '../src/sim/abilities';
import { applyModifier } from '../src/sim/modifiers';
import type { HeroDef, AbilityDef } from '../src/data/heroes/types';

const map = new GameMap();
const fired: string[] = [];

const SLOWCAST: AbilityDef = {
  key: 'slowcast', name: '慢咒', maxLevel: 1, targetMode: 'point',
  castRange: [900], manaCost: [0], cooldown: [0], castPoint: 0.5, tags: ['nuke'], description: '',
  onCast() { fired.push('fired'); },
};
const CASTER: HeroDef = {
  key: 'caster', name: '咒者', title: '', primary: 'int',
  baseStr: 18, gainStr: 2, baseAgi: 14, gainAgi: 1.5, baseInt: 24, gainInt: 3,
  baseDamage: [20, 26], baseArmor: 0, baseMs: 300, attackRange: 600, projectileSpeed: 900,
  bat: 1.7, attackPoint: 0.4, color: '#fff', glyph: '咒', abilities: [SLOWCAST], aiRole: 'ganker',
};

function startCasting() {
  const w = createWorld(map, { seed: 1, noBuildings: true, startTime: 0 });
  const h = spawnHero(w, CASTER, Team.Dawn, { x: 7000, y: 8000 });
  learnAbility(w, h, 0);
  fired.length = 0;
  h.issueOrder({ type: 'cast', abilityIndex: 0, pos: { x: 7300, y: 8000 } });
  for (let i = 0; i < 4; i++) w.step(); // ~0.13s into the 0.5s cast point
  expect(h.casting).not.toBeNull();
  return { w, h };
}

describe('cast-point interrupt', () => {
  it('untargetable (cyclone/banish) cancels an in-progress cast', () => {
    const { w, h } = startCasting();
    applyModifier(w, h, { key: 'test_cyclone', duration: 2, states: { untargetable: true } }, h.id);
    for (let i = 0; i < 20; i++) w.step(); // past the original cast point
    expect(fired).toEqual([]); // cast cancelled, onCast never ran
    expect(h.casting).toBeNull();
  });

  it('stun still cancels an in-progress cast (regression)', () => {
    const { w, h } = startCasting();
    applyModifier(w, h, { key: 'test_stun', duration: 2, states: { stunned: true } }, h.id);
    for (let i = 0; i < 20; i++) w.step();
    expect(fired).toEqual([]);
    expect(h.casting).toBeNull();
  });

  it('an uninterrupted cast completes normally (control)', () => {
    const { w } = startCasting();
    for (let i = 0; i < 20; i++) w.step();
    expect(fired).toEqual(['fired']);
  });
});
