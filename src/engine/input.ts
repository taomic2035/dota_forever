/**
 * 输入管理:右键移动/攻击,A 攻击移动,QWER 技能,S 停止,H 保持,
 * 空格回中,边缘平移,滚轮缩放,中键拖拽。
 * 输出统一为对受控英雄的 Order(与 AI 同构)。
 */
import type { Vec2 } from '../core/vec2';
import { Camera } from '../render/camera';

export interface InputCallbacks {
  onRightClick(world: Vec2): void;
  onLeftClick(world: Vec2): void;
  onAttackMove(world: Vec2): void;
  onCastKey(index: number, world: Vec2): void; // QWER → 0-3
  onStop(): void;
  onHold(): void;
  onCenterHero(): void;
  onTogglePause(): void;
  onToggleScoreboard(show: boolean): void;
}

export class InputManager {
  mouse: Vec2 = { x: 0, y: 0 };
  /** 待目标确认的技能编号(按 QWER 后等待点击),-1 = 无;-2 = A 移动待确认 */
  pendingCast = -1;
  edgePan = true;
  private keys = new Set<string>();

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private cb: InputCallbacks,
  ) {
    canvas.addEventListener('mousemove', (e) => {
      this.mouse = { x: e.offsetX, y: e.offsetY };
      if (this.dragging) {
        this.camera.pan(-(e.movementX), -(e.movementY));
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      const world = this.camera.screenToWorld({ x: e.offsetX, y: e.offsetY });
      if (e.button === 2) {
        this.pendingCast = -1;
        this.cb.onRightClick(world);
      } else if (e.button === 0) {
        if (this.pendingCast >= 0) {
          this.cb.onCastKey(this.pendingCast, world);
          this.pendingCast = -1;
        } else if (this.pendingCast === -2) {
          this.cb.onAttackMove(world);
          this.pendingCast = -1;
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
      const world = this.camera.screenToWorld(this.mouse);
      switch (e.key.toLowerCase()) {
        case 'q': this.quickCast(0, world); break;
        case 'w': this.quickCast(1, world); break;
        case 'e': this.quickCast(2, world); break;
        case 'r': this.quickCast(3, world); break;
        case 'a': this.pendingCast = -2; break;
        case 's': this.pendingCast = -1; this.cb.onStop(); break;
        case 'h': this.cb.onHold(); break;
        case ' ': this.cb.onCenterHero(); e.preventDefault(); break;
        case 'p': this.cb.onTogglePause(); break;
        case 'tab': this.cb.onToggleScoreboard(true); e.preventDefault(); break;
        case 'escape': this.pendingCast = -1; break;
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'tab') this.cb.onToggleScoreboard(false);
    });
  }

  private dragging = false;

  /** 技能键:点目标技能进入待确认,瞬发技能由上层直接处理(M3 区分)。 */
  private quickCast(i: number, world: Vec2) {
    this.cb.onCastKey(i, world);
  }

  /** 每帧:镜头边缘平移 + 方向键。 */
  update(dtMs: number) {
    const m = this.mouse;
    const margin = 14;
    const speed = 1.1 * dtMs;
    if (this.edgePan && document.hasFocus()) {
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
