import { DEFAULT_CONTROL_SETTINGS, type ControlSettings } from '../engine/controlSettings';

export interface OnboardingTip {
  keys: string;
  text: string;
}

export interface OnboardingSection {
  title: string;
  items: OnboardingTip[];
}

export function buildOnboardingSections(settings: ControlSettings = DEFAULT_CONTROL_SETTINGS): OnboardingSection[] {
  const numberRowTip: OnboardingTip = settings.numberRowMode === 'controlGroups'
    ? { keys: '1-6 选控制组', text: '物品请点背包槽;Ctrl+数字重绑编队' }
    : { keys: '1-6 用物品', text: 'T 回城;Ctrl+数字仍可设控制组' };

  return [
    {
      title: '移动与战斗',
      items: [
        { keys: '右键', text: '移动/智能指令;右键敌人普通攻击' },
        { keys: 'A+左键', text: '攻击指定点,用于推进/反补判断' },
        { keys: 'S/H', text: '停止/原地守住;空格镜头回英雄' },
      ],
    },
    {
      title: '技能与物品',
      items: [
        { keys: 'QWER', text: '切 AUTO/开关被动;技能正常施放;点 + 学习' },
        { keys: '右键技能格', text: '切 AUTO/开关技能状态' },
        numberRowTip,
      ],
    },
    {
      title: '经济与物流',
      items: [
        { keys: 'F 商店', text: '买装备;Shift 点商品设 quickbuy,Ctr+Shift 追加队列' },
        { keys: '信使', text: 'F2 选择;商店/状态栏可一键配送物品' },
        { keys: '背包', text: '背包物品无属性;移入主格后 6 秒可用' },
      ],
    },
    {
      title: '地图与沟通',
      items: [
        { keys: 'Alt+左键', text: '世界/小地图普通 ping' },
        { keys: 'Alt+Ctrl/Shift', text: '危险/撤退 ping,带声音提示' },
        { keys: 'Alt+拖拽小地图', text: '画短时战术线;右键小地图移动' },
      ],
    },
    {
      title: '多单位与设置',
      items: [
        { keys: 'F1/F2/F3', text: '选英雄/信使/全部可控;F1 双击居中' },
        { keys: 'P 菜单', text: '改键、RTS Legacy、自动攻击、HUD 缩放' },
        { keys: '色盲友好', text: '可访问性调色与大 HUD 都在 P 菜单' },
      ],
    },
  ];
}
