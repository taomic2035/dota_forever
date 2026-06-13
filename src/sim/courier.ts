/**
 * 信使(courier):每队一只,自动把英雄储藏处(stash)的物品送达该英雄。
 * 经典 DotA1:信使是可被击杀的随身单位(给赏金,泉水重生)。本实现为自动投送,
 * 英雄在远离泉水时购买、物品落储藏 → 信使从泉水出发送达;途中可被敌方击杀。
 * 仅改单位移动/物品转移,不触碰战斗/技能数值。
 */
import { V } from '../core/vec2';
import { Team } from './map';
import { afterInventoryChange } from './items';
import type { World, WorldSystem } from './world';
import type { Unit, EntityId, UnitStats } from './unit';

const COURIER_RESPAWN = 35;      // 死亡后泉水重生延迟(秒)
const DELIVER_RANGE = 220;       // 抵达英雄的交付距离
const DISPATCH_MIN_DIST = 1500;  // 英雄离泉水超此距离才派信使(近泉水自取)
const COURIER_BOUNTY = 60;       // 击杀信使赏金

function courierStats(): UnitStats {
  return {
    maxHp: 300, hpRegen: 3, maxMp: 0, mpRegen: 0,
    dmgMin: 0, dmgMax: 0, attackType: 'normal', armorType: 'light',
    armor: 0, magicResist: 0, attackRange: 0, attackPoint: 0,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 380, collisionRadius: 16,
    visionDay: 800, visionNight: 500, acquireRange: 0,
    bountyMin: COURIER_BOUNTY, bountyMax: COURIER_BOUNTY, xpBounty: 0,
  };
}

function fountainPos(w: World, team: Team): { x: number; y: number } {
  const f = [...w.units.values()].find((u) => u.buildingKind === 'fountain' && u.team === team);
  return f ? V.clone(f.pos) : { x: 7520, y: 7520 };
}

function spawnCourier(w: World, team: Team): Unit {
  const base = fountainPos(w, team);
  return w.spawnUnit({
    kind: 'courier', team, pos: { x: base.x + 90, y: base.y + 90 },
    name: team === Team.Dawn ? '晨曦信使' : '永夜信使', stats: courierStats(),
  });
}

interface CourierRec { team: Team; id: EntityId; respawnAt: number; targetId: EntityId; }

export function installCourier(w: World): void {
  const recs: CourierRec[] = [];
  for (const team of [Team.Dawn, Team.Night]) {
    recs.push({ team, id: spawnCourier(w, team).id, respawnAt: -Infinity, targetId: 0 });
  }
  const system: WorldSystem = (world) => {
    if (world.tick % 5 !== 0) return; // 每 5 tick 调度
    for (const rec of recs) {
      const courier = world.getUnit(rec.id);
      // 死亡 → 计时,到点泉水重生
      if (!courier || !courier.alive) {
        if (rec.respawnAt === -Infinity) rec.respawnAt = world.time + COURIER_RESPAWN;
        else if (world.time >= rec.respawnAt) { rec.id = spawnCourier(world, rec.team).id; rec.respawnAt = -Infinity; rec.targetId = 0; }
        continue;
      }
      if (rec.targetId) {
        const hero = world.getUnit(rec.targetId);
        if (!hero || !hero.alive) { rec.targetId = 0; courier.order = { type: 'move', pos: fountainPos(world, rec.team) }; continue; }
        if (V.dist(courier.pos, hero.pos) <= DELIVER_RANGE) {
          deliverStash(world, hero);
          rec.targetId = 0;
          courier.order = { type: 'move', pos: fountainPos(world, rec.team) }; // 交付后返航
        } else {
          courier.order = { type: 'move', pos: V.clone(hero.pos) }; // 追送
        }
        continue;
      }
      // 空闲:派给有储藏物品 + 远离泉水的本队英雄
      const fount = fountainPos(world, rec.team);
      for (const u of world.units.values()) {
        if (u.kind !== 'hero' || u.team !== rec.team || !u.alive) continue;
        if (!u.stash.some((s) => s)) continue;
        if (V.dist(u.pos, fount) < DISPATCH_MIN_DIST) continue;
        rec.targetId = u.id;
        courier.order = { type: 'move', pos: V.clone(u.pos) };
        break;
      }
    }
  };
  w.systems.push(system);
}

/** 信使抵达后把英雄储藏物品送入物品栏(TP 归专属槽;满则进背包栏)。 */
function deliverStash(w: World, hero: Unit): void {
  let changed = false;
  for (let s = 0; s < hero.stash.length; s++) {
    const inst = hero.stash[s];
    if (!inst) continue;
    if (inst.itemKey === 'tp') { // TP 归专属槽(空则置入,有则叠充能)
      if (!hero.tpSlot) { hero.tpSlot = inst; hero.stash[s] = null; changed = true; continue; }
      if (hero.tpSlot.itemKey === 'tp') { hero.tpSlot.charges += inst.charges; hero.stash[s] = null; changed = true; continue; }
    }
    const inv = hero.inventory.findIndex((x) => x === null);
    if (inv >= 0) { hero.inventory[inv] = inst; hero.stash[s] = null; changed = true; continue; }
    const bp = hero.backpack.findIndex((x) => x === null);
    if (bp >= 0) { hero.backpack[bp] = inst; hero.stash[s] = null; changed = true; }
  }
  if (changed) afterInventoryChange(w, hero);
}
