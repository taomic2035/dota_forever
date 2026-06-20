import type { ItemLogisticsActionModel } from './itemLogisticsModel';
import type { MapMechanicsChip, MapMechanicsModel, MapMechanicsRadarEntry } from './mapMechanicsModel';
import type { QuickbuyModel } from './quickbuyModel';

export type TutorialCoachTone = 'map' | 'objective' | 'combat' | 'logistics' | 'warning';

export interface TutorialCoachInput {
  enabled?: boolean;
  heroAlive: boolean;
  map?: MapMechanicsModel;
  itemPrimaryAction?: ItemLogisticsActionModel;
  backpackDelayDetail?: string;
  quickbuy?: QuickbuyModel | null;
}

export interface TutorialCoachModel {
  visible: boolean;
  key: string;
  label: string;
  detail: string;
  action: string;
  tone: TutorialCoachTone;
}

const HIDDEN_COACH: TutorialCoachModel = {
  visible: false,
  key: 'hidden',
  label: '',
  detail: '',
  action: '',
  tone: 'map',
};

export function buildTutorialCoachModel(input: TutorialCoachInput): TutorialCoachModel {
  if (input.enabled === false || !input.heroAlive) return HIDDEN_COACH;

  const backpackDelay = backpackDelayCoach(input.backpackDelayDetail);
  if (backpackDelay) return backpackDelay;

  const item = itemLogisticsCoach(input.itemPrimaryAction);
  if (item) return item;

  const quickbuy = quickbuyCoach(input.quickbuy);
  if (quickbuy) return quickbuy;

  const map = input.map;
  if (!map) return HIDDEN_COACH;

  const forest = radar(map, 'forest');
  if (forest) {
    return {
      visible: true,
      key: 'forest-entrance',
      label: '树林入口可走',
      detail: '树墙仍会挡路;贴绿色入口进树林可绕视野/迷雾',
      action: `跟随 MAP ${forest.label}标记`,
      tone: 'map',
    };
  }

  const miss = chip(map, 'miss');
  if (miss?.tone === 'warning') {
    return {
      visible: true,
      key: 'miss-evasion',
      label: 'MISS 不是 bug',
      detail: miss.title,
      action: '开必中/换目标/站上高地',
      tone: 'combat',
    };
  }

  const camp = radar(map, 'camp');
  if (camp?.tone === 'ready') {
    return {
      visible: true,
      key: 'neutral-camp',
      label: '野怪营已刷新',
      detail: camp.title,
      action: '跟随 MAP 野怪营标记去清野/拉野',
      tone: 'objective',
    };
  }

  const highground = radar(map, 'highground');
  if (highground?.tone === 'warning' || highground?.tone === 'highground') {
    return {
      visible: true,
      key: 'highground',
      label: '高地影响视野',
      detail: highground.title,
      action: '沿坡道上高地再开战',
      tone: 'warning',
    };
  }

  const rune = radar(map, 'rune');
  if (rune?.tone === 'info') {
    return {
      visible: true,
      key: 'river-rune',
      label: '河道神符可控',
      detail: rune.title,
      action: '去河道拾取或装瓶',
      tone: 'objective',
    };
  }

  return HIDDEN_COACH;
}

function backpackDelayCoach(detail?: string): TutorialCoachModel | undefined {
  if (!detail) return undefined;
  return {
    visible: true,
    key: 'backpack-delay',
    label: '背包延迟',
    detail,
    action: '等待倒计时结束再使用',
    tone: 'logistics',
  };
}

function itemLogisticsCoach(action?: ItemLogisticsActionModel): TutorialCoachModel | undefined {
  if (!action?.visible) return undefined;
  return {
    visible: true,
    key: 'item-logistics',
    label: action.label,
    detail: action.detail,
    action: '处理物品路线',
    tone: 'logistics',
  };
}

function quickbuyCoach(quickbuy?: QuickbuyModel | null): TutorialCoachModel | undefined {
  if (!quickbuy?.active || !quickbuy.ready) return undefined;
  return {
    visible: true,
    key: 'quickbuy-ready',
    label: 'Quickbuy 够钱',
    detail: `${quickbuy.queueLabel || quickbuy.label} 已可购买`,
    action: '打开商店或点击快速购买',
    tone: 'logistics',
  };
}

function chip(model: MapMechanicsModel, key: MapMechanicsChip['key']): MapMechanicsChip | undefined {
  return model.chips.find((entry) => entry.key === key);
}

function radar(model: MapMechanicsModel, key: MapMechanicsRadarEntry['key']): MapMechanicsRadarEntry | undefined {
  return model.radar.find((entry) => entry.key === key);
}
