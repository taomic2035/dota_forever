import type { CourierHudPrimaryAction, CourierHudStatus, CourierHudTone } from './courierHudModel';

export type CourierControlActionKey = 'select' | 'deliver' | 'return' | 'stop' | 'burst';
export type CourierControlActionTone = 'ready' | 'active' | 'disabled' | 'danger';

export interface CourierControlInput {
  status: CourierHudStatus;
  primaryAction: CourierHudPrimaryAction;
  selected: boolean;
  stashItems: number;
  tone: CourierHudTone;
  hpPercent?: number;
}

export interface CourierControlAction {
  key: CourierControlActionKey;
  label: string;
  hotkey: string;
  enabled: boolean;
  tone: CourierControlActionTone;
  reason: string;
  pendingSimApi: boolean;
}

export interface CourierControlModel {
  visible: boolean;
  summary: string;
  actions: CourierControlAction[];
}

export function buildCourierControlModel(input: CourierControlInput): CourierControlModel {
  const dead = input.status === 'dead' || input.status === 'missing';
  return {
    visible: true,
    summary: courierSummary(input),
    actions: [
      action('select', 'Select', 'F2', !dead, input.selected ? 'active' : input.tone === 'danger' ? 'danger' : 'ready', dead ? 'Courier unavailable' : 'Select courier', false),
      action('deliver', 'Deliver', 'D', input.primaryAction === 'deliver' && !dead, 'ready', deliverReason(input), false),
      action('return', 'Return', 'R', false, 'disabled', 'Needs return-to-fountain API', true),
      action('stop', 'Stop', 'S', false, 'disabled', 'Needs courier stop API', true),
      action('burst', 'Burst', 'B', false, 'disabled', 'Needs courier burst/speed API', true),
    ],
  };
}

function action(
  key: CourierControlActionKey,
  label: string,
  hotkey: string,
  enabled: boolean,
  tone: CourierControlActionTone,
  reason: string,
  pendingSimApi: boolean,
): CourierControlAction {
  return {
    key,
    label,
    hotkey,
    enabled,
    tone: enabled ? tone : 'disabled',
    reason,
    pendingSimApi,
  };
}

function courierSummary(input: CourierControlInput): string {
  if (input.status === 'missing') return 'Courier missing';
  if (input.status === 'dead') return 'Courier dead · wait respawn';
  const selected = input.selected ? ' selected' : '';
  const danger = input.tone === 'danger' ? ' danger' : selected;
  if (input.status === 'delivering') return `Courier${danger} · delivering stash x${input.stashItems}`;
  if (input.status === 'returning') return `Courier${danger} · returning to base`;
  if (input.stashItems > 0) return `Courier${selected || ' ready'} · stash x${input.stashItems}`;
  return `Courier${selected || ' ready'} · no stash`;
}

function deliverReason(input: CourierControlInput): string {
  if (input.status === 'dead' || input.status === 'missing') return 'Courier unavailable';
  if (input.status === 'delivering') return 'Already delivering';
  if (input.stashItems <= 0) return 'No stash items';
  return 'Deliver stash';
}
