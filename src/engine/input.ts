/**
 * 输入管理:右键移动/攻击,A 攻击移动,QWER 技能,S 停止,H 保持,
 * 空格回中,边缘平移,滚轮缩放,中键拖拽。
 * 输出统一为对受控英雄的 Order(与 AI 同构)。
 */
import type { Vec2 } from '../core/vec2';
import { Camera } from '../render/camera';
import { CommandMode } from './commandMode';
import {
  DEFAULT_CONTROL_SETTINGS,
  buildKeyTranslation,
  cameraPanSpeedMultiplier,
  normalizeControlSettings,
  resolveAbilityCastMode,
  resolveItemCastMode,
  type ControlSettings,
} from './controlSettings';
import type { ControlGroupSlot } from './selection';
import type { CommandCardAction } from './commandCardActions';

export interface CastInputOptions {
  selfCast?: boolean;
  queued?: boolean;
}

export interface SelectInputOptions {
  additive?: boolean;
}

export interface ControlGroupInputOptions {
  center?: boolean;
}

export interface InputCallbacks {
  onRightClick(world: Vec2, options?: CastInputOptions): void;
  onMove(world: Vec2, options?: CastInputOptions): void;
  onLeftClick(world: Vec2, options?: SelectInputOptions): void;
  onSelectBox(startWorld: Vec2, endWorld: Vec2, options?: SelectInputOptions): void;
  onSelectionBoxPreview(startScreen: Vec2, endScreen: Vec2): void;
  onSelectionBoxClear(): void;
  onAttackMove(world: Vec2, options?: CastInputOptions): void;
  onPrepareCast(index: number, world: Vec2, options?: CastInputOptions): boolean;
  onPreviewCast(index: number, world: Vec2, options?: CastInputOptions): void;
  onCastKey(index: number, world: Vec2, options?: CastInputOptions): boolean | void; // QWER -> 0-3
  onPrepareItem(slot: number, world: Vec2, options?: CastInputOptions): boolean;
  onPreviewItem(slot: number, world: Vec2, options?: CastInputOptions): void;
  onItemKey(slot: number, world: Vec2, options?: CastInputOptions): boolean | void; // 1-6 -> 0-5
  canSelfCast?(index: number): boolean;
  canSelfItem?(slot: number): boolean;
  onStop(): void;
  onHold(): void;
  onCenterHero(): void;
  onTogglePause(): void;
  onToggleScoreboard(show: boolean): void;
  onToggleCombatLog?(): void;
  onScan?(world: Vec2): void;
  onToggleShop(): void;
  onGlyph(): void;
  /** 调速:+1 加速 / -1 减速(主要供观战快进/慢放团战)。可选,旧调用方不受影响。 */
  onSpeedDelta?(dir: 1 | -1): void;
  onSelectHero(): void;
  onSelectCourier(): void;
  onSelectAllControlled(): void;
  onBindControlGroup(slot: ControlGroupSlot): void;
  onSelectControlGroup(slot: ControlGroupSlot, options?: ControlGroupInputOptions): void;
  onPointerMove(screen: Vec2, world: Vec2): void;
  onPendingMove(active: boolean, options?: CastInputOptions): void;
  onPendingAttackMove(active: boolean, options?: CastInputOptions): void;
  onPendingCast(index: number | null, options?: CastInputOptions): void;
  onPendingItem(slot: number | null, options?: CastInputOptions): void;
}

export class InputManager {
  /** null = 鼠标尚未进入画面(headless/刚加载),此时不做边缘平移 */
  mouse: Vec2 | null = null;
  /** 待目标确认的技能编号(按 QWER 后等待点击),-1 = 无;-2 = A 移动待确认 */
  private commandMode = new CommandMode();
  private controlSettings: ControlSettings;
  /** 物理键→规范键翻译(改键用;默认恒等)。switch/smartHold 用规范键,arrows/alt 用物理键。 */
  private keyTranslation: Record<string, string> = {};
  /** switch 处理的系统键(不可改键,透传):空格回中/P 暂停/Tab 记分板/Esc。 */
  private static readonly SYSTEM_KEYS = new Set([' ', 'p', 'tab', 'escape', '=', '-']);

  /** 物理键→switch 键:绑定键→规范键;系统键透传;其他(含被改走的规范键)→ '\0'(不触发任何 case)。 */
  private translateKey(k: string): string {
    const t = this.keyTranslation[k];
    if (t !== undefined) return t;
    return InputManager.SYSTEM_KEYS.has(k) ? k : '\0';
  }
  private smartHold:
    | { kind: 'cast'; index: number; key: string; options: CastInputOptions }
    | { kind: 'item'; index: number; key: string; options: CastInputOptions }
    | null = null;
  get pendingCast(): number {
    return this.commandMode.pendingCast;
  }
  edgePan = true;
  private keys = new Set<string>();
  /** 屏幕点→世界点换算(2D 用相机平面投影;3D 用渲染器 raycast 到地面)。平移/缩放仍用相机。 */
  private pointToWorld: (p: Vec2) => Vec2;
  private leftSelectionStart: { screen: Vec2; world: Vec2; options?: SelectInputOptions } | null = null;
  private leftSelectionDragging = false;
  private lastControlGroupSelect: { slot: ControlGroupSlot; time: number } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private cb: InputCallbacks,
    controlSettings: ControlSettings = DEFAULT_CONTROL_SETTINGS,
    pointToWorld?: (p: Vec2) => Vec2,
  ) {
    this.controlSettings = normalizeControlSettings(controlSettings);
    this.edgePan = this.controlSettings.cameraEdgePan;
    this.keyTranslation = buildKeyTranslation(this.controlSettings.keyBinds);
    this.pointToWorld = pointToWorld ?? ((p) => this.camera.screenToWorld(p));
    canvas.addEventListener('mousemove', (e) => {
      this.mouse = { x: e.offsetX, y: e.offsetY };
      const world = this.pointToWorld(this.mouse);
      this.cb.onPointerMove(this.mouse, world);
      const pending = this.commandMode.previewCast();
      if (pending !== null) this.cb.onPreviewCast(pending, world);
      const pendingItem = this.commandMode.previewItem();
      if (pendingItem !== null) this.cb.onPreviewItem(pendingItem, world);
      if (this.dragging) {
        this.camera.pan(-(e.movementX), -(e.movementY));
      }
      if (this.leftSelectionStart && !this.leftSelectionDragging) {
        const dx = this.mouse.x - this.leftSelectionStart.screen.x;
        const dy = this.mouse.y - this.leftSelectionStart.screen.y;
        this.leftSelectionDragging = dx * dx + dy * dy >= 36;
      }
      if (this.leftSelectionStart && this.leftSelectionDragging) {
        this.cb.onSelectionBoxPreview(this.leftSelectionStart.screen, this.mouse);
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      const screen = { x: e.offsetX, y: e.offsetY };
      const world = this.pointToWorld(screen);
      if (e.button === 2) {
        this.leftSelectionStart = null;
        this.leftSelectionDragging = false;
        this.cb.onSelectionBoxClear();
        this.commandMode.cancel();
        this.smartHold = null;
        this.cb.onPendingCast(null);
        this.cb.onPendingItem(null);
        this.cb.onPendingMove(false);
        this.cb.onPendingAttackMove(false);
        this.cb.onRightClick(world, { queued: e.shiftKey });
      } else if (e.button === 0) {
        const pending = this.commandMode.pendingCast;
        const pendingItem = this.commandMode.pendingItem;
        if (pending >= 0) {
          const pendingOptions = mergeQueued(this.commandMode.pendingCastOptions(), e.shiftKey);
          const consumed = this.cb.onCastKey(pending, world, pendingOptions) !== false;
          this.commandMode.consumePrimary({ keepPending: !consumed });
          this.smartHold = null;
          if (consumed) this.cb.onPendingCast(null);
          else this.cb.onPreviewCast(pending, world);
        } else if (pendingItem >= 0) {
          const pendingOptions = mergeQueued(this.commandMode.pendingItemOptions(), e.shiftKey);
          const consumed = this.cb.onItemKey(pendingItem, world, pendingOptions) !== false;
          this.commandMode.consumePrimary({ keepPending: !consumed });
          this.smartHold = null;
          if (consumed) this.cb.onPendingItem(null);
          else this.cb.onPreviewItem(pendingItem, world);
        } else if (pending === -2) {
          const result = this.commandMode.consumePrimary();
          this.smartHold = null;
          this.cb.onAttackMove(world, commandOptionsFromResult(result));
          this.cb.onPendingAttackMove(false);
        } else if (pending === -3) {
          const result = this.commandMode.consumePrimary();
          this.smartHold = null;
          this.cb.onMove(world, commandOptionsFromResult(result));
          this.cb.onPendingMove(false);
        } else {
          this.leftSelectionStart = { screen, world, options: selectOptions(e.shiftKey) };
          this.leftSelectionDragging = false;
        }
      } else if (e.button === 1) {
        this.dragging = true;
        e.preventDefault();
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.dragging = false;
      if (e.button === 0 && this.leftSelectionStart) {
        const endScreen = screenFromMouseEvent(e, this.mouse ?? this.leftSelectionStart.screen);
        const endWorld = this.pointToWorld(endScreen);
        if (this.leftSelectionDragging) this.cb.onSelectBox(this.leftSelectionStart.world, endWorld, this.leftSelectionStart.options);
        else this.cb.onLeftClick(this.leftSelectionStart.world, this.leftSelectionStart.options);
        this.leftSelectionStart = null;
        this.leftSelectionDragging = false;
        this.cb.onSelectionBoxClear();
      }
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      this.camera.setZoom(this.camera.zoom * factor, { x: e.offsetX, y: e.offsetY });
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const physicalKey = e.key.toLowerCase();
      this.keys.add(physicalKey); // 物理键(arrows/alt 等系统键按物理追踪)
      const world = this.pointToWorld(this.mouse ?? { x: this.camera.viewW / 2, y: this.camera.viewH / 2 });
      const groupSlot = numberRowControlGroupSlot(physicalKey);
      if (groupSlot && (e.ctrlKey || e.metaKey)) {
        this.cb.onBindControlGroup(groupSlot);
        e.preventDefault();
        return;
      }
      if (groupSlot && this.controlSettings.numberRowMode === 'controlGroups') {
        this.cb.onSelectControlGroup(groupSlot, { center: this.isControlGroupDoubleTap(groupSlot, e.timeStamp) });
        e.preventDefault();
        return;
      }
      // 改键:物理键→规范键喂 switch(默认恒等);case 体不变(仍传规范键给 handleCastHotkey,smartHold 一致)
      switch (this.translateKey(physicalKey)) {
        case 'q': this.handleCastHotkey(0, 'q', world, { selfCast: e.altKey && this.cb.canSelfCast?.(0) === true, queued: e.shiftKey }); break;
        case 'w': this.handleCastHotkey(1, 'w', world, { selfCast: e.altKey && this.cb.canSelfCast?.(1) === true, queued: e.shiftKey }); break;
        case 'e': this.handleCastHotkey(2, 'e', world, { selfCast: e.altKey && this.cb.canSelfCast?.(2) === true, queued: e.shiftKey }); break;
        case 'r': this.handleCastHotkey(3, 'r', world, { selfCast: e.altKey && this.cb.canSelfCast?.(3) === true, queued: e.shiftKey }); break;
        case '1': case '2': case '3': case '4': case '5': case '6':
          this.handleItemHotkey(Number(e.key) - 1, e.key, world, {
            selfCast: e.altKey && this.cb.canSelfItem?.(Number(e.key) - 1) === true,
            queued: e.shiftKey,
          });
          break;
        case 't': // 专属回城卷轴槽(第 7 格,slot 6)
          this.handleItemHotkey(6, 't', world, {
            selfCast: e.altKey && this.cb.canSelfItem?.(6) === true,
            queued: e.shiftKey,
          });
          break;
        case 'a':
          this.commandMode.beginAttackMove({ queued: e.shiftKey });
          this.smartHold = null;
          this.cb.onPendingMove(false);
          this.cb.onPendingAttackMove(true, { queued: e.shiftKey });
          this.cb.onPendingCast(null);
          this.cb.onPendingItem(null);
          break;
        case 's':
          this.commandMode.cancel();
          this.smartHold = null;
          this.cb.onPendingCast(null);
          this.cb.onPendingItem(null);
          this.cb.onPendingMove(false);
          this.cb.onPendingAttackMove(false);
          this.cb.onStop();
          break;
        case 'h': this.cb.onHold(); break;
        case 'f': this.cb.onToggleShop(); break;
        case 'g': this.cb.onGlyph(); break; // 防御符文 Glyph(己方建筑短时免疫)
        case 'f1': this.cb.onSelectHero(); e.preventDefault(); break;
        case 'f2': this.cb.onSelectCourier(); e.preventDefault(); break;
        case 'f3': this.cb.onSelectAllControlled(); e.preventDefault(); break;
        case ' ': this.cb.onCenterHero(); e.preventDefault(); break;
        case 'p': this.cb.onTogglePause(); break;
        case 'l': this.cb.onToggleCombatLog?.(); break; // 战斗日志面板开关
        case 'v': this.cb.onScan?.(world); break; // 扫描:揭示光标处区域
        case '=': this.cb.onSpeedDelta?.(1); break;  // 加速(= 即 + 键,免 Shift)
        case '-': this.cb.onSpeedDelta?.(-1); break; // 减速
        case 'tab': this.cb.onToggleScoreboard(true); e.preventDefault(); break;
        case 'escape':
          this.commandMode.cancel();
          this.smartHold = null;
          this.cb.onPendingCast(null);
          this.cb.onPendingItem(null);
          this.cb.onPendingMove(false);
          this.cb.onPendingAttackMove(false);
          break;
      }
    });
    window.addEventListener('keyup', (e) => {
      const physical = e.key.toLowerCase();
      this.keys.delete(physical);
      if (physical === 'tab') this.cb.onToggleScoreboard(false);
      const world = this.pointToWorld(this.mouse ?? { x: this.camera.viewW / 2, y: this.camera.viewH / 2 });
      // smartHold 用规范键(与 keydown 一致),故 keyup 也翻译
      this.finishSmartHold(this.translateKey(physical), world);
    });
  }

  private dragging = false;

  /** 是否按住 Alt(信息层:塔攻击范围等)。渲染层每帧读取。 */
  get altDown(): boolean {
    return this.keys.has('alt');
  }

  setControlSettings(settings: ControlSettings): void {
    this.controlSettings = normalizeControlSettings(settings);
    this.edgePan = this.controlSettings.cameraEdgePan;
    this.keyTranslation = buildKeyTranslation(this.controlSettings.keyBinds);
  }

  /** 技能键:目标模式的区分(瞬发/点目标/单位目标)由上层 onCastKey 处理。 */
  private handleCastHotkey(i: number, key: string, world: Vec2, options: CastInputOptions = {}) {
    const waitsForTarget = this.cb.onPrepareCast(i, world, options);
    this.commandMode.beginCast(i, waitsForTarget, options);
    if (waitsForTarget) {
      if (options.selfCast) {
        this.smartHold = null;
        this.finishPendingCast(i, world, options);
        return;
      }
      this.activatePendingCast(i, world);
      const castMode = resolveAbilityCastMode(this.controlSettings, i);
      if (castMode === 'quick') {
        this.smartHold = null;
        this.finishPendingCast(i, world, options);
      } else if (castMode === 'smart') {
        this.smartHold = { kind: 'cast', index: i, key, options };
      } else {
        this.smartHold = null;
      }
    } else {
      this.smartHold = null;
      this.cb.onPendingMove(false);
      this.cb.onPendingCast(null);
    }
  }

  private handleItemHotkey(slot: number, key: string, world: Vec2, options: CastInputOptions = {}) {
    const waitsForTarget = this.cb.onPrepareItem(slot, world, options);
    this.commandMode.beginItem(slot, waitsForTarget, options);
    if (waitsForTarget) {
      if (options.selfCast) {
        this.smartHold = null;
        this.finishPendingItem(slot, world, options);
        return;
      }
      this.activatePendingItem(slot, world);
      const castMode = resolveItemCastMode(this.controlSettings, slot);
      if (castMode === 'quick') {
        this.smartHold = null;
        this.finishPendingItem(slot, world, options);
      } else if (castMode === 'smart') {
        this.smartHold = { kind: 'item', index: slot, key, options };
      } else {
        this.smartHold = null;
      }
    } else {
      this.smartHold = null;
      this.cb.onPendingMove(false);
      this.cb.onPendingItem(null);
    }
  }

  private activatePendingCast(i: number, world: Vec2): void {
    this.cb.onPendingAttackMove(false);
    this.cb.onPendingMove(false);
    this.cb.onPendingItem(null);
    this.cb.onPendingCast(i, this.commandMode.pendingCastOptions());
    this.cb.onPreviewCast(i, world);
  }

  private activatePendingItem(slot: number, world: Vec2): void {
    this.cb.onPendingAttackMove(false);
    this.cb.onPendingMove(false);
    this.cb.onPendingCast(null);
    this.cb.onPendingItem(slot, this.commandMode.pendingItemOptions());
    this.cb.onPreviewItem(slot, world);
  }

  private finishPendingCast(i: number, world: Vec2, options: CastInputOptions = {}): boolean {
    const consumed = this.cb.onCastKey(i, world, options) !== false;
    this.commandMode.consumePrimary({ keepPending: !consumed && !options.selfCast });
    if (consumed || options.selfCast) this.cb.onPendingCast(null);
    else this.cb.onPreviewCast(i, world);
    return consumed;
  }

  private finishPendingItem(slot: number, world: Vec2, options: CastInputOptions = {}): boolean {
    const consumed = this.cb.onItemKey(slot, world, options) !== false;
    this.commandMode.consumePrimary({ keepPending: !consumed && !options.selfCast });
    if (consumed || options.selfCast) this.cb.onPendingItem(null);
    else this.cb.onPreviewItem(slot, world);
    return consumed;
  }

  private finishSmartHold(key: string, world: Vec2): void {
    const hold = this.smartHold;
    if (!hold || hold.key !== key) return;
    this.smartHold = null;
    if (hold.kind === 'cast' && this.commandMode.pendingCast === hold.index) {
      this.finishPendingCast(hold.index, world, hold.options);
    } else if (hold.kind === 'item' && this.commandMode.pendingItem === hold.index) {
      this.finishPendingItem(hold.index, world, hold.options);
    }
  }

  activateCommandCardAction(action: CommandCardAction, options: CastInputOptions = {}): void {
    const world = this.pointToWorld(this.mouse ?? { x: this.camera.viewW / 2, y: this.camera.viewH / 2 });
    switch (action) {
      case 'move':
        this.commandMode.beginMove(options);
        this.smartHold = null;
        this.cb.onPendingAttackMove(false);
        this.cb.onPendingCast(null);
        this.cb.onPendingItem(null);
        this.cb.onPendingMove(true, options);
        break;
      case 'attackMove':
        this.commandMode.beginAttackMove(options);
        this.smartHold = null;
        this.cb.onPendingMove(false);
        this.cb.onPendingCast(null);
        this.cb.onPendingItem(null);
        this.cb.onPendingAttackMove(true, options);
        break;
      case 'stop':
        this.commandMode.cancel();
        this.smartHold = null;
        this.cb.onPendingMove(false);
        this.cb.onPendingCast(null);
        this.cb.onPendingItem(null);
        this.cb.onPendingAttackMove(false);
        this.cb.onStop();
        break;
      case 'hold':
        this.cb.onHold();
        break;
      case 'selectHero':
        this.cb.onSelectHero();
        break;
      case 'selectCourier':
        this.cb.onSelectCourier();
        break;
      case 'selectAllControlled':
        this.cb.onSelectAllControlled();
        break;
      case 'glyph':
        this.cb.onGlyph();
        break;
      case 'shop':
        this.cb.onToggleShop();
        break;
    }
  }

  private isControlGroupDoubleTap(slot: ControlGroupSlot, eventTime: number): boolean {
    const now = Number.isFinite(eventTime) && eventTime > 0 ? eventTime : Date.now();
    const center = this.lastControlGroupSelect?.slot === slot && now - this.lastControlGroupSelect.time <= 500;
    this.lastControlGroupSelect = { slot, time: now };
    return center;
  }

  /** 每帧:镜头边缘平移 + 方向键。 */
  update(dtMs: number) {
    const m = this.mouse;
    const margin = 14;
    const speed = cameraPanSpeedMultiplier(this.controlSettings.cameraPanSpeed) * dtMs;
    if (m && this.edgePan && document.hasFocus()) {
      if (m.x < margin) this.camera.pan(-speed, 0);
      if (m.x > this.camera.viewW - margin) this.camera.pan(speed, 0);
      if (m.y < margin) this.camera.pan(0, -speed);
      if (m.y > this.camera.viewH - margin) this.camera.pan(0, speed);
    }
    if (this.keys.has('arrowleft')) this.camera.pan(-speed, 0);
    if (this.keys.has('arrowright')) this.camera.pan(speed, 0);
    if (this.keys.has('arrowup')) this.camera.pan(0, -speed);
    if (this.keys.has('arrowdown')) this.camera.pan(0, speed);
  }
}

function mergeQueued(options: CastInputOptions, shiftKey: boolean): CastInputOptions {
  return options.queued || shiftKey ? { ...options, queued: true } : options;
}

function commandOptionsFromResult(result: { kind: string; queued?: boolean }): CastInputOptions {
  return result.queued ? { queued: true } : {};
}

function selectOptions(shiftKey: boolean): SelectInputOptions | undefined {
  return shiftKey ? { additive: true } : undefined;
}

function numberRowControlGroupSlot(key: string): ControlGroupSlot | null {
  if (key < '1' || key > '6') return null;
  return Number(key) as ControlGroupSlot;
}

function screenFromMouseEvent(e: MouseEvent, fallback: Vec2): Vec2 {
  const maybeOffset = e as MouseEvent & { offsetX?: number; offsetY?: number };
  if (typeof maybeOffset.offsetX === 'number' && typeof maybeOffset.offsetY === 'number') {
    return { x: maybeOffset.offsetX, y: maybeOffset.offsetY };
  }
  return fallback;
}
