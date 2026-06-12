import { describe, expect, it } from 'vitest';
import { resolveSelfCastTarget, targetTeamAllowsSelfCast } from '../src/engine/selfCast';
import type { TargetableUnit } from '../src/engine/targetFilters';

const caster: TargetableUnit = {
  id: 7,
  team: 0,
  alive: true,
  pos: { x: 100, y: 200 },
  kind: 'hero',
  isHero: () => true,
  isBuilding: () => false,
};

describe('self-cast policy', () => {
  it('only allows explicit self-capable team filters', () => {
    expect(targetTeamAllowsSelfCast('self')).toBe(true);
    expect(targetTeamAllowsSelfCast('allyOrSelf')).toBe(true);
    expect(targetTeamAllowsSelfCast('any')).toBe(true);
    expect(targetTeamAllowsSelfCast('ally')).toBe(false);
    expect(targetTeamAllowsSelfCast('enemy')).toBe(false);
    expect(targetTeamAllowsSelfCast(undefined)).toBe(false);
  });

  it('resolves the caster as the direct target when self-cast is allowed', () => {
    expect(resolveSelfCastTarget(caster, 'allyOrSelf')).toBe(caster);
    expect(resolveSelfCastTarget(caster, 'self')).toBe(caster);
    expect(resolveSelfCastTarget(caster, 'any')).toBe(caster);
  });

  it('rejects enemy-only, ally-only, and implicit-any commands', () => {
    expect(resolveSelfCastTarget(caster, 'enemy')).toBeUndefined();
    expect(resolveSelfCastTarget(caster, 'ally')).toBeUndefined();
    expect(resolveSelfCastTarget(caster, undefined)).toBeUndefined();
  });

  it('respects target kind filters when resolving self-cast', () => {
    expect(resolveSelfCastTarget(caster, 'allyOrSelf', 'hero')).toBe(caster);
    expect(resolveSelfCastTarget(caster, 'allyOrSelf', 'creep')).toBeUndefined();
  });
});
