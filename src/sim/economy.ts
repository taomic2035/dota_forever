/**
 * 经济与经验系统:工资、正补/反补、经验共享圈、升级、英雄击杀赏金、死亡掉金。
 */
import { V } from '../core/vec2';
import {
  PERIODIC_GOLD, PERIODIC_GOLD_INTERVAL, STARTING_GOLD,
  XP_TABLE, MAX_LEVEL, XP_SHARE_RADIUS, DENY_XP_FACTOR,
  heroKillBounty, deathGoldLoss, xpForKillLevel, ASSIST_RADIUS,
  TOWER_STATS, RAX_STATS, FIRST_BLOOD_BOUNTY, respawnTime,
} from '../data/balance';
import { Team } from './map';
import type { World, WorldSystem } from './world';
import type { Unit } from './unit';

/**
 * 加金。reliable=true 计入可靠金(工资/击杀/拆塔/Boss)——死亡不扣除。
 * 正补/野怪等为不可靠金(默认),死亡按死亡惩罚扣除。
 */
export function addGold(u: Unit, amount: number, reliable = false): void {
  if (!u.heroMeta) return;
  const m = u.heroMeta;
  m.gold = Math.max(0, Math.round(m.gold + amount));
  if (reliable && amount > 0) m.reliableGold += Math.round(amount);
  if (m.reliableGold > m.gold) m.reliableGold = m.gold; // 不超过总额
}

/** 消费金币(购物/买活):优先消耗不可靠金,可靠金随总额回钳。 */
export function spendGold(u: Unit, amount: number): void {
  if (!u.heroMeta) return;
  const m = u.heroMeta;
  m.gold = Math.max(0, m.gold - amount);
  if (m.reliableGold > m.gold) m.reliableGold = m.gold;
}

/** 死亡掉金:仅扣除不可靠金部分(可靠金不掉)。 */
export function loseGoldOnDeath(u: Unit, amount: number): void {
  if (!u.heroMeta) return;
  const m = u.heroMeta;
  const unreliable = m.gold - m.reliableGold;
  m.gold = Math.max(0, m.gold - Math.min(amount, unreliable));
}

/** 加经验并处理升级(死亡英雄不吃经验)。 */
export function addXp(w: World, u: Unit, amount: number): void {
  const m = u.heroMeta;
  if (!m || !u.alive || amount <= 0) return;
  m.xp += amount;
  while (u.level < MAX_LEVEL && m.xp >= XP_TABLE[u.level - 1]) {
    u.level++;
    m.skillPoints++;
    w.emit({ kind: 'hero_level', unitId: u.id, level: u.level });
  }
}

function enemyHeroesNear(w: World, pos: { x: number; y: number }, team: Team, radius: number): Unit[] {
  return [...w.units.values()].filter(
    (u) => u.isHero() && u.alive && u.team !== team && V.dist(u.pos, pos) <= radius,
  );
}

function heroesOnTeamNear(w: World, pos: { x: number; y: number }, team: Team, radius: number): Unit[] {
  return [...w.units.values()].filter(
    (u) => u.isHero() && u.alive && u.team === team && V.dist(u.pos, pos) <= radius,
  );
}

export function installEconomy(w: World): void {
  let nextPayday = Math.max(0, w.time) + PERIODIC_GOLD_INTERVAL;
  let firstBloodTaken = false; // 一血:整局首次英雄击杀给击杀方额外赏金

  const system: WorldSystem = (world) => {
    // 工资(比赛 0:00 起)
    if (world.time >= nextPayday) {
      nextPayday += PERIODIC_GOLD_INTERVAL;
      for (const u of world.units.values()) {
        if (u.isHero()) addGold(u, PERIODIC_GOLD, true); // 工资为可靠金
      }
    }

    // 死亡结算
    for (const e of world.events) {
      if (e.kind !== 'unit_died') continue;
      const victim = world.getUnit(e.unitId);
      if (!victim) continue;
      const killer = world.getUnit(e.killerId);

      if (victim.kind === 'creep' || victim.kind === 'neutral' || victim.kind === 'boss') {
        const jungle = victim.kind === 'neutral' || victim.kind === 'boss';
        // 中立/Boss 的 team 是 Neutral,没有「对方阵营」语义,不存在反补
        const denied = !jungle && killer !== undefined && killer.team === victim.team;
        // 经验圈:小兵给该兵的对方阵营;中立/Boss 给击杀方阵营
        const sharers = jungle
          ? (killer ? heroesOnTeamNear(world, victim.pos, killer.team, XP_SHARE_RADIUS) : [])
          : enemyHeroesNear(world, victim.pos, victim.team, XP_SHARE_RADIUS);
        const xpTotal = victim.base.xpBounty * (denied ? DENY_XP_FACTOR : 1);
        for (const h of sharers) addXp(world, h, xpTotal / Math.max(1, sharers.length));
        // 金币
        if (!denied && killer?.isHero() && killer.team !== victim.team) {
          const g = world.rng.int(victim.base.bountyMin, victim.base.bountyMax);
          addGold(killer, g, victim.kind === 'boss'); // Boss 赏金为可靠金;正补/野怪为不可靠
          killer.heroMeta!.lastHits++;
          world.emit({ kind: 'last_hit', unitId: killer.id, gold: g, pos: V.clone(victim.pos) });
        }
        if (denied && killer?.isHero()) {
          killer.heroMeta!.denies++;
          world.emit({ kind: 'last_hit', unitId: killer.id, gold: 0, pos: V.clone(victim.pos), deny: true });
        }
      } else if (victim.isHero()) {
        const vm = victim.heroMeta!;
        vm.deaths++;
        vm.respawnAt = world.time + respawnTime(victim.level);
        loseGoldOnDeath(victim, deathGoldLoss(victim.level)); // 仅扣不可靠金
        const xpShare = enemyHeroesNear(world, victim.pos, victim.team, XP_SHARE_RADIUS);
        for (const h of xpShare) addXp(world, h, xpForKillLevel(victim.level) / Math.max(1, xpShare.length));
        if (killer && killer.isHero() && killer.team !== victim.team) {
          const bounty = heroKillBounty(victim.level, vm.streak);
          addGold(killer, bounty, true); // 击杀赏金为可靠金
          if (!firstBloodTaken) { // 一血:额外 +200 可靠金 + 公告
            firstBloodTaken = true;
            addGold(killer, FIRST_BLOOD_BOUNTY, true);
            world.emit({ kind: 'first_blood', killerId: killer.id, victimId: victim.id });
          }
          killer.heroMeta!.kills++;
          killer.heroMeta!.streak++;
          for (const a of enemyHeroesNear(world, victim.pos, victim.team, ASSIST_RADIUS)) {
            if (a.id !== killer.id) a.heroMeta!.assists++;
          }
          world.emit({
            kind: 'hero_kill', killerId: killer.id, victimId: victim.id, bounty,
            streakText: streakText(killer.heroMeta!.streak, killer.name, victim.name),
          });
        } else {
          world.emit({ kind: 'hero_kill', killerId: e.killerId, victimId: victim.id, bounty: 0 });
        }
        vm.streak = 0;
      } else if (victim.kind === 'tower') {
        const tier = victim.buildingKind === 'tower1' ? 't1' : victim.buildingKind === 'tower2' ? 't2' : victim.buildingKind === 'tower3' ? 't3' : 't4';
        const ts = TOWER_STATS[tier];
        if (killer?.isHero() && killer.team !== victim.team) {
          addGold(killer, ts.bounty, true); // 拆塔赏金为可靠金
          world.emit({ kind: 'last_hit', unitId: killer.id, gold: ts.bounty, pos: V.clone(victim.pos) });
        }
        for (const h of world.units.values()) {
          if (h.isHero() && h.team !== victim.team) addGold(h, ts.teamGold, true); // 团队拆塔金为可靠金
        }
      } else if (victim.buildingKind === 'rax_melee' || victim.buildingKind === 'rax_ranged') {
        // 破营:除超级兵外,给击杀方全队固定团队金(经典 DotA1)
        const rg = victim.buildingKind === 'rax_melee' ? RAX_STATS.melee.teamGold : RAX_STATS.ranged.teamGold;
        for (const h of world.units.values()) {
          if (h.isHero() && h.team !== victim.team) addGold(h, rg, true);
        }
      }
    }
  };
  // 插在 cleanup 之前末尾即可(事件同 tick 可见)
  w.systems.push(system);
}

function streakText(streak: number, killer: string, victim: string): string {
  if (streak === 3) return `${killer} 正在大杀特杀!`;
  if (streak === 4) return `${killer} 主宰了比赛!`;
  if (streak === 5) return `${killer} 杀人如麻!`;
  if (streak === 6) return `${killer} 已经无人能挡!`;
  if (streak >= 7) return `${killer} 超越神迹!`;
  return `${killer} 击杀了 ${victim}`;
}

export { STARTING_GOLD };
