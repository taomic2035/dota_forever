export type ShopReminderTone = 'ready' | 'busy' | 'blocked';

export interface ShopReminder {
  tone: ShopReminderTone;
  headline: string;
  detail: string;
  actionHint: string;
}

export interface ShopReminderModel {
  visible: boolean;
  reminders: ShopReminder[];
}

interface ReminderQuickbuy {
  active: boolean;
  ready: boolean;
  label: string;
  deficit: number;
  glyph?: string;
}

interface ReminderAction {
  visible: boolean;
  label: string;
  detail: string;
}

interface ReminderKeyedAction extends ReminderAction {
  parentItemKey?: string | null;
  itemKey: string | null;
}

interface ReminderBatchAction extends ReminderAction {
  parentItemKey?: string | null;
  itemKeys: string[];
}

interface ReminderStashAction extends ReminderAction {
  enabled: boolean;
  tone?: string;
}

interface ReminderAccess {
  tone: 'home' | 'side' | 'secret' | 'away';
  detail: string;
}

interface ReminderCourier {
  status: 'missing' | 'dead' | 'ready' | 'delivering' | 'returning';
  detail: string;
  actionLabel: string;
  primaryAction: 'select' | 'deliver' | 'none';
  tone: 'muted' | 'danger' | 'ready' | 'busy';
}

export function buildShopReminderModel(input: {
  access: ReminderAccess;
  quickbuy: ReminderQuickbuy;
  stashAction: ReminderStashAction;
  courier?: ReminderCourier;
  recipeBatchAction: ReminderBatchAction;
  recipeNextAction: ReminderKeyedAction;
  quickAction: ReminderKeyedAction;
}): ShopReminderModel {
  const reminders: ShopReminder[] = [];

  if (input.quickbuy.active) {
    reminders.push(input.quickbuy.ready
      ? {
        tone: 'ready',
        headline: '快速购买已就绪',
        detail: `${input.quickbuy.label} 可买齐`,
        actionHint: '点击快速购买',
      }
      : {
        tone: 'busy',
        headline: '快速购买目标',
        detail: `${input.quickbuy.label} 还差 ${input.quickbuy.deficit} 金`,
        actionHint: '继续补刀/打钱',
      });
  }

  const courierReminder = courierStashReminder(input.stashAction, input.courier);
  if (courierReminder) reminders.push(courierReminder);

  if (input.stashAction.visible && input.stashAction.enabled) {
    reminders.push({
      tone: 'ready',
      headline: '储藏可取回',
      detail: input.stashAction.detail,
      actionHint: '点击取回全部',
    });
  }

  if (input.recipeBatchAction.visible && input.recipeBatchAction.itemKeys.length > 0) {
    reminders.push({
      tone: 'ready',
      headline: '合成组件可补',
      detail: input.recipeBatchAction.detail,
      actionHint: 'Ctrl+Enter',
    });
  }

  if (input.recipeNextAction.visible && input.recipeNextAction.itemKey) {
    reminders.push({
      tone: 'ready',
      headline: '下一件合成组件',
      detail: input.recipeNextAction.detail,
      actionHint: 'Shift+Enter',
    });
  }

  if (input.quickAction.visible) {
    reminders.push(input.quickAction.itemKey
      ? {
        tone: 'ready',
        headline: '可直接购买',
        detail: input.quickAction.detail,
        actionHint: 'Enter',
      }
      : {
        tone: 'blocked',
        headline: '当前不能购买',
        detail: input.quickAction.detail,
        actionHint: '移动到对应商店或补金币',
      });
  }

  if (input.access.tone === 'away') {
    reminders.push({
      tone: 'blocked',
      headline: '商店距离不足',
      detail: input.access.detail,
      actionHint: '回到泉水/边路/秘密商店',
    });
  }

  return {
    visible: reminders.length > 0,
    reminders: reminders.slice(0, 3),
  };
}

function courierStashReminder(
  stashAction: ReminderStashAction,
  courier: ReminderCourier | undefined,
): ShopReminder | null {
  if (!stashAction.visible || stashAction.enabled || !courier) return null;
  if (courier.primaryAction === 'deliver') {
    return {
      tone: 'ready',
      headline: '信使可派送',
      detail: courier.detail,
      actionHint: courier.actionLabel,
    };
  }
  if (courier.status === 'delivering') {
    return {
      tone: 'busy',
      headline: '信使配送中',
      detail: courier.detail,
      actionHint: courier.actionLabel,
    };
  }
  if (courier.status === 'dead' || courier.status === 'missing') {
    return {
      tone: 'blocked',
      headline: '信使暂不可用',
      detail: courier.detail,
      actionHint: courier.actionLabel,
    };
  }
  return null;
}
