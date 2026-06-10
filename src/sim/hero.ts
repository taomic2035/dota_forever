/**
 * 英雄实体:属性成长折算(力/敏/智)、主属性加攻、复活。
 * 英雄定义(HeroDef)在 data/heroes/ 下,全部为原创角色。
 */
import { V } from '../core/vec2';
import {
  HP_PER_STR, HP_REGEN_PER_STR, MP_PER_INT, MP_REGEN_PER_INT,
  ARMOR_PER_AGI, IAS_PER_AGI, BASE_HP, BASE_MP, BASE_HP_REGEN, BASE_MP_REGEN,
  HERO_BASE_MAGIC_RESIST, STAT_BONUS_PER_LEVEL, UNIT_RADIUS,
  HERO_VISION_DAY, HERO_VISION_NIGHT, ACQUIRE_RANGE_MELEE, ACQUIRE_RANGE_RANGED,
  buybackCost,
} from '../data/balance';
import type { HeroDef } from '../data/heroes/types';
import { Team } from './map';
import type { World, WorldSystem } from './world';
import { Unit, type UnitStats } from './unit';
import { recalcExtensions, recalcUnit } from './combat';

/** 当前属性值(基础+成长+黄点;装备/光环加成由 modifier 在 calc 上追加)。 */
export function heroAttributes(u: Unit): { str: number; agi: number; int: number } {
  const def = u.heroDef;
  if (!def) return { str: 0, agi: 0, int: 0 };
  const lv = u.level - 1;
  const bonus = (u.heroMeta?.statBonusLearned ?? 0) * STAT_BONUS_PER_LEVEL;
  return {
    str: def.baseStr + def.gainStr * lv + bonus + u.bonusAttr.str,
    agi: def.baseAgi + def.gainAgi * lv + bonus + u.bonusAttr.agi,
    int: def.baseInt + def.gainInt * lv + bonus + u.bonusAttr.int,
  };
}

/** 英雄面板重算扩展:在 base 镜像后叠属性。 */
function heroRecalc(u: Unit): void {
  if (!u.heroDef) return;
  const { str, agi, int } = heroAttributes(u);
  const c = u.calc;
  c.maxHp += str * HP_PER_STR;
  c.hpRegen += str * HP_REGEN_PER_STR;
  c.maxMp += int * MP_PER_INT;
  c.mpRegen += int * MP_REGEN_PER_INT;
  c.armor += agi * ARMOR_PER_AGI;
  c.ias += agi * IAS_PER_AGI;
  const primary = u.heroDef.primary === 'str' ? str : u.heroDef.primary === 'agi' ? agi : int;
  c.dmgMin += primary;
  c.dmgMax += primary;
}
recalcExtensions.push(heroRecalc);

export function heroBaseStats(def: HeroDef): UnitStats {
  return {
    maxHp: BASE_HP, hpRegen: BASE_HP_REGEN,
    maxMp: BASE_MP, mpRegen: BASE_MP_REGEN,
    dmgMin: def.baseDamage[0], dmgMax: def.baseDamage[1],
    attackType: 'hero', armorType: 'hero',
    armor: def.baseArmor, magicResist: HERO_BASE_MAGIC_RESIST,
    attackRange: def.attackRange, attackPoint: def.attackPoint,
    bat: def.bat, projectileSpeed: def.projectileSpeed,
    moveSpeed: def.baseMs, collisionRadius: UNIT_RADIUS.hero,
    visionDay: HERO_VISION_DAY, visionNight: HERO_VISION_NIGHT,
    acquireRange: def.attackRange > 200 ? ACQUIRE_RANGE_RANGED : ACQUIRE_RANGE_MELEE,
    bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
}

export function spawnHero(w: World, def: HeroDef, team: Team, pos?: { x: number; y: number }): Unit {
  const fountain = [...w.units.values()].find((b) => b.buildingKind === 'fountain' && b.team === team);
  const at = pos ?? (fountain ? V.add(fountain.pos, { x: team === Team.Dawn ? 250 : -250, y: team === Team.Dawn ? -250 : 250 }) : { x: 7520, y: 7520 });
  const u = w.spawnUnit({
    kind: 'hero', team,
    pos: w.map.nearestWalkable(at),
    name: def.name,
    stats: heroBaseStats(def),
  });
  u.heroDef = def;
  u.abilities = def.abilities.map((a) => ({ key: a.key, level: 0, cooldownUntil: -Infinity }));
  recalcUnit(u); // 属性折算后再设满状态
  u.hp = u.calc.maxHp;
  u.mp = u.calc.maxMp;
  return u;
}

/** 英雄复活系统(买活在 M3/M4 完善,此处处理自然复活)。 */
export function installHeroRespawn(w: World): void {
  const system: WorldSystem = (world) => {
    for (const u of world.units.values()) {
      if (!u.isHero() || u.alive || !u.heroMeta) continue;
      if (world.time >= u.heroMeta.respawnAt) {
        reviveHero(world, u);
      }
    }
  };
  w.systems.push(system);
}

/** 买活:支付金币立即在泉水复活。 */
export function tryBuyback(w: World, u: Unit): boolean {
  if (u.alive || !u.heroMeta) return false;
  const cost = buybackCost(u.level);
  if (u.heroMeta.gold < cost) return false;
  u.heroMeta.gold -= cost;
  reviveHero(w, u);
  return true;
}

export function reviveHero(w: World, u: Unit): void {
  // 不灭之盾:原地复活
  if (u.aegisRevivePos) {
    const at = w.map.nearestWalkable(u.aegisRevivePos);
    u.aegisRevivePos = undefined;
    u.alive = true;
    u.pos = at;
    u.prevPos = V.clone(at);
    recalcUnit(u);
    u.hp = u.calc.maxHp;
    u.mp = u.calc.maxMp;
    u.order = null;
    u.path = [];
    u.pathGoal = null;
    w.emit({ kind: 'fx', fx: 'aegis_revive', pos: V.clone(at), radius: 160 });
    return;
  }
  const fountain = [...w.units.values()].find((b) => b.buildingKind === 'fountain' && b.team === u.team);
  u.alive = true;
  u.pos = w.map.nearestWalkable(
    fountain ? V.add(fountain.pos, { x: u.team === Team.Dawn ? 250 : -250, y: u.team === Team.Dawn ? -250 : 250 }) : { x: 7520, y: 7520 },
  );
  u.prevPos = V.clone(u.pos);
  recalcUnit(u); // 死亡期间面板可能变化(等级/装备),复活前重算
  u.hp = u.calc.maxHp;
  u.mp = u.calc.maxMp;
  u.order = null;
  u.path = [];
  u.pathGoal = null;
}
