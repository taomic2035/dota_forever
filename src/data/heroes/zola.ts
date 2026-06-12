/** 雷霆先知·佐拉:智力全图法师。连环闪电/天雷/静电场/雷神之怒。 */
import { V } from '../../core/vec2';
import type { AbilityDef } from './types';
import { enemiesIn, spellDamage } from '../../sim/abilities';
import { isEnemy } from '../../sim/combat';
import { applyModifier } from '../../sim/modifiers';
import type { World } from '../../sim/world';
import type { Unit } from '../../sim/unit';

/** 静电场被动:佐拉每次施放技能,电击周围敌方英雄当前生命的一定比例。 */
const STATIC_PCT = [0, 0.04, 0.06, 0.08, 0.10]; // 按被动等级
function staticFieldPulse(w: World, caster: Unit): void {
  const inst = caster.abilities[2];
  if (!inst || inst.level <= 0) return;
  for (const e of enemiesIn(w, caster, caster.pos, 1000)) {
    if (!e.isHero()) continue;
    spellDamage(w, caster, e, e.hp * STATIC_PCT[inst.level]);
  }
  w.emit({ kind: 'fx', fx: 'staticfield', pos: V.clone(caster.pos), radius: 1000 });
}

const CHAIN_DMG = [75, 100, 125, 150];
const CHAIN_JUMPS = [5, 7, 9, 11];

export const ZOLA_Q: AbilityDef = {
  key: 'zola_chain', name: '连环闪电', maxLevel: 4, targetMode: 'unit',
  targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [90, 105, 120, 135], cooldown: [9, 8, 7, 6],
  castPoint: 0.35, tags: ['nuke', 'aoe'],
  description: '闪电在敌人间弹射,每次跳跃造成伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    const visited = new Set<number>();
    let current: Unit | undefined = target;
    let prevPos = caster.pos;
    for (let i = 0; i < CHAIN_JUMPS[lvl - 1] && current; i++) {
      visited.add(current.id);
      spellDamage(w, caster, current, CHAIN_DMG[lvl - 1]);
      w.emit({ kind: 'fx', fx: 'lightning', pos: V.clone(prevPos), pos2: V.clone(current.pos) });
      prevPos = current.pos;
      const candidates: Unit[] = w.queryRadius(current.pos, 450, (t: Unit) => isEnemy(caster, t) && !t.isBuilding() && !visited.has(t.id) && t.kind !== 'ward');
      candidates.sort((a, b) => V.distSq(prevPos, a.pos) - V.distSq(prevPos, b.pos));
      current = candidates[0];
    }
    staticFieldPulse(w, caster);
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 750);
    const heroes = foes.filter((t) => t.isHero());
    if (!heroes.length && foes.length < 3) return null;
    const t = heroes[0] ?? foes[0];
    return { score: heroes.length ? 62 : 30, targetId: t.id };
  },
};

const BOLT_DMG = [100, 175, 250, 325];

export const ZOLA_W: AbilityDef = {
  key: 'zola_bolt', name: '裁决天雷', maxLevel: 4, targetMode: 'unit',
  targetTeam: 'enemy',
  castRange: [700, 700, 700, 700], manaCost: [95, 115, 135, 155], cooldown: [12, 11, 10, 9],
  castPoint: 0.35, tags: ['nuke', 'stun'],
  description: '召来天雷轰击目标,造成重创并短暂打断。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    spellDamage(w, caster, target, BOLT_DMG[lvl - 1]);
    // 0.2s 微眩晕:打断引导
    applyModifier(w, target, { key: 'zola_bolt_ministun', duration: 0.2, states: { stunned: true } }, caster.id);
    w.emit({ kind: 'fx', fx: 'bolt', pos: V.clone(target.pos) });
    staticFieldPulse(w, caster);
  },
  aiScore(w, caster, lvl) {
    const foes = enemiesIn(w, caster, caster.pos, 750).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 72 + (foes[0].hp < BOLT_DMG[lvl - 1] * 0.75 ? 50 : 0), targetId: foes[0].id };
  },
};

export const ZOLA_E: AbilityDef = {
  key: 'zola_static', name: '静电场', maxLevel: 4, targetMode: 'passive',
  tags: ['nuke'],
  description: '施放技能时,电击周围敌方英雄当前生命值的一部分。',
  passiveModifier: () => ({ key: 'zola_static_passive', isBuff: true }),
};

const WRATH_DMG = [210, 335, 460];

export const ZOLA_R: AbilityDef = {
  key: 'zola_wrath', name: '雷神之怒', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [225, 325, 450], cooldown: [120, 100, 80],
  castPoint: 0.5, tags: ['nuke', 'ultimate'],
  description: '雷霆审判全图所有敌方英雄。',
  onCast(w, caster, lvl) {
    for (const u of w.units.values()) {
      if (!u.isHero() || !u.alive || u.team === caster.team) continue;
      spellDamage(w, caster, u, WRATH_DMG[lvl - 1]);
      w.emit({ kind: 'fx', fx: 'bolt', pos: V.clone(u.pos) });
    }
    staticFieldPulse(w, caster);
  },
  aiScore(w, caster, lvl) {
    // 全图有残血敌方英雄即放
    for (const u of w.units.values()) {
      if (!u.isHero() || !u.alive || u.team === caster.team) continue;
      if (u.hp < WRATH_DMG[lvl - 1] * 0.7) return { score: 95 };
    }
    return null;
  },
};

export const ZOLA_ABILITIES = [ZOLA_Q, ZOLA_W, ZOLA_E, ZOLA_R];
