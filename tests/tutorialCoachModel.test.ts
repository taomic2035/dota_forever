import { describe, expect, it } from 'vitest';
import { buildTutorialCoachModel } from '../src/ui/tutorialCoachModel';

describe('buildTutorialCoachModel', () => {
  it('prioritizes explicit map mechanics when they are discoverable but easy to miss', () => {
    const model = buildTutorialCoachModel({
      enabled: true,
      heroAlive: true,
      map: {
        chips: [
          { key: 'neutrals', label: '野怪', value: '3/10', tone: 'ready', title: '野区营地: 3/10 已刷新 · 野怪 9 · 下一次整分钟检查 18s' },
          { key: 'runes', label: '神符', value: '0:42', tone: 'neutral', title: '河道神符: 当前无可见神符 · 下一波 0:42' },
          { key: 'height', label: '地形', value: '平地', tone: 'neutral', title: '当前位置: 平地 · 低打高有 25% miss' },
          { key: 'forest', label: '树林', value: '远', tone: 'neutral', title: '附近没有树墙' },
          { key: 'miss', label: 'MISS', value: '25%', tone: 'neutral', title: '当前闪避 0% · 低打高额外 25% miss · 未启用必中' },
        ],
        radar: [
          { key: 'camp', label: '野怪营', value: '大营 860', tone: 'ready', title: '最近大营: 已刷新 · 营地有地面旗标与小地图字母,靠近可拉野/清野' },
          { key: 'highground', label: '高地', value: '坡道 420', tone: 'warning', title: '最近高地/坡道: 420 · 低打高 25% miss,高低差会影响视野' },
        ],
      },
    });

    expect(model).toMatchObject({
      visible: true,
      key: 'neutral-camp',
      label: '野怪营已刷新',
      action: '跟随 MAP 野怪营标记去清野/拉野',
      tone: 'objective',
    });
  });

  it('calls out forest entrances before generic map reminders', () => {
    const model = buildTutorialCoachModel({
      heroAlive: true,
      map: {
        chips: [
          { key: 'forest', label: '树林', value: '入口', tone: 'forest', title: '附近有可走林间入口: 进入林影可绕视野,树墙仍阻挡直线路径' },
          { key: 'miss', label: 'MISS', value: '25%', tone: 'neutral', title: '当前闪避 0% · 低打高额外 25% miss · 未启用必中' },
        ],
        radar: [
          { key: 'forest', label: '树林入口', value: '可走 160', tone: 'forest', title: '最近可走进树林入口: 160 · 贴树林移动会形成绕视野/迷雾的遮挡感' },
          { key: 'camp', label: '野怪营', value: '小营 900', tone: 'neutral', title: '最近小营: 下次检查 30s' },
        ],
      },
    });

    expect(model).toMatchObject({
      visible: true,
      key: 'forest-entrance',
      label: '树林入口可走',
      detail: '树墙仍会挡路;贴绿色入口进树林可绕视野/迷雾',
      tone: 'map',
    });
  });

  it('explains miss and evasion when the combat chip becomes threatening', () => {
    const model = buildTutorialCoachModel({
      heroAlive: true,
      map: {
        chips: [
          { key: 'height', label: '地形', value: '高地', tone: 'highground', title: '当前位置: 高地 · 低处攻击高处有 25% miss' },
          { key: 'miss', label: 'MISS', value: '35%', tone: 'warning', title: '当前闪避 35% · 低打高额外 25% miss · 未启用必中' },
        ],
        radar: [],
      },
    });

    expect(model).toMatchObject({
      visible: true,
      key: 'miss-evasion',
      label: 'MISS 不是 bug',
      detail: '当前闪避 35% · 低打高额外 25% miss · 未启用必中',
      tone: 'combat',
    });
  });

  it('keeps item logistics ahead of passive map hints when a player action is available', () => {
    const model = buildTutorialCoachModel({
      heroAlive: true,
      itemPrimaryAction: {
        visible: true,
        id: 'deliver-stash',
        label: 'Deliver stash',
        detail: 'Use courier delivery to bring stash items to your hero',
        tone: 'ready',
      },
      map: {
        chips: [
          { key: 'runes', label: '神符', value: '1枚', tone: 'info', title: '河道神符: 加速符文 · 下一波 1:55' },
        ],
        radar: [
          { key: 'rune', label: '河道神符', value: '加速符文 500', tone: 'info', title: '河道有加速符文: 靠近自动拾取/装瓶 · 下一波 1:55' },
        ],
      },
    });

    expect(model).toMatchObject({
      visible: true,
      key: 'item-logistics',
      label: 'Deliver stash',
      action: '处理物品路线',
      tone: 'logistics',
    });
  });

  it('stays hidden when disabled, dead, or there is nothing actionable to teach', () => {
    expect(buildTutorialCoachModel({ enabled: false, heroAlive: true }).visible).toBe(false);
    expect(buildTutorialCoachModel({ heroAlive: false }).visible).toBe(false);
    expect(buildTutorialCoachModel({ heroAlive: true, map: { chips: [], radar: [] } }).visible).toBe(false);
  });
});
