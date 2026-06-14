/** 镜头:世界↔屏幕变换、边缘平移、滚轮缩放、中键拖拽。 */
import { clamp } from '../core/mathx';
import type { Vec2 } from '../core/vec2';
import { WORLD } from '../data/mapLayout';

export class Camera {
  /** 视野中心(世界坐标) */
  pos: Vec2 = { x: WORLD / 2, y: WORLD / 2 };
  zoom = 0.55; // 像素/世界单位
  viewW = 1280;
  viewH = 720;
  /** 镜头跟随英雄(默认开;手动平移会暂停,空格重新锁定)。 */
  follow = true;

  resize(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
  }

  worldToScreen(p: Vec2): Vec2 {
    return {
      x: (p.x - this.pos.x) * this.zoom + this.viewW / 2,
      y: (p.y - this.pos.y) * this.zoom + this.viewH / 2,
    };
  }

  screenToWorld(p: Vec2): Vec2 {
    return {
      x: (p.x - this.viewW / 2) / this.zoom + this.pos.x,
      y: (p.y - this.viewH / 2) / this.zoom + this.pos.y,
    };
  }

  pan(dx: number, dy: number) {
    if (dx !== 0 || dy !== 0) this.follow = false; // 手动平移暂停跟随
    this.pos.x = clamp(this.pos.x + dx / this.zoom, 0, WORLD);
    this.pos.y = clamp(this.pos.y + dy / this.zoom, 0, WORLD);
  }

  setZoom(z: number, pivotScreen?: Vec2) {
    const before = pivotScreen ? this.screenToWorld(pivotScreen) : null;
    this.zoom = clamp(z, 0.12, 2.5);
    if (before && pivotScreen) {
      const after = this.screenToWorld(pivotScreen);
      this.pos.x += before.x - after.x;
      this.pos.y += before.y - after.y;
    }
  }

  centerOn(p: Vec2) {
    this.pos = { x: p.x, y: p.y };
  }
}
