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
  cameraPanSpeedMultiplier,
  normalizeControlSettings,
  resolveAbilityCastMode,
  resolveItemCastMode,
  type ControlSettings,
} from './controlSettings';

export interface CastInputOptions {
  selfCast?: boolean;
}

export interface InputCallbacks {
  onRightClick(world: Vec2): void;
  onLeftClick(world: Vec2): void;
  onAttackMove(world: Vec2): void;
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
  onToggleShop(): void;
  onPointerMove(screen: Vec2, world: Vec2): void;
  onPendingAttackMove(active: boolean): void;
  onPendingCast(index: number | null): void;
  onPendingItem(slot: number | null): void;
}

export class InputManager {
  /** null = 鼠标尚未进入画面(headless/刚加载),此时不做边缘平移 */
  mouse: Vec2 | null = null;
  /** 待目标确认的技能编号(按 QWER 后等待点击),-1 = 无;-2 = A 移动待确认 */
  private commandMode = new CommandMode();
  private controlSettings: ControlSettings;
  private smartHold: { kind: 'cast'; index: number; key: string } | { kind: 'item'; index: number; key: string } | null = null;
  get pendingCast(): number {
    return this.commandMode.pendingCast;
  }
  edgePan = true;
  private keys = new Set<string>();
  /** 屏幕点→世界点换算(2D 用相机平面投影;3D 用渲染器 raycast 到地面)。平移/缩放仍用相机。 */
  private pointToWorld: (p: Vec2) => Vec2;

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private cb: InputCallbacks,
    controlSettings: ControlSettings = DEFAULT_CONTROL_SETTINGS,
    pointToWorld?: (p: Vec2) => Vec2,
  ) {
    this.controlSettings = normalizeControlSettings(controlSettings);
    this.edgePan = this.controlSettings.cameraEdgePan;
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
    });
    canvas.addEventListener('mousedown', (e) => {
      const world = this.pointToWorld({ x: e.offsetX, y: e.offsetY });
      if (e.button === 2) {
        this.commandMode.cancel();
        this.smartHold = null;
        this.cb.onPendingCast(null);
        this.cb.onPendingItem(null);
        this.cb.onPendingAttackMove(false);
        this.cb.onRightClick(world);
      } else if (e.button === 0) {
        const pending = this.commandMode.pendingCast;
        const pendingItem = this.commandMode.pendingItem;
        if (pending >= 0) {
          const consumed = this.cb.onCastKey(pending, world) !== false;
          this.commandMode.consumePrimary({ keepPending: !consumed });
          this.smartHold = null;
          if (consumed) this.cb.onPendingCast(null);
          else this.cb.onPreviewCast(pending, world);
        } else if (pendingItem >= 0) {
          const consumed = this.cb.onItemKey(pendingItem, world) !== false;
          this.commandMode.consumePrimary({ keepPending: !consumed });
          this.smartHold = null;
          if (consumed) this.cb.onPendingItem(null);
          else this.cb.onPreviewItem(pendingItem, world);
        } else if (pending === -2) {
          this.commandMode.consumePrimary();
          this.smartHold = null;
          this.cb.onAttackMove(world);
          this.cb.onPendingAttackMove(false);
        } else {
          this.cb.onLeftClick(world);
        }
      } else if (e.button === 1) {
        this.dragging = true;
        e.preventDefault();
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.dragging = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      this.camera.setZoom(this.camera.zoom * factor, { x: e.offsetX, y: e.offsetY });
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.key.toLowerCase());
      const world = this.pointToWorld(this.mouse ?? { x: this.camera.viewW / 2, y: this.camera.viewH / 2 });
      switch (e.key.toLowerCase()) {
        case 'q': this.handleCastHotkey(0, 'q', world, { selfCast: e.altKey && this.cb.canSelfCast?.(0) === true }); break;
        case 'w': this.handleCastHotkey(1, 'w', world, { selfCast: e.altKey && this.cb.canSelfCast?.(1) === true }); break;
        case 'e': this.handleCastHotkey(2, 'e', world, { selfCast: e.altKey && this.cb.canSelfCast?.(2) === true }); break;
        case 'r': this.handleCastHotkey(3, 'r', world, { selfCast: e.altKey && this.cb.canSelfCast?.(3) === true }); break;
        case '1': case '2': case '3': case '4': case '5': case '6':
          this.handleItemHotkey(Number(e.key) - 1, e.key, world, {
            selfCast: e.altKey && this.cb.canSelfItem?.(Number(e.key) - 1) === true,
          });
          break;
        case 'a':
          this.commandMode.beginAttackMove();
          this.smartHold = null;
          this.cb.onPendingAttackMove(true);
          this.cb.onPendingCast(null);
          this.cb.onPendingItem(null);
          break;
        case 's':
          this.commandMode.cancel();
          this.smartHold = null;
          this.cb.onPendingCast(null);
          this.cb.onPendingItem(null);
          this.cb.onPendingAttackMove(false);
          this.cb.onStop();
          break;
        case 'h': this.cb.onHold(); break;
        case 'f': this.cb.onToggleShop(); break;
        case ' ': this.cb.onCenterHero(); e.preventDefault(); break;
        case 'p': this.cb.onTogglePause(); break;
        case 'tab': this.cb.onToggleScoreboard(true); e.preventDefault(); break;
        case 'escape':
          this.commandMode.cancel();
          this.smartHold = null;
          this.cb.onPendingCast(null);
          this.cb.onPendingItem(null);
          this.cb.onPendingAttackMove(false);
          break;
      }
    });
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
      if (key === 'tab') this.cb.onToggleScoreboard(false);
      const world = this.pointToWorld(this.mouse ?? { x: this.camera.viewW / 2, y: this.camera.viewH / 2 });
      this.finishSmartHold(key, world);
    });
  }

  private dragging = false;

  setControlSettings(settings: ControlSettings): void {
    this.controlSettings = normalizeControlSettings(settings);
    this.edgePan = this.controlSettings.cameraEdgePan;
  }

  /** 技能键:目标模式的区分(瞬发/点目标/单位目标)由上层 onCastKey 处理。 */
  private handleCastHotkey(i: number, key: string, world: Vec2, options: CastInputOptions = {}) {
    const waitsForTarget = this.cb.onPrepareCast(i, world, options);
    this.commandMode.beginCast(i, waitsForTarget);
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
        this.finishPendingCast(i, world);
      } else if (castMode === 'smart') {
        this.smartHold = { kind: 'cast', index: i, key };
      } else {
        this.smartHold = null;
      }
    } else {
      this.smartHold = null;
      this.cb.onPendingCast(null);
    }
  }

  private handleItemHotkey(slot: number, key: string, world: Vec2, options: CastInputOptions = {}) {
    const waitsForTarget = this.cb.onPrepareItem(slot, world, options);
    this.commandMode.beginItem(slot, waitsForTarget);
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
        this.finishPendingItem(slot, world);
      } else if (castMode === 'smart') {
        this.smartHold = { kind: 'item', index: slot, key };
      } else {
        this.smartHold = null;
      }
    } else {
      this.smartHold = null;
      this.cb.onPendingItem(null);
    }
  }

  private activatePendingCast(i: number, world: Vec2): void {
    this.cb.onPendingAttackMove(false);
    this.cb.onPendingItem(null);
    this.cb.onPendingCast(i);
    this.cb.onPreviewCast(i, world);
  }

  private activatePendingItem(slot: number, world: Vec2): void {
    this.cb.onPendingAttackMove(false);
    this.cb.onPendingCast(null);
    this.cb.onPendingItem(slot);
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
      this.finishPendingCast(hold.index, world);
    } else if (hold.kind === 'item' && this.commandMode.pendingItem === hold.index) {
      this.finishPendingItem(hold.index, world);
    }
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
