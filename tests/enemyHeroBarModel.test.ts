import { describe, it, expect } from 'vitest';
import { buildEnemyHeroBar, type EnemyHeroBarInputHero } from '../src/ui/enemyHeroBarModel';

function h(over: Partial<EnemyHeroBarInputHero> = {}): EnemyHeroBarInputHero {
  return {
    id: 1, name: '敌A', glyph: '⚔', color: '#f00', level: 5,
    alive: true, visible: true, hp: 800, maxHp: 1000, mp: 200, maxMp: 400, respawnAt: 0,
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
  });

  it('迷雾中(不可见)→ 不泄露实时血量(showBars=false)', () => {
    const [c] = buildEnemyHeroBar([h({ visible: false })], 0);
    expect(c.showBars).toBe(false);
    expect(c.level).toBe(5); // 等级仍公开
  });

  it('死亡 → 复活倒计时(向上取整),不显血蓝', () => {
    const [c] = buildEnemyHeroBar([h({ alive: false, respawnAt: 12.3, visible: true })], 5);
    expect(c.alive).toBe(false);
    expect(c.showBars).toBe(false);
    expect(c.respawnIn).toBe(8); // ceil(12.3 - 5)
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
