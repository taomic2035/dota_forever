import type { World } from './world';
import type { Unit } from './unit';

export function canDenyTarget(world: World, attacker: Unit, target: Unit): boolean {
  if (!attacker.alive || !target.alive) return false;
  if (attacker.team !== target.team) return false;
  const hpFrac = target.hp / Math.max(1, target.calc.maxHp);
  if (target.kind === 'creep') return hpFrac < 0.5;
  if (target.kind === 'tower' || target.kind === 'building') return hpFrac < 0.1;
  if (target.kind === 'hero') return hpFrac < 0.25 && hasHostileDamageOverTime(world, target);
  return false;
}

export function hasHostileDamageOverTime(world: World, target: Unit): boolean {
  return target.modifiers.some((modifier) => {
    if (modifier.expiresAt <= world.time) return false;
    if (modifier.def.isBuff === true) return false;
    if (modifier.def.tickInterval === undefined || !modifier.def.onTick) return false;
    const source = world.getUnit(modifier.sourceId);
    return !!source && source.team !== target.team;
  });
}
