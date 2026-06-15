/**
 * 深渊领主:河道巢穴 Boss。随时间成长;击杀者获得「不灭之盾」(死亡 5 秒后原地复活,一次性)。
 * 死亡后 8–11 分钟随机复活。
 */
import { V } from '../core/vec2';
import {
  PITLORD_BASE, PITLORD_GROWTH_INTERVAL, PITLORD_GROWTH,
  PITLORD_BOUNTY, PITLORD_RESPAWN, AEGIS_REVIVE_DELAY,
} from '../data/balance';
import { ITEMS, ITEM_BY_KEY, type ItemDef } from '../data/items';
import { Team } from './map';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';
import { makeItem, afterInventoryChange } from './items';

// 注册不灭之盾(不可购买:cost 0,商店过滤)
const AEGIS: ItemDef = {
  key: 'aegis', name: '不灭之盾', cost: 0, category: 'consumable',
  description: '持有者死亡后 5 秒原地满状态复活,随后盾消失。击败深渊领主获得。',
};
if (!ITEM_BY_KEY.has('aegis')) {
  ITEMS.push(AEGIS);
  ITEM_BY_KEY.set('aegis', AEGIS);
}

function spawnBoss(w: World, growths: number): Unit {
  const u = w.spawnUnit({
    kind: 'boss',
    team: Team.Neutral,
    pos: w.map.nearestWalkable(w.map.pitPos),
    name: '深渊领主',
    stats: {
      maxHp: PITLORD_BASE.hp + growths * PITLORD_GROWTH.hp,
      hpRegen: 12,
      maxMp: 0, mpRegen: 0,
      dmgMin: PITLORD_BASE.dmg[0] + growths * PITLORD_GROWTH.dmg,
      dmgMax: PITLORD_BASE.dmg[1] + growths * PITLORD_GROWTH.dmg,
      attackType: 'normal', armorType: 'hero',
      armor: PITLORD_BASE.armor + growths * PITLORD_GROWTH.armor,
      magicResist: 0.55, // 经典 Roshan 魔抗 55%
      attackRange: PITLORD_BASE.range, attackPoint: 0.4, bat: PITLORD_BASE.bat,
      projectileSpeed: 0,
      moveSpeed: PITLORD_BASE.ms, collisionRadius: 44,
      visionDay: 1000, visionNight: 1000,
      acquireRange: 400,
      bountyMin: PITLORD_BOUNTY.gold[0], bountyMax: PITLORD_BOUNTY.gold[1],
      xpBounty: PITLORD_BOUNTY.killerXp,
    },
  });
  u.homePos = V.clone(w.map.pitPos);
  return u;
}

export function installPitlord(w: World): void {
  w.bossRespawnAt = Math.max(0, w.time); // 0:00 出生(world.bossId 默认 0)
  let nextGrowth = PITLORD_GROWTH_INTERVAL;

  const system: WorldSystem = (world) => {
    const boss = world.getUnit(world.bossId);

    // 出生/复活
    if ((!boss || !boss.alive) && world.time >= world.bossRespawnAt && world.bossRespawnAt !== Infinity) {
      const growths = Math.floor(Math.max(0, world.time) / PITLORD_GROWTH_INTERVAL);
      world.bossId = spawnBoss(world, growths).id;
      world.bossRespawnAt = Infinity;
    }

    // 成长(对在世 Boss 直接强化)
    if (world.time >= nextGrowth) {
      nextGrowth += PITLORD_GROWTH_INTERVAL;
      const b = world.getUnit(world.bossId);
      if (b?.alive) {
        b.base.maxHp += PITLORD_GROWTH.hp;
        b.hp += PITLORD_GROWTH.hp;
        b.base.dmgMin += PITLORD_GROWTH.dmg;
        b.base.dmgMax += PITLORD_GROWTH.dmg;
        b.base.armor += PITLORD_GROWTH.armor;
      }
    }

    // 驻留(回巢满血)
    if (world.tick % 15 === 0) {
      const b = world.getUnit(world.bossId);
      if (b?.alive && b.homePos) {
        const distHome = V.dist(b.pos, b.homePos);
        const returning = b.order?.type === 'move';
        if (!returning && distHome > 700) {
          b.attackTargetId = 0;
          b.windupTargetId = 0;
          b.issueOrder({ type: 'move', pos: V.clone(b.homePos) });
        } else if (returning && distHome < 150) {
          b.order = null;
          b.hp = b.calc.maxHp;
        }
      }
    }

    // 死亡处理:掉盾 + 安排复活
    for (const e of world.events) {
      if (e.kind !== 'unit_died' || e.unitId !== world.bossId) continue;
      world.bossRespawnAt = world.time + world.rng.range(PITLORD_RESPAWN[0], PITLORD_RESPAWN[1]);
      const killer = world.getUnit(e.killerId);
      const byTeam = killer && killer.team !== Team.Neutral ? killer.team : Team.Dawn;
      world.emit({ kind: 'boss_killed', killerId: e.killerId, byTeam });
      // 盾给击杀者;背包满则给附近同队英雄
      const candidates: Unit[] = [];
      if (killer?.isHero()) candidates.push(killer);
      for (const h of world.queryRadius(e.pos, 1200, (x) => x.isHero() && x.team === byTeam)) {
        if (!candidates.includes(h)) candidates.push(h);
      }
      for (const h of candidates) {
        const slot = h.inventory.findIndex((s) => s === null);
        if (slot >= 0) {
          h.inventory[slot] = makeItem('aegis');
          afterInventoryChange(world, h);
          break;
        }
      }
    }

    // 不灭之盾复活:持盾英雄死亡 → 5 秒原地复活
    for (const e of world.events) {
      if (e.kind !== 'unit_died') continue;
      const victim = world.getUnit(e.unitId);
      if (!victim?.isHero() || !victim.heroMeta) continue;
      const slot = victim.inventory.findIndex((s) => s?.itemKey === 'aegis');
      if (slot < 0) continue;
      victim.inventory[slot] = null;
      afterInventoryChange(world, victim);
      victim.heroMeta.respawnAt = world.time + AEGIS_REVIVE_DELAY;
      victim.aegisRevivePos = V.clone(victim.pos);
    }
  };
  w.systems.push(system);
}
