import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { castScan, scanReady, SCAN_COOLDOWN, SCAN_DURATION } from '../src/sim/scan';
import { isVisibleTo } from '../src/sim/vision';

const map = new GameMap();

describe('扫描', () => {
  it('施放扫描:生成短时隐身视野源 + 进入队伍冷却', () => {
    const w = createWorld(map, { seed: 9, startTime: 300 });
    const pos = { x: 7000, y: 8000 };
    expect(scanReady(w, Team.Dawn)).toBe(true);
    const ok = castScan(w, Team.Dawn, pos);
    expect(ok).toBe(true);
    const eye = [...w.units.values()].find((u) => u.kind === 'ward' && u.name === '扫描');
    expect(eye).toBeTruthy();
    expect(eye!.team).toBe(Team.Dawn);
    expect(scanReady(w, Team.Dawn)).toBe(false); // 进入冷却
  });

  it('冷却中再次施放 → 失败', () => {
    const w = createWorld(map, { seed: 9, startTime: 300 });
    expect(castScan(w, Team.Dawn, { x: 7000, y: 8000 })).toBe(true);
    expect(castScan(w, Team.Dawn, { x: 7100, y: 8000 })).toBe(false);
    // 另一队独立冷却
    expect(scanReady(w, Team.Night)).toBe(true);
  });

  it('冷却到期后重新就绪', () => {
    const w = createWorld(map, { seed: 9, startTime: 300 });
    castScan(w, Team.Dawn, { x: 7000, y: 8000 });
    w.scanReadyAt[Team.Dawn] = w.time - 1; // 模拟冷却已过
    expect(scanReady(w, Team.Dawn)).toBe(true);
  });

  it('扫描视野源对自队不可见时长内揭示(隐身,敌方需真视)', () => {
    const w = createWorld(map, { seed: 9, startTime: 300 });
    castScan(w, Team.Dawn, { x: 7000, y: 8000 });
    const eye = [...w.units.values()].find((u) => u.kind === 'ward' && u.name === '扫描')!;
    // 自队可见(同队恒真),敌方不可见(隐身、无真视)
    expect(isVisibleTo(w, Team.Dawn, eye)).toBe(true);
    expect(isVisibleTo(w, Team.Night, eye)).toBe(false);
    expect(SCAN_DURATION).toBeGreaterThan(0);
    expect(SCAN_COOLDOWN).toBeGreaterThan(SCAN_DURATION);
  });
});
