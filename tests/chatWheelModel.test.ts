import { describe, expect, it } from 'vitest';
import { buildChatWheelModel, chatWheelBroadcastLabel } from '../src/ui/chatWheelModel';

describe('chatWheelModel', () => {
  it('builds eight tactical calls with stable slots', () => {
    const model = buildChatWheelModel();

    expect(model.visible).toBe(true);
    expect(model.calls).toHaveLength(8);
    expect(model.calls.map((call) => [call.slot, call.hotkey, call.label])).toEqual([
      ['north', '1', '小心'],
      ['northEast', '2', '撤退'],
      ['east', '3', '进攻'],
      ['southEast', '4', '集合'],
      ['south', '5', '正在路上'],
      ['southWest', '6', '需要支援'],
      ['west', '7', '敌人消失'],
      ['northWest', '8', '做视野'],
    ]);
  });

  it('formats broadcasts without needing team chat infrastructure', () => {
    const model = buildChatWheelModel();
    const call = model.calls.find((entry) => entry.id === 'missing')!;

    expect(chatWheelBroadcastLabel(call)).toBe('聊天轮盘: 敌人消失');
  });

  it('supports custom call labels while preserving the eight-slot wheel shape', () => {
    const model = buildChatWheelModel({
      calls: [
        { id: 'smoke', label: '开雾', detail: 'Group for smoke play' },
        { id: 'roshan', label: '打肉山', detail: 'Move to boss pit' },
      ],
    });

    expect(model.calls).toHaveLength(8);
    expect(model.calls[0]).toMatchObject({
      id: 'smoke',
      label: '开雾',
      detail: 'Group for smoke play',
      slot: 'north',
      hotkey: '1',
    });
    expect(model.calls[1]).toMatchObject({
      id: 'roshan',
      label: '打肉山',
      slot: 'northEast',
      hotkey: '2',
    });
    expect(model.calls[2].id).toBe('attack');
  });

  it('overrides preset slots with local custom text while blank slots fall back', () => {
    const model = buildChatWheelModel({
      preset: 'objective',
      customLabels: ['开雾抓中', ' ', '控盾'],
    });

    expect(model.calls.map((call) => [call.id, call.label, call.detail]).slice(0, 4)).toEqual([
      ['custom-0', '开雾抓中', 'Custom local chat-wheel line'],
      ['smoke', '开雾', 'Group for smoke play'],
      ['custom-2', '控盾', 'Custom local chat-wheel line'],
      ['push', '推塔', 'Push tower now'],
    ]);
  });

  it('supports local content presets for objective and defensive communication', () => {
    const objective = buildChatWheelModel({ preset: 'objective' });
    const defensive = buildChatWheelModel({ preset: 'defensive' });

    expect(objective.calls.map((call) => call.label)).toEqual([
      '控符',
      '开雾',
      '打Boss',
      '推塔',
      '守高',
      '抢前哨',
      '带线',
      '集合打团',
    ]);
    expect(defensive.calls.map((call) => call.label)).toEqual([
      '撤退',
      '守塔',
      '小心绕后',
      '买活等我',
      '补眼',
      '清线',
      '别接团',
      '保核心',
    ]);
  });
});
