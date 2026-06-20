import type { ChatWheelPreset } from '../engine/controlSettings';

export type ChatWheelSlot = 'north' | 'northEast' | 'east' | 'southEast' | 'south' | 'southWest' | 'west' | 'northWest';

export interface ChatWheelCallInput {
  id: string;
  label: string;
  detail: string;
}

export interface ChatWheelCall {
  id: string;
  label: string;
  detail: string;
  slot: ChatWheelSlot;
  hotkey: string;
}

export interface ChatWheelModel {
  visible: boolean;
  calls: ChatWheelCall[];
}

const SLOTS: ChatWheelSlot[] = ['north', 'northEast', 'east', 'southEast', 'south', 'southWest', 'west', 'northWest'];
const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const DEFAULT_CALLS: ChatWheelCallInput[] = [
  { id: 'careful', label: '小心', detail: 'Play carefully' },
  { id: 'retreat', label: '撤退', detail: 'Back away' },
  { id: 'attack', label: '进攻', detail: 'Attack now' },
  { id: 'group', label: '集合', detail: 'Group up' },
  { id: 'on-my-way', label: '正在路上', detail: 'On my way' },
  { id: 'need-help', label: '需要支援', detail: 'Need help' },
  { id: 'missing', label: '敌人消失', detail: 'Enemy missing' },
  { id: 'ward', label: '做视野', detail: 'Place or protect vision' },
];

const PRESET_CALLS: Record<ChatWheelPreset, ChatWheelCallInput[]> = {
  balanced: DEFAULT_CALLS,
  objective: [
    { id: 'rune', label: '控符', detail: 'Move to rune timing' },
    { id: 'smoke', label: '开雾', detail: 'Group for smoke play' },
    { id: 'boss', label: '打Boss', detail: 'Move to boss pit' },
    { id: 'push', label: '推塔', detail: 'Push tower now' },
    { id: 'defend-highground', label: '守高', detail: 'Defend high ground' },
    { id: 'outpost', label: '抢前哨', detail: 'Contest outpost' },
    { id: 'split-push', label: '带线', detail: 'Push side lane' },
    { id: 'teamfight', label: '集合打团', detail: 'Group for team fight' },
  ],
  defensive: [
    { id: 'retreat', label: '撤退', detail: 'Back away' },
    { id: 'defend-tower', label: '守塔', detail: 'Defend tower' },
    { id: 'flank-warning', label: '小心绕后', detail: 'Watch for flank' },
    { id: 'wait-buyback', label: '买活等我', detail: 'Wait for buyback' },
    { id: 'ward', label: '补眼', detail: 'Refresh vision' },
    { id: 'clear-wave', label: '清线', detail: 'Clear waves' },
    { id: 'avoid-fight', label: '别接团', detail: 'Avoid team fight' },
    { id: 'protect-core', label: '保核心', detail: 'Protect the core' },
  ],
};

export function buildChatWheelModel(input: { calls?: ChatWheelCallInput[]; preset?: ChatWheelPreset; customLabels?: string[] } = {}): ChatWheelModel {
  const base = PRESET_CALLS[input.preset ?? 'balanced'];
  const custom = input.calls ?? [];
  const calls = SLOTS.map((slot, index) => {
    const customLabel = input.customLabels?.[index]?.trim();
    const call = custom[index] ?? (customLabel
      ? { id: `custom-${index}`, label: customLabel, detail: 'Custom local chat-wheel line' }
      : base[index]);
    return {
      ...call,
      slot,
      hotkey: HOTKEYS[index],
    };
  });
  return {
    visible: calls.length > 0,
    calls,
  };
}

export function chatWheelBroadcastLabel(call: Pick<ChatWheelCall, 'label'>): string {
  return `聊天轮盘: ${call.label}`;
}
