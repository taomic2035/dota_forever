/**
 * 世界装配:按规范顺序安装各子系统。
 * 顺序:重算 → (AI/兵线等,后续里程碑插入) → 指令/战斗 → 弹道 → 清理。
 */
import { GameMap } from './map';
import { World } from './world';
import { recalcSystem, ordersSystem, projectileSystem, cleanupSystem } from './combat';
import { spawnBuildings, buildingsSystem } from './buildings';

export interface WorldOptions {
  seed: number;
  startTime?: number;
  /** 不生成建筑(纯战斗单测用) */
  noBuildings?: boolean;
}

export function createWorld(map: GameMap, opts: WorldOptions): World {
  const w = new World(map, opts.seed, opts.startTime);
  w.systems.push(recalcSystem);
  // 占位插槽:后续兵线/经济/AI/视野按各自 install 函数插入
  w.systems.push(ordersSystem);
  w.systems.push(projectileSystem);
  w.systems.push(buildingsSystem);
  w.systems.push(cleanupSystem);
  if (!opts.noBuildings) spawnBuildings(w);
  return w;
}
