/** 霜语者·莉雅:智力法系辅助。冰霜新星/冰封禁制/秘法之泉/极寒领域。 */
import { V } from '../../core/vec2';
import type { AbilityDef } from './types';
import { damageArea, modifierArea, enemiesIn, spellDamage } from '../../sim/abilities';
import { applyModifier } from '../../sim/modifiers';

const NOVA_DMG = [110, 160, 210, 260];
const NOVA_SLOW_DUR = [3.0, 3.5, 4.0, 4.5];

export const LIYA_Q: AbilityDef = {
  key: 'liya_nova', name: '冰霜新星', maxLevel: 4, targetMode: 'point',
  castRange: [700, 700, 700, 700], manaCost: [105, 120, 135, 150], cooldown: [11, 10, 9, 8],
  castPoint: 0.4, tags: ['nuke', 'slow', 'aoe'],
  description: '在目标区域引爆寒霜,伤害并减速敌人。',
  onCast(w, caster, lvl, pos) {
    if (!pos) return;
    damageArea(w, caster, pos, 400, NOVA_DMG[lvl - 1]);
    modifierArea(w, caster, pos, 400, {
      key: 'liya_nova_slow', duration: NOVA_SLOW_DUR[lvl - 1],
      stats: { bonusMoveSpeedPct: -0.3, bonusAttackSpeed: -0.2 },
    }, 'enemy');
    w.emit({ kind: 'fx', fx: 'frostnova', pos: V.clone(pos), radius: 400 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 750).filter((t) => t.isHero());
    if (!foes.length) return null;
    return { score: 64 + foes.length * 12, pos: V.clone(foes[0].pos) };
  },
};

const BIND_DUR = [1.5, 2.0, 2.5, 3.0];
const BIND_DPS = [25, 30, 35, 40];

export const LIYA_W: AbilityDef = {
  key: 'liya_bind', name: '冰封禁制', maxLevel: 4, targetMode: 'unit', targetTeam: 'enemy',
  castRange: [550, 550, 550, 550], manaCost: [115, 125, 135, 150], cooldown: [10, 9.5, 9, 8.5],
  castPoint: 0.4, tags: ['stun', 'nuke'],
  description: '冰封目标,使其无法移动并持续受到伤害。',
  onCast(w, caster, lvl, _pos, target) {
    if (!target) return;
    applyModifier(w, target, {
      key: 'liya_bind_root', duration: BIND_DUR[lvl - 1],
      states: { rooted: true, disarmed: true },
      tickInterval: 0.5,
      onTick: (world, u) => { spellDamage(world, caster, u, BIND_DPS[lvl - 1] / 2); },
    }, caster.id);
    w.emit({ kind: 'fx', fx: 'frostbind', pos: V.clone(target.pos), radius: 80 });
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 600).filter((t) => t.isHero());
    if (!foes.length) return null;
    foes.sort((a, b) => a.hp - b.hp);
    return { score: 68, targetId: foes[0].id };
  },
};

const SPRING_REGEN = [0.75, 1.5, 2.25, 3.0];

export const LIYA_E: AbilityDef = {
  key: 'liya_spring', name: '秘法之泉', maxLevel: 4, targetMode: 'passive',
  tags: ['buff'],
  description: '为全队英雄提供法力回复(全地图光环)。',
  passiveModifier: (lvl) => ({
    key: 'liya_spring_aura', isBuff: true,
    aura: {
      radius: 99999, affects: 'allyHero',
      grant: { key: 'liya_spring_regen', stats: { bonusMpRegen: SPRING_REGEN[lvl - 1] }, isBuff: true },
    },
  }),
};

const FIELD_TICK_DMG = [40, 65, 90];

export const LIYA_R: AbilityDef = {
  key: 'liya_field', name: '极寒领域', maxLevel: 3, ultimate: true, targetMode: 'none',
  manaCost: [200, 320, 440], cooldown: [110, 100, 90],
  castPoint: 0.3, tags: ['channel', 'aoe', 'slow'],
  description: '引导冰暴 6 秒,持续冻伤并减速周围敌人。',
  channel: {
    duration: () => 6,
    tickInterval: 0.5,
    onChannelTick(w, caster, lvl) {
      damageArea(w, caster, caster.pos, 600, FIELD_TICK_DMG[lvl - 1]);
      modifierArea(w, caster, caster.pos, 600, {
        key: 'liya_field_slow', duration: 1.0, stats: { bonusMoveSpeedPct: -0.25 },
      }, 'enemy');
      w.emit({ kind: 'fx', fx: 'blizzard', pos: V.clone(caster.pos), radius: 600 });
    },
  },
  aiScore(w, caster) {
    const foes = enemiesIn(w, caster, caster.pos, 550).filter((t) => t.isHero());
    if (foes.length < 2 && !(foes.length === 1 && foes[0].hp < caster.calc.maxHp)) return null;
    return { score: 88 };
  },
};

export const LIYA_ABILITIES = [LIYA_Q, LIYA_W, LIYA_E, LIYA_R];
