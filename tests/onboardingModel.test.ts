import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTROL_SETTINGS, applyControlPreset } from '../src/engine/controlSettings';
import { buildOnboardingSections } from '../src/ui/onboardingModel';

function flattenedText(settings = DEFAULT_CONTROL_SETTINGS): string {
  return buildOnboardingSections(settings)
    .flatMap((section) => [section.title, ...section.items.map((item) => `${item.keys} ${item.text}`)])
    .join('\n');
}

describe('onboarding model', () => {
  it('covers the current Dota-style control surface in short grouped tips', () => {
    const sections = buildOnboardingSections(DEFAULT_CONTROL_SETTINGS);

    expect(sections.map((section) => section.title)).toEqual([
      '移动与战斗',
      '技能与物品',
      '经济与物流',
      '地图与沟通',
      '多单位与设置',
    ]);
    expect(sections.every((section) => section.items.length <= 3)).toBe(true);

    const text = flattenedText();
    expect(text).toContain('右键');
    expect(text).toContain('A+左键');
    expect(text).toContain('S/H');
    expect(text).toContain('QWER');
    expect(text).toContain('QWER 切 AUTO');
    expect(text).toContain('右键技能格');
    expect(text).toContain('AUTO');
    expect(text).toContain('1-6 用物品');
    expect(text).toContain('T 回城');
    expect(text).toContain('F 商店');
    expect(text).toContain('Shift 点商品');
    expect(text).toContain('信使');
    expect(text).toContain('背包');
    expect(text).toContain('6 秒');
    expect(text).toContain('Alt+左键');
    expect(text).toContain('Alt+Ctrl/Shift');
    expect(text).toContain('Alt+拖拽小地图');
    expect(text).toContain('小地图');
    expect(text).toContain('F1/F2/F3');
    expect(text).toContain('P 菜单');
    expect(text).toContain('RTS Legacy');
    expect(text).toContain('色盲友好');
  });

  it('explains number row control groups under the RTS legacy preset', () => {
    const legacy = applyControlPreset(DEFAULT_CONTROL_SETTINGS, 'legacy');
    const text = flattenedText(legacy);

    expect(text).toContain('1-6 选控制组');
    expect(text).toContain('物品请点背包槽');
    expect(text).not.toContain('1-6 用物品');
  });
});
