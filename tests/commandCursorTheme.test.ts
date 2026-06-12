import { describe, expect, it } from 'vitest';
import {
  commandMessageVisual,
  cursorIntentVisual,
  renderCursorBadge,
} from '../src/ui/commandCursorTheme';

describe('command cursor theme', () => {
  it('marks hostile cast targeting with an enemy icon and red accent', () => {
    const visual = cursorIntentVisual({ kind: 'cast', label: 'CAST Q', time: 1, targetHint: 'enemy' });

    expect(visual.icon).toBe('X');
    expect(visual.color).toBe('#ff5366');
    expect(visual.tone).toBe('hostile');
  });

  it('marks ally-or-self cast targeting with a support icon and green accent', () => {
    const visual = cursorIntentVisual({ kind: 'cast', label: 'CAST W', time: 1, targetHint: 'allyOrSelf' });

    expect(visual.icon).toBe('+');
    expect(visual.color).toBe('#62e889');
    expect(visual.tone).toBe('support');
  });

  it('marks ground casts with a ground icon and ability blue accent', () => {
    const visual = cursorIntentVisual({ kind: 'cast', label: 'CAST E', time: 1, targetHint: 'ground' });

    expect(visual.icon).toBe('.');
    expect(visual.color).toBe('#5aa2ff');
    expect(visual.tone).toBe('ground');
  });

  it('marks any-unit casts with a neutral ring icon', () => {
    const visual = cursorIntentVisual({ kind: 'cast', label: 'CAST R', time: 1, targetHint: 'any' });

    expect(visual.icon).toBe('O');
    expect(visual.color).toBe('#d8d0a0');
    expect(visual.tone).toBe('neutral');
  });

  it('keeps attack-move visually distinct from cast targeting', () => {
    const visual = cursorIntentVisual({ kind: 'attackmove', label: 'A-MOVE', time: 1, targetHint: 'attack' });

    expect(visual.icon).toBe('A');
    expect(visual.color).toBe('#ffd45a');
    expect(visual.tone).toBe('attack');
  });

  it('uses item gold for ground-targeted items', () => {
    const visual = cursorIntentVisual({ kind: 'item', label: 'ITEM 2', time: 1, targetHint: 'ground' });

    expect(visual.icon).toBe('.');
    expect(visual.color).toBe('#d9b44a');
    expect(visual.tone).toBe('ground');
  });

  it('escapes reject labels when rendering command message badges', () => {
    const visual = commandMessageVisual({ kind: 'reject', label: 'NO <MANA>', time: 1 });
    const html = renderCursorBadge('NO <MANA>', visual, 'message');

    expect(html).toContain('NO &lt;MANA&gt;');
    expect(html).not.toContain('NO <MANA>');
  });
});
