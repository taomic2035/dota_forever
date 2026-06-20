import { describe, it, expect } from 'vitest';
import { buildEnemyHeroBar, type EnemyHeroBarInputHero } from '../src/ui/enemyHeroBarModel';

function h(over: Partial<EnemyHeroBarInputHero> = {}): EnemyHeroBarInputHero {
  return {
    id: 1, name: '敌A', glyph: '⚔', color: '#f00', level: 5,
    alive: true, visible: true, hp: 800, maxHp: 1000, mp: 200, maxMp: 400, respawnAt: 0,
    ally: false,
    ...over,
  };
}

describe('buildEnemyHeroBar', () => {
  it('存活且可见 → 显示血蓝比例', () => {
    const [c] = buildEnemyHeroBar([h({ hp: 600, maxHp: 1000, mp: 100, maxMp: 400 })], 0);
    expect(c.alive).toBe(true);
    expect(c.showBars).toBe(true);
    expect(c.hpFrac).toBeCloseTo(0.6);
    expect(c.mpFrac).toBeCloseTo(0.25);
    expect(c.respawnIn).toBe(0);
    // Alt 精确数值:整数血/蓝(DotA 击杀计算)
    expect(c.hp).toBe(600);
    expect(c.maxHp).toBe(1000);
    expect(c.mp).toBe(100);
    expect(c.maxMp).toBe(400);
    expect(c.statusBroadcast).toBe('敌A: 已露面 · 生命 600/1000 (60%) · 法力 100/400 (25%)');
  });

  it('Alt 精确数值四舍五入为整数', () => {
    const [c] = buildEnemyHeroBar([h({ hp: 599.7, mp: 100.4 })], 0);
    expect(c.hp).toBe(600);
    expect(c.mp).toBe(100);
  });

  it('迷雾中(不可见)→ 不泄露实时血量(showBars=false)', () => {
    const [c] = buildEnemyHeroBar([h({ visible: false })], 0);
    expect(c.showBars).toBe(false);
    expect(c.level).toBe(5); // 等级仍公开
    expect(c.statusBroadcast).toBe('敌A: missing / 迷雾中');
  });

  it('死亡 → 复活倒计时(向上取整),不显血蓝', () => {
    const [c] = buildEnemyHeroBar([h({ alive: false, respawnAt: 12.3, visible: true })], 5);
    expect(c.alive).toBe(false);
    expect(c.showBars).toBe(false);
    expect(c.respawnIn).toBe(8); // ceil(12.3 - 5)
    expect(c.statusBroadcast).toBe('敌A: 已死亡 · 复活 8s');
  });

  it('友军状态广播可报告资源,但死亡时只报告复活', () => {
    const [alive] = buildEnemyHeroBar([h({ ally: true, name: '队友', hp: 700, maxHp: 1000, mp: 250, maxMp: 500 })], 0);
    expect(alive.statusBroadcast).toBe('队友: 生命 700/1000 (70%) · 法力 250/500 (50%)');

    const [dead] = buildEnemyHeroBar([h({ ally: true, name: '队友', alive: false, respawnAt: 20 })], 5);
    expect(dead.statusBroadcast).toBe('队友: 已死亡 · 复活 15s');
  });

  it('友军状态广播附带 TP 和大招就绪状态', () => {
    const [ready] = buildEnemyHeroBar([
      h({
        ally: true,
        name: '队友',
        hp: 700,
        maxHp: 1000,
        mp: 250,
        maxMp: 500,
        tpScrolls: 2,
        ultimate: { name: '神圣庇护', learned: true, ready: true },
      }),
    ], 10);

    expect(ready.statusBroadcast).toBe('队友: 生命 700/1000 (70%) · 法力 250/500 (50%) · TP x2 · 大招 神圣庇护 ready');

    const [cooling] = buildEnemyHeroBar([
      h({
        ally: true,
        name: '队友',
        tpScrolls: 0,
        ultimate: { name: '神圣庇护', learned: true, ready: false, cooldownRemaining: 34.2 },
      }),
    ], 10);

    expect(cooling.statusBroadcast).toContain('TP none');
    expect(cooling.statusBroadcast).toContain('大招 神圣庇护 35s');
  });

  it('友军状态广播附带买活状态', () => {
    const [ready] = buildEnemyHeroBar([
      h({
        ally: true,
        name: '队友',
        buyback: { gold: 1200, cost: 800, cooldownRemaining: 0 },
      }),
    ], 10);

    expect(ready.statusBroadcast).toContain('买活 ready');

    const [shortGold] = buildEnemyHeroBar([
      h({
        ally: true,
        name: '队友',
        buyback: { gold: 500, cost: 800, cooldownRemaining: 0 },
      }),
    ], 10);

    expect(shortGold.statusBroadcast).toContain('买活差 300金');

    const [cooling] = buildEnemyHeroBar([
      h({
        ally: true,
        name: '队友',
        buyback: { gold: 1200, cost: 800, cooldownRemaining: 42.1 },
      }),
    ], 10);

    expect(cooling.statusBroadcast).toContain('买活 43s');
  });

  it('敌方状态广播不泄露买活经济信息', () => {
    const [enemy] = buildEnemyHeroBar([
      h({
        ally: false,
        visible: true,
        buyback: { gold: 1200, cost: 800, cooldownRemaining: 0 },
      }),
    ], 10);

    expect(enemy.statusBroadcast).not.toContain('买活');
  });

  it('死亡复活倒计时不为负', () => {
    const [c] = buildEnemyHeroBar([h({ alive: false, respawnAt: 3, visible: true })], 10);
    expect(c.respawnIn).toBe(0);
  });

  it('血蓝比例钳制在 0..1', () => {
    const [c] = buildEnemyHeroBar([h({ hp: 1200, maxHp: 1000, mp: -5, maxMp: 400 })], 0);
    expect(c.hpFrac).toBe(1);
    expect(c.mpFrac).toBe(0);
  });

  it('保持输入顺序与基本字段透传', () => {
    const bar = buildEnemyHeroBar([h({ id: 7, name: '冰女', color: '#0cf', level: 9 }), h({ id: 8, name: '火枪', level: 3 })], 0);
    expect(bar.map((c) => c.id)).toEqual([7, 8]);
    expect(bar[0].name).toBe('冰女');
    expect(bar[0].color).toBe('#0cf');
    expect(bar[0].level).toBe(9);
  });
});
