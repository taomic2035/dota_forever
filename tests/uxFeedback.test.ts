import { describe, expect, it } from 'vitest';
import { buildTargetPreviewModel } from '../src/engine/targetPreviewModel';
import { UxFeedback } from '../src/ui/uxFeedback';

describe('UxFeedback', () => {
  it('expires world pulses deterministically', () => {
    const ux = new UxFeedback();
    ux.addWorldPulse({ kind: 'move', pos: { x: 100, y: 200 }, time: 10 });
    ux.addWorldPulse({ kind: 'queued', pos: { x: 300, y: 400 }, time: 10.1 });

    expect(ux.worldPulsesAt(10.1).map((pulse) => pulse.kind)).toEqual(['move', 'queued']);
    expect(ux.worldPulsesAt(10.7)).toHaveLength(0);
  });

  it('tracks targeting mode and clears it after confirm or cancel', () => {
    const ux = new UxFeedback();
    ux.setTargeting({ abilityIndex: 1, mode: 'line', origin: { x: 10, y: 20 }, range: 900, radius: 110 });

    expect(ux.targeting?.abilityIndex).toBe(1);
    expect(ux.targeting?.mode).toBe('line');

    ux.clearTargeting();
    expect(ux.targeting).toBeNull();
  });

  it('records HUD slot flashes by stable key', () => {
    const ux = new UxFeedback();
    ux.flashHudSlot('ability-2', 'reject', 5);

    expect(ux.hudFlashFor('ability-2', 5.2)?.kind).toBe('reject');
    expect(ux.hudFlashFor('ability-2', 5.7)).toBeNull();
  });

  it('replaces targeting state when a new ability is selected', () => {
    const ux = new UxFeedback();
    ux.setTargeting({ abilityIndex: 0, mode: 'area', origin: { x: 0, y: 0 }, range: 600, radius: 250 });
    ux.setTargeting({ abilityIndex: 2, mode: 'unit', origin: { x: 50, y: 60 }, range: 700 });

    expect(ux.targeting).toEqual({ abilityIndex: 2, mode: 'unit', origin: { x: 50, y: 60 }, range: 700 });
  });

  it('stores cursor target and validity for targeting previews', () => {
    const ux = new UxFeedback();
    ux.setTargeting({
      abilityIndex: 0,
      mode: 'area',
      origin: { x: 10, y: 20 },
      cursor: { x: 100, y: 120 },
      range: 600,
      radius: 220,
      valid: false,
    });

    expect(ux.targeting?.cursor).toEqual({ x: 100, y: 120 });
    expect(ux.targeting?.valid).toBe(false);
  });

  it('stores the full target preview model while preserving legacy targeting fields', () => {
    const ux = new UxFeedback();
    const preview = buildTargetPreviewModel({
      source: 'item',
      label: '冲击波',
      origin: { x: 10, y: 20 },
      cursor: { x: 410, y: 120 },
      range: 700,
      shape: { kind: 'line', width: 140, length: 700 },
      requiresTarget: false,
    });

    ux.setTargetPreview({ abilityIndex: -1, itemSlot: 2 }, preview);

    expect(ux.targetPreview).toBe(preview);
    expect(ux.targeting).toMatchObject({
      abilityIndex: -1,
      source: 'item',
      itemSlot: 2,
      mode: 'line',
      origin: { x: 10, y: 20 },
      cursor: { x: 410, y: 120 },
      range: 700,
      width: 140,
      valid: true,
      status: 'ready',
    });

    ux.clearTargeting();
    expect(ux.targetPreview).toBeNull();
    expect(ux.targeting).toBeNull();
  });

  it('tracks cursor position and expires transient cast intent', () => {
    const ux = new UxFeedback();
    ux.setCursorPosition({ x: 320, y: 240 });
    ux.setCursorIntent({ kind: 'cast', label: 'CAST Q', time: 12, ttl: 0.4 });

    expect(ux.cursorPosition).toEqual({ x: 320, y: 240 });
    expect(ux.cursorIntentAt(12.2)?.label).toBe('CAST Q');
    expect(ux.cursorIntentAt(12.5)).toBeNull();
  });

  it('keeps pending attack-move cursor intent until cleared', () => {
    const ux = new UxFeedback();
    ux.setCursorIntent({ kind: 'attackmove', label: 'A-MOVE', time: 3 });

    expect(ux.cursorIntentAt(99)?.kind).toBe('attackmove');
    ux.clearCursorIntent();
    expect(ux.cursorIntentAt(99)).toBeNull();
  });

  it('shows transient command messages near the cursor', () => {
    const ux = new UxFeedback();
    ux.setCommandMessage({ kind: 'reject', label: 'NO MANA', time: 20, color: '#ff3040' });

    expect(ux.commandMessageAt(20.4)?.label).toBe('NO MANA');
    expect(ux.commandMessageAt(21.1)).toBeNull();
  });

  it('replaces and clears command messages deterministically', () => {
    const ux = new UxFeedback();
    ux.setCommandMessage({ kind: 'reject', label: 'NO MANA', time: 5 });
    ux.setCommandMessage({ kind: 'reject', label: 'ON COOLDOWN', time: 5.2 });

    expect(ux.commandMessageAt(5.3)?.label).toBe('ON COOLDOWN');
    ux.clearCommandMessage();
    expect(ux.commandMessageAt(5.3)).toBeNull();
  });

  it('tracks the left-click selected unit and clears it', () => {
    const ux = new UxFeedback();
    expect(ux.selectedUnitId).toBe(0);
    ux.selectUnit(42);
    expect(ux.selectedUnitId).toBe(42);
    expect(ux.selectedUnitIds).toEqual([42]);
    ux.selectUnit(7);
    expect(ux.selectedUnitId).toBe(7);
    expect(ux.selectedUnitIds).toEqual([7]);
    ux.clearSelection();
    expect(ux.selectedUnitId).toBe(0);
    expect(ux.selectedUnitIds).toEqual([]);
    expect(ux.commandableSelectedIds).toEqual([]);
    expect(ux.inspectUnitId).toBe(0);
  });

  it('syncs a full selection snapshot for multi-unit command UI', () => {
    const ux = new UxFeedback();

    ux.setSelectionSnapshot({
      primaryId: 10,
      selectedIds: [10, 12, 14],
      commandableIds: [10, 12],
      inspectId: 0,
    });

    expect(ux.selectedUnitId).toBe(10);
    expect(ux.selectedUnitIds).toEqual([10, 12, 14]);
    expect(ux.commandableSelectedIds).toEqual([10, 12]);
    expect(ux.inspectUnitId).toBe(0);
  });

  it('syncs inspect-only selection without command authority', () => {
    const ux = new UxFeedback();

    ux.setSelectionSnapshot({
      primaryId: 99,
      selectedIds: [99],
      commandableIds: [],
      inspectId: 99,
    });

    expect(ux.selectedUnitId).toBe(99);
    expect(ux.selectedUnitIds).toEqual([99]);
    expect(ux.commandableSelectedIds).toEqual([]);
    expect(ux.inspectUnitId).toBe(99);
  });

  it('tracks and clears the drag selection box in screen space', () => {
    const ux = new UxFeedback();

    ux.setSelectionBox({ x: 10, y: 20 }, { x: 80, y: 100 });

    expect(ux.selectionBox).toEqual({ start: { x: 10, y: 20 }, end: { x: 80, y: 100 } });
    ux.clearSelectionBox();
    expect(ux.selectionBox).toBeNull();
  });
});
