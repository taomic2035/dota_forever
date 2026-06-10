/**
 * 世界装配:按规范顺序安装各子系统。
 * 顺序:重算 → (AI/兵线等,后续里程碑插入) → 指令/战斗 → 弹道 → 清理。
 */
import { GameMap } from './map';
import { World } from './world';
import { recalcSystem, ordersSystem, projectileSystem, cleanupSystem } from './combat';
import { spawnBuildings, buildingsSystem } from './buildings';
import { installCreeps } from './creeps';
import { installEconomy } from './economy';
import { installModifiers } from './modifiers';
import { installHeroRespawn } from './hero';
import { installVision } from './vision';
import { installItems } from './items';
import { installRunes } from './runes';
import { installNeutrals } from './neutrals';
import { installPitlord } from './pitlord';
import { installDayNight } from './daynight';

export interface WorldOptions {
  seed: number;
  startTime?: number;
  /** 不生成建筑(纯战斗单测用) */
  noBuildings?: boolean;
  /** 启用兵线 */
  creeps?: boolean;
}

export function createWorld(map: GameMap, opts: WorldOptions): World {
  const w = new World(map, opts.seed, opts.startTime);
  w.systems.push(recalcSystem);
  installModifiers(w); // 紧随重算
  // installXxx 系列用 splice(1) 插在重算之后、指令之前
  w.systems.push(ordersSystem);
  w.systems.push(projectileSystem);
  w.systems.push(buildingsSystem);
  w.systems.push(cleanupSystem);
  if (!opts.noBuildings) spawnBuildings(w);
  if (opts.creeps) installCreeps(w);
  installEconomy(w);
  installHeroRespawn(w);
  installVision(w);
  installItems(w);
  installRunes(w);
  installDayNight(w);
  if (opts.creeps) {
    installNeutrals(w); // 与兵线一起代表“真实对局”
    installPitlord(w);
  }
  return w;
}
