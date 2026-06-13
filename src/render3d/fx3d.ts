/** 3D 特效:消费 world 事件流 → 短时几何特效(爆发/光束/AoE 环 + 受击火花),弹道同步发光球。按 fxStyle 配色。 */
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { Vec2 } from '../core/vec2';
import { fxStyle } from '../render/fxStyle';

interface FxItem {
  obj: THREE.Mesh;
  born: number;
  ttl: number;
  kind: 'burst' | 'beam' | 'aoe';
  peak: number;
}

export class Fx3D {
  private items: FxItem[] = [];
  private projGroup = new THREE.Group();
  private projPool: THREE.Mesh[] = [];

  constructor(private scene: THREE.Scene) {
    scene.add(this.projGroup);
  }

  /** 由 loop 在 step 钩子调用(与 2D fx 接口一致)。 */
  consume(world: World, _team: number | null): void {
    const t = performance.now() / 1000;
    for (const e of world.events) {
      if (e.kind === 'fx') {
        const col = new THREE.Color(fxStyle(e.fx).color);
        if (e.pos2) this.beam(e.pos, e.pos2, col, t);
        else if (e.radius && e.radius > 0) this.aoe(e.pos, e.radius, col, t, e.duration ?? 0.5);
        else this.burst(e.pos, col, t, 1);
      } else if (e.kind === 'unit_damaged') {
        this.burst(e.pos, new THREE.Color('#ffcaa0'), t, 0.55);
      }
    }
  }

  private burst(pos: Vec2, col: THREE.Color, t: number, scale: number): void {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(16 * scale, 8, 8),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 }),
    );
    m.position.set(pos.x, 42, pos.y);
    this.scene.add(m);
    this.items.push({ obj: m, born: t, ttl: 0.35, kind: 'burst', peak: 0.9 });
  }

  private beam(a: Vec2, b: Vec2, col: THREE.Color, t: number): void {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, len, 6),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }),
    );
    m.position.set((a.x + b.x) / 2, 50, (a.y + b.y) / 2);
    m.rotation.z = Math.PI / 2;
    m.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
    this.scene.add(m);
    this.items.push({ obj: m, born: t, ttl: 0.3, kind: 'beam', peak: 0.85 });
  }

  private aoe(pos: Vec2, radius: number, col: THREE.Color, t: number, dur: number): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.68, radius, 30),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 4, pos.y);
    this.scene.add(ring);
    this.items.push({ obj: ring, born: t, ttl: Math.min(2, Math.max(0.4, dur)), kind: 'aoe', peak: 0.45 });
  }

  /** 由 renderer3d.render 每帧调用:衰减特效 + 同步弹道。 */
  update(world: World, now: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const age = (now - it.born) / it.ttl;
      const mat = it.obj.material as THREE.MeshBasicMaterial;
      if (age >= 1) {
        this.scene.remove(it.obj);
        it.obj.geometry.dispose();
        mat.dispose();
        this.items.splice(i, 1);
        continue;
      }
      mat.opacity = (1 - age) * it.peak;
      if (it.kind === 'burst') it.obj.scale.setScalar(1 + age * 2.2);
    }

    const ps = world.projectiles;
    while (this.projPool.length < ps.length) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(10, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#ffe08a' }),
      );
      this.projGroup.add(m);
      this.projPool.push(m);
    }
    for (let i = 0; i < this.projPool.length; i++) {
      const vis = i < ps.length;
      this.projPool[i].visible = vis;
      if (vis) this.projPool[i].position.set(ps[i].pos.x, 45, ps[i].pos.y);
    }
  }
}
