import { describe, expect, it } from 'vitest';
import { buildMapMechanicsModel } from '../src/ui/mapMechanicsModel';

describe('buildMapMechanicsModel', () => {
  it('surfaces neutral camp and rune presence instead of hiding them behind the map', () => {
    const model = buildMapMechanicsModel({
      time: 46,
      totalCamps: 10,
      aliveCamps: 6,
      aliveNeutrals: 18,
      activeRunes: [
        { type: 'haste', pos: { x: 3600, y: 3600 } },
        { type: 'regen', pos: { x: 11440, y: 11440 } },
      ],
      heroHeight: 1,
      nearTreeWall: false,
      evasion: 0,
      trueStrike: false,
      uphillMissChance: 0.25,
    });

    expect(model.chips.find((chip) => chip.key === 'neutrals')).toMatchObject({
      label: '野怪',
      value: '6/10',
      tone: 'ready',
      title: '野区营地: 6/10 已刷新 · 野怪 18 · 下一次整分钟检查 14s',
    });
    expect(model.chips.find((chip) => chip.key === 'runes')).toMatchObject({
      label: '神符',
      value: '2枚',
      tone: 'info',
      title: '河道神符: 加速符文 / 恢复符文 · 下一波 1:14',
    });
  });

  it('makes high ground, tree-shadow zones, and miss/evasion readable', () => {
    const model = buildMapMechanicsModel({
      time: 122,
      totalCamps: 10,
      aliveCamps: 0,
      aliveNeutrals: 0,
      activeRunes: [],
      heroHeight: 2,
      nearTreeWall: true,
      insideForestPocket: true,
      evasion: 0.35,
      trueStrike: false,
      uphillMissChance: 0.25,
    });

    expect(model.chips.find((chip) => chip.key === 'height')).toMatchObject({
      label: '地形',
      value: '高地',
      tone: 'highground',
      title: '当前位置: 高地 · 低处攻击高处有 25% miss',
    });
    expect(model.chips.find((chip) => chip.key === 'forest')).toMatchObject({
      label: '树林',
      value: '林影',
      tone: 'forest',
      title: '已贴近树林阴影: 林影提供遮蔽读法,树墙仍阻挡直线路径',
    });
    expect(model.chips.find((chip) => chip.key === 'miss')).toMatchObject({
      label: 'MISS',
      value: '35%',
      tone: 'warning',
      title: '当前闪避 35% · 低打高额外 25% miss · 未启用必中',
    });
  });

  it('marks true strike as bypassing miss/evasion warnings', () => {
    const model = buildMapMechanicsModel({
      time: 0,
      totalCamps: 10,
      aliveCamps: 0,
      aliveNeutrals: 0,
      activeRunes: [],
      heroHeight: 0,
      nearTreeWall: false,
      evasion: 0.5,
      trueStrike: true,
      uphillMissChance: 0.25,
    });

    expect(model.chips.find((chip) => chip.key === 'height')).toMatchObject({
      value: '河道',
      title: '当前位置: 河道低地 · 河道看岸上受高低地视野限制',
    });
    expect(model.chips.find((chip) => chip.key === 'miss')).toMatchObject({
      value: '必中',
      tone: 'ready',
      title: '已启用必中: 无视闪避与低打高 miss',
    });
  });

  it('builds an actionable map-mechanics radar for camps, runes, high ground, and forest pockets', () => {
    const model = buildMapMechanicsModel({
      time: 18,
      totalCamps: 10,
      aliveCamps: 0,
      aliveNeutrals: 0,
      activeRunes: [{ type: 'bounty', pos: { x: 7600, y: 7600 } }],
      heroHeight: 1,
      nearTreeWall: true,
      evasion: 0,
      trueStrike: false,
      uphillMissChance: 0.25,
      nearestCamp: { tier: 'large', distance: 840, alive: false },
      nearestRune: { distance: 420, activeType: 'bounty' },
      nearestHighGround: { distance: 360, current: false },
      nearestForestPocket: { distance: 190, inside: false },
    });

    expect(model.radar.map((entry) => [entry.key, entry.label, entry.value])).toEqual([
      ['camp', '野怪营', '大营 840'],
      ['rune', '河道神符', '赏金符文 420'],
      ['highground', '高地', '坡道 360'],
      ['forest', '树林阴影', '树线 190'],
    ]);
    expect(model.radar.find((entry) => entry.key === 'camp')?.title).toContain('首刷倒计时 0:12');
    expect(model.radar.find((entry) => entry.key === 'highground')?.title).toContain('低打高 25% miss');
    expect(model.radar.find((entry) => entry.key === 'forest')?.title).toContain('沿现有野区入口靠近树线');
  });

  it('explains pre-spawn neutral camps as a timed objective instead of looking absent', () => {
    const model = buildMapMechanicsModel({
      time: 8,
      totalCamps: 10,
      aliveCamps: 0,
      aliveNeutrals: 0,
      activeRunes: [],
      heroHeight: 1,
      nearTreeWall: false,
      evasion: 0,
      trueStrike: false,
      uphillMissChance: 0.25,
      nearestCamp: { tier: 'small', distance: 520, alive: false },
      nearestRune: { distance: 780 },
    });

    expect(model.chips.find((chip) => chip.key === 'neutrals')).toMatchObject({
      value: '首刷',
      tone: 'warning',
      title: '野区营地: 0/10 已刷新 · 首刷 0:22 · 野怪 0',
    });
    expect(model.radar.find((entry) => entry.key === 'camp')).toMatchObject({
      label: '野怪营',
      value: '小营 520',
      title: '最近小营: 0:30 首刷倒计时 0:22 · 地面旗标/小地图字母常显,到点会刷出野怪',
    });
  });
});
