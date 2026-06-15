import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputManager, type InputCallbacks } from '../src/engine/input';
import { DEFAULT_CONTROL_SETTINGS, type ControlSettings } from '../src/engine/controlSettings';

type Listener = (event: any) => void;

class FakeCanvas {
  listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  emit(type: string, event: any): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class FakeWindow {
  listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  emit(type: string, event: any): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function callbacks(overrides: Partial<InputCallbacks> = {}): InputCallbacks {
  return {
    onRightClick: vi.fn(),
    onMove: vi.fn(),
    onLeftClick: vi.fn(),
    onAttackMove: vi.fn(),
    onPrepareCast: vi.fn(() => false),
    onPreviewCast: vi.fn(),
    onCastKey: vi.fn(),
    onPrepareItem: vi.fn(() => false),
    onPreviewItem: vi.fn(),
    onItemKey: vi.fn(),
    onStop: vi.fn(),
    onHold: vi.fn(),
    onCenterHero: vi.fn(),
    onTogglePause: vi.fn(),
    onToggleScoreboard: vi.fn(),
    onToggleShop: vi.fn(),
    onGlyph: vi.fn(),
    onPointerMove: vi.fn(),
    onPendingMove: vi.fn(),
    onPendingAttackMove: vi.fn(),
    onPendingCast: vi.fn(),
    onPendingItem: vi.fn(),
    onSelectHero: vi.fn(),
    onSelectCourier: vi.fn(),
    onSelectAllControlled: vi.fn(),
    onBindControlGroup: vi.fn(),
    onSelectControlGroup: vi.fn(),
    onSelectBox: vi.fn(),
    onSelectionBoxPreview: vi.fn(),
    onSelectionBoxClear: vi.fn(),
    ...overrides,
  };
}

function installInput(cb: InputCallbacks, settings?: ControlSettings) {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const fakeWindow = new FakeWindow();
  const canvas = new FakeCanvas();
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('document', { hasFocus: () => true });
  const camera = {
    viewW: 800,
    viewH: 600,
    pan: vi.fn(),
    setZoom: vi.fn(),
    screenToWorld: (p: { x: number; y: number }) => p,
  };
  const manager = new InputManager(canvas as unknown as HTMLCanvasElement, camera as any, cb, settings, (p) => p);
  return {
    manager,
    canvas,
    fakeWindow,
    restore() {
      vi.unstubAllGlobals();
      if (oldWindow !== undefined) vi.stubGlobal('window', oldWindow);
      if (oldDocument !== undefined) vi.stubGlobal('document', oldDocument);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InputManager selection controls', () => {
  it('lets command-card Move wait for a ground click and issue a forced move', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.manager.activateCommandCardAction('move');
    input.canvas.emit('mousedown', { button: 0, offsetX: 240, offsetY: 260, shiftKey: false });

    expect(cb.onPendingMove).toHaveBeenCalledWith(true, {});
    expect(cb.onMove).toHaveBeenCalledWith({ x: 240, y: 260 }, {});
    expect(cb.onRightClick).not.toHaveBeenCalled();
    expect(cb.onPendingMove).toHaveBeenLastCalledWith(false);
  });

  it('lets command-card Attack enter the same pending attack-move flow as the hotkey', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.manager.activateCommandCardAction('attackMove', { queued: true });
    input.canvas.emit('mousedown', { button: 0, offsetX: 300, offsetY: 340, shiftKey: false });

    expect(cb.onPendingAttackMove).toHaveBeenCalledWith(true, { queued: true });
    expect(cb.onAttackMove).toHaveBeenCalledWith({ x: 300, y: 340 }, { queued: true });
    expect(cb.onPendingAttackMove).toHaveBeenLastCalledWith(false);
  });

  it('routes immediate command-card actions through existing command callbacks', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.manager.activateCommandCardAction('stop');
    input.manager.activateCommandCardAction('hold');
    input.manager.activateCommandCardAction('selectHero');
    input.manager.activateCommandCardAction('selectCourier');
    input.manager.activateCommandCardAction('selectAllControlled');
    input.manager.activateCommandCardAction('glyph');
    input.manager.activateCommandCardAction('shop');

    expect(cb.onStop).toHaveBeenCalledTimes(1);
    expect(cb.onHold).toHaveBeenCalledTimes(1);
    expect(cb.onSelectHero).toHaveBeenCalledTimes(1);
    expect(cb.onSelectCourier).toHaveBeenCalledTimes(1);
    expect(cb.onSelectAllControlled).toHaveBeenCalledTimes(1);
    expect(cb.onGlyph).toHaveBeenCalledTimes(1);
    expect(cb.onToggleShop).toHaveBeenCalledTimes(1);
  });

  it('routes F1/F2/F3 to hero, courier, and all-controlled selection callbacks', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.fakeWindow.emit('keydown', { key: 'F1', repeat: false, altKey: false, shiftKey: false, preventDefault: vi.fn() });
    input.fakeWindow.emit('keydown', { key: 'F2', repeat: false, altKey: false, shiftKey: false, preventDefault: vi.fn() });
    input.fakeWindow.emit('keydown', { key: 'F3', repeat: false, altKey: false, shiftKey: false, preventDefault: vi.fn() });

    expect(cb.onSelectHero).toHaveBeenCalledTimes(1);
    expect(cb.onSelectCourier).toHaveBeenCalledTimes(1);
    expect(cb.onSelectAllControlled).toHaveBeenCalledTimes(1);
  });

  it('passes Shift left-click as additive selection', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.canvas.emit('mousedown', { button: 0, offsetX: 140, offsetY: 220, shiftKey: true });
    input.fakeWindow.emit('mouseup', { button: 0, offsetX: 140, offsetY: 220 });

    expect(cb.onLeftClick).toHaveBeenCalledWith({ x: 140, y: 220 }, { additive: true });
  });

  it('routes left-button drags beyond threshold to box selection', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.canvas.emit('mousedown', { button: 0, offsetX: 100, offsetY: 120, shiftKey: true });
    input.canvas.emit('mousemove', { offsetX: 160, offsetY: 190, movementX: 60, movementY: 70 });
    input.fakeWindow.emit('mouseup', { button: 0, offsetX: 160, offsetY: 190 });

    expect(cb.onLeftClick).not.toHaveBeenCalled();
    expect(cb.onSelectBox).toHaveBeenCalledWith(
      { x: 100, y: 120 },
      { x: 160, y: 190 },
      { additive: true },
    );
    expect(cb.onSelectionBoxPreview).toHaveBeenCalledWith(
      { x: 100, y: 120 },
      { x: 160, y: 190 },
    );
    expect(cb.onSelectionBoxClear).toHaveBeenCalledTimes(1);
  });

  it('binds control groups with Ctrl plus number without consuming item hotkeys', () => {
    const cb = callbacks();
    const input = installInput(cb);

    input.fakeWindow.emit('keydown', { key: '1', repeat: false, ctrlKey: true, altKey: false, shiftKey: false, preventDefault: vi.fn() });
    input.fakeWindow.emit('keydown', { key: '1', repeat: false, ctrlKey: false, altKey: false, shiftKey: false, preventDefault: vi.fn() });

    expect(cb.onBindControlGroup).toHaveBeenCalledWith(1);
    expect(cb.onPrepareItem).toHaveBeenCalledWith(0, { x: 400, y: 300 }, { selfCast: false, queued: false });
    expect(cb.onSelectControlGroup).not.toHaveBeenCalled();
  });

  it('selects control groups from the number row when classic control group mode is enabled', () => {
    const cb = callbacks();
    const input = installInput(cb, { ...DEFAULT_CONTROL_SETTINGS, numberRowMode: 'controlGroups' });

    input.fakeWindow.emit('keydown', { key: '2', repeat: false, ctrlKey: false, altKey: false, shiftKey: false, timeStamp: 1000, preventDefault: vi.fn() });
    input.fakeWindow.emit('keydown', { key: '2', repeat: false, ctrlKey: false, altKey: false, shiftKey: false, timeStamp: 1200, preventDefault: vi.fn() });

    expect(cb.onItemKey).not.toHaveBeenCalled();
    expect(cb.onSelectControlGroup).toHaveBeenNthCalledWith(1, 2, { center: false });
    expect(cb.onSelectControlGroup).toHaveBeenNthCalledWith(2, 2, { center: true });
  });
});
