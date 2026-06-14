/** 3D 特效:消费 world 事件流 → 多层短时几何特效(爆发/光束/AoE + 受击火花),弹道同步发光体。按 fxStyle 配色/纹理语法。 */
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { Vec2 } from '../core/vec2';
import { fxStyle, type FxStyle } from '../render/fxStyle';
import { fx3DVisualState, type Fx3DGeometry, type Fx3DLayer, type Fx3DPhase } from './fx3dVisual';

interface FxItem {
  obj: THREE.Group;
  born: number;
  ttl: number;
  kind: 'burst' | 'beam' | 'aoe';
  peak: number;
  phaseContract: Fx3DPhase[];
}

const DAMAGE_STYLE: FxStyle = {
  color: '#ffcaa0',
  glow: 'rgba(255,202,160,0.45)',
  motion: 'burst',
  family: 'neutral',
  pattern: 'spark',
};

/** 3D 浮动战斗文字(伤害数字/赏金):世界锚点,renderer3d 投影到 overlay 绘制。 */
export interface FloatText3D {
  text: string; x: number; y: number; color: string; size: number; bornMs: number; life: number;
}

export class Fx3D {
  private items: FxItem[] = [];
  private projGroup = new THREE.Group();
  private projPool: THREE.Group[] = [];
  /** 浮动战斗文字队列(由 renderer3d 每帧投影绘制 + 老化清理)。 */
  floatTexts: FloatText3D[] = [];

  constructor(private scene: THREE.Scene) {
    scene.add(this.projGroup);
  }

  /** 由 loop 在 step 钩子调用(与 2D fx 接口一致)。 */
  consume(world: World, team: number | null): void {
    const t = performance.now() / 1000;
    for (const e of world.events) {
      if (e.kind === 'fx') {
        const style = fxStyle(e.fx);
        if (e.pos2) this.beam(e.pos, e.pos2, style, t);
        else if (e.radius && e.radius > 0) this.aoe(e.pos, e.radius, style, t, e.duration ?? 0.5);
        else this.burst(e.pos, style, t, 1);
      } else if (e.kind === 'unit_damaged') {
        this.burst(e.pos, DAMAGE_STYLE, t, 0.55);
        // 伤害数字飘字(英雄相关命中,与 2D 一致):目标英雄红、来源英雄金
        const tgt = world.getUnit(e.unitId), src = world.getUnit(e.sourceId);
        const tHero = !!tgt?.isHero?.(), sHero = !!src?.isHero?.();
        if (e.amount >= 1 && (tHero || sHero)) {
          const amt = Math.round(e.amount);
          this.floatTexts.push({
            text: String(amt), x: e.pos.x, y: e.pos.y,
            color: tHero ? '#ff8f8f' : '#ffe7b0',
            size: amt >= 200 ? 22 : amt >= 80 ? 18 : 14,
            bornMs: performance.now(), life: 0.9,
          });
        }
      } else if (e.kind === 'hero_kill') {
        const v = world.getUnit(e.victimId);
        if (v && e.bounty > 0) {
          this.floatTexts.push({ text: `+${e.bounty}`, x: v.pos.x, y: v.pos.y, color: '#ffd24a', size: 18, bornMs: performance.now(), life: 1.3 });
        }
      } else if (e.kind === 'last_hit') {
        // 补刀金币/反补(仅观察方队伍,避免敌方刷屏;核心农场反馈,与 2D 一致)
        const killer = world.getUnit(e.unitId);
        if (team === null || killer?.team === team) {
          if (e.deny) {
            this.floatTexts.push({ text: '拒绝', x: e.pos.x, y: e.pos.y, color: '#9fd0ff', size: 13, bornMs: performance.now(), life: 0.9 });
          } else if (e.gold > 0) {
            this.floatTexts.push({ text: `+${e.gold}`, x: e.pos.x, y: e.pos.y, color: '#ffd24a', size: 16, bornMs: performance.now(), life: 1.05 });
          }
        }
      }
    }
    if (this.floatTexts.length > 48) this.floatTexts.splice(0, this.floatTexts.length - 48);
  }

  private burst(pos: Vec2, style: FxStyle, t: number, scale: number): void {
    const state = fx3DVisualState(style, 'burst');
    const g = new THREE.Group();
    g.name = this.groupName('burst', style);
    g.position.set(pos.x, 24, pos.y);
    for (const l of state.layers) this.addBurstLayer(g, l, state.verticalLift, scale);
    this.scene.add(g);
    this.items.push({ obj: g, born: t, ttl: 0.35 * state.durationScale, kind: 'burst', peak: 1, phaseContract: state.phaseContract });
  }

  private beam(a: Vec2, b: Vec2, style: FxStyle, t: number): void {
    const state = fx3DVisualState(style, 'beam');
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const g = new THREE.Group();
    g.name = this.groupName('beam', style);
    g.position.set((a.x + b.x) / 2, 52, (a.y + b.y) / 2);
    g.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
    for (const l of state.layers) this.addBeamLayer(g, l, len);
    this.scene.add(g);
    this.items.push({ obj: g, born: t, ttl: 0.3 * state.durationScale, kind: 'beam', peak: 1, phaseContract: state.phaseContract });
  }

  private aoe(pos: Vec2, radius: number, style: FxStyle, t: number, dur: number): void {
    const state = fx3DVisualState(style, 'aoe');
    const g = new THREE.Group();
    g.name = this.groupName('aoe', style);
    g.position.set(pos.x, 5, pos.y);
    for (const l of state.layers) this.addAoeLayer(g, l, radius);
    this.scene.add(g);
    this.items.push({ obj: g, born: t, ttl: Math.min(2.6, Math.max(0.4, dur) * state.durationScale), kind: 'aoe', peak: 1, phaseContract: state.phaseContract });
  }

  /** 由 renderer3d.render 每帧调用:衰减特效 + 同步弹道。 */
  update(world: World, now: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      const age = (now - it.born) / it.ttl;
      if (age >= 1) {
        this.scene.remove(it.obj);
        this.disposeObject(it.obj);
        this.items.splice(i, 1);
        continue;
      }
      const phase = this.phaseAt(it.phaseContract, age);
      this.fadeObject(it.obj, age, it.peak * phase.opacity);
      if (it.kind === 'burst') it.obj.scale.setScalar((1 + age * 2.2) * phase.scale);
      if (it.kind === 'beam') it.obj.scale.set(1, phase.scale, phase.scale);
      if (it.kind === 'aoe') {
        it.obj.scale.setScalar(phase.scale);
        it.obj.rotation.y += 0.004 * Math.max(0.45, phase.opacity);
      }
    }

    const ps = world.projectiles;
    while (this.projPool.length < ps.length) {
      const g = this.createProjectileGroup(fxStyle('basic_attack_projectile'));
      this.projGroup.add(g);
      this.projPool.push(g);
    }
    for (let i = 0; i < this.projPool.length; i++) {
      const vis = i < ps.length;
      const g = this.projPool[i];
      g.visible = vis;
      if (vis) {
        const p = ps[i];
        this.restyleProjectile(g, fxStyle(p.style ?? (p.kind === 'ability' ? 'arcanebolt' : 'basic_attack_projectile')));
        g.position.set(p.pos.x, 45, p.pos.y);
        g.rotation.y += 0.12;
      }
    }
  }

  private material(l: Fx3DLayer, opacity = l.opacity): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(l.color),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  private add(mesh: THREE.Mesh, l: Fx3DLayer, group: THREE.Group): void {
    mesh.name = `fx3d-layer:${l.role}:${l.shape}`;
    mesh.userData.fxOpacity = l.opacity;
    mesh.userData.fxSpin = l.spin;
    group.add(mesh);
  }

  private addBurstLayer(group: THREE.Group, l: Fx3DLayer, lift: number, scale: number): void {
    for (let i = 0; i < l.count; i++) {
      const a = (i / l.count) * Math.PI * 2;
      const r = (16 + (i % 4) * 7) * scale * l.scale;
      let mesh: THREE.Mesh;
      if (l.shape === 'shard') mesh = new THREE.Mesh(new THREE.ConeGeometry(4 * scale, 22 * scale * l.scale, 4), this.material(l));
      else if (l.shape === 'cloud') mesh = new THREE.Mesh(new THREE.SphereGeometry(14 * scale * l.scale, 8, 6), this.material(l));
      else if (l.shape === 'crack') mesh = new THREE.Mesh(new THREE.BoxGeometry(34 * scale * l.scale, 2, 5 * scale), this.material(l));
      else if (l.shape === 'halo' || l.shape === 'rune') mesh = new THREE.Mesh(new THREE.TorusGeometry(18 * scale * l.scale, 1.8 * scale, 6, 28), this.material(l));
      else mesh = new THREE.Mesh(new THREE.SphereGeometry((l.role === 'glow' ? 18 : 7) * scale * l.scale, 8, 8), this.material(l));
      mesh.position.set(Math.cos(a) * r, lift + (i % 3) * 7, Math.sin(a) * r);
      mesh.rotation.set(i * 0.7, a, l.shape === 'crack' ? a : i * 0.37);
      if (l.role === 'core' || l.role === 'glow') mesh.position.set(0, lift, 0);
      this.add(mesh, l, group);
    }
  }

  private addBeamLayer(group: THREE.Group, l: Fx3DLayer, len: number): void {
    for (let i = 0; i < l.count; i++) {
      const x = l.count === 1 ? 0 : -len / 2 + (len * (i + 0.5)) / l.count;
      const wiggle = i % 2 === 0 ? 10 : -10;
      let mesh: THREE.Mesh;
      if (l.shape === 'beam') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(5 * l.scale, 5 * l.scale, len, 8), this.material(l));
        mesh.rotation.z = Math.PI / 2;
      } else if (l.shape === 'jagged') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(18, len / (l.count + 2)), 3.5 * l.scale, 3.5 * l.scale), this.material(l));
        mesh.position.set(x, wiggle, i % 3 === 0 ? -wiggle * 0.65 : wiggle * 0.65);
        mesh.rotation.z = (i % 2 === 0 ? 0.32 : -0.32);
      } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(5 * l.scale, 6, 6), this.material(l));
        mesh.position.set(x, wiggle * 0.85, (i % 3 - 1) * 8);
      }
      this.add(mesh, l, group);
    }
  }

  private addAoeLayer(group: THREE.Group, l: Fx3DLayer, radius: number): void {
    for (let i = 0; i < l.count; i++) {
      const a = (i / l.count) * Math.PI * 2;
      const r = radius * (l.role === 'glow' ? 1.02 : l.shape === 'cloud' ? 0.48 + (i % 3) * 0.12 : 0.78);
      let mesh: THREE.Mesh;
      if (l.shape === 'ring') mesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.68 * l.scale, radius * l.scale, 42), this.material(l));
      else if (l.shape === 'halo' || l.shape === 'rune') mesh = new THREE.Mesh(new THREE.TorusGeometry(radius * (0.52 + i * 0.11) * l.scale, 2.2, 6, 42), this.material(l));
      else if (l.shape === 'cloud') mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.09 * l.scale, 9, 7), this.material(l));
      else if (l.shape === 'crack') mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.34 * l.scale, 2, 7), this.material(l));
      else if (l.shape === 'shard') mesh = new THREE.Mesh(new THREE.ConeGeometry(6 * l.scale, 28 * l.scale, 4), this.material(l));
      else mesh = new THREE.Mesh(new THREE.SphereGeometry(7 * l.scale, 6, 6), this.material(l));
      mesh.position.set(Math.cos(a) * r, l.shape === 'cloud' ? 18 + (i % 3) * 7 : 1, Math.sin(a) * r);
      mesh.rotation.set(-Math.PI / 2, a, i * 0.33);
      if (l.shape === 'ring' || l.shape === 'halo' || l.shape === 'rune') mesh.position.set(0, 1 + i * 2, 0);
      this.add(mesh, l, group);
    }
  }

  private createProjectileGroup(style: FxStyle): THREE.Group {
    const g = new THREE.Group();
    g.name = this.groupName('projectile', style);
    const state = fx3DVisualState(style, 'projectile');
    for (const l of state.layers) {
      for (let i = 0; i < l.count; i++) {
        const a = (i / Math.max(1, l.count)) * Math.PI * 2;
        const mesh = l.shape === 'rune'
          ? new THREE.Mesh(new THREE.TorusGeometry(10 * l.scale, 1.4, 5, 18), this.material(l))
          : l.shape === 'shard'
            ? new THREE.Mesh(new THREE.ConeGeometry(4 * l.scale, 16 * l.scale, 4), this.material(l))
            : new THREE.Mesh(new THREE.SphereGeometry((l.role === 'glow' ? 11 : 5) * l.scale, 8, 8), this.material(l));
        mesh.position.set(l.role === 'trail' ? -12 - i * 4 : Math.cos(a) * 5, Math.sin(a) * 4, l.role === 'trail' ? (i % 2 === 0 ? 4 : -4) : Math.sin(a) * 5);
        mesh.rotation.set(a, i * 0.4, a * 0.5);
        this.add(mesh, l, g);
      }
    }
    return g;
  }

  private groupName(geometry: Fx3DGeometry, style: FxStyle): string {
    return `fx3d:${geometry}:${style.family}:${style.pattern}`;
  }

  private restyleProjectile(g: THREE.Group, style: FxStyle): void {
    const color = new THREE.Color(style.color);
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined;
      if (mat?.color) mat.color.copy(color);
    });
  }

  private fadeObject(root: THREE.Group, age: number, peak: number): void {
    const fade = Math.max(0, 1 - age) * peak;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined;
      if (mat?.opacity !== undefined) mat.opacity = (mesh.userData.fxOpacity ?? 1) * fade;
      const spin = mesh.userData.fxSpin ?? 0;
      if (spin) mesh.rotation.y += spin * 0.018;
    });
  }

  private phaseAt(phaseContract: Fx3DPhase[], age: number): { opacity: number; scale: number } {
    const total = phaseContract.reduce((sum, phase) => sum + phase.duration, 0) || 1;
    const cursor = Math.min(1, Math.max(0, age)) * total;
    let elapsed = 0;
    for (let i = 0; i < phaseContract.length; i++) {
      const phase = phaseContract[i];
      const start = elapsed;
      elapsed += phase.duration;
      if (cursor <= elapsed) {
        const next = phaseContract[Math.min(i + 1, phaseContract.length - 1)];
        const local = phase.duration > 0 ? Math.min(1, Math.max(0, (cursor - start) / phase.duration)) : 1;
        return {
          opacity: phase.opacity + (next.opacity - phase.opacity) * local,
          scale: phase.scale + (next.scale - phase.scale) * local,
        };
      }
    }
    const last = phaseContract[phaseContract.length - 1];
    return { opacity: last?.opacity ?? 1, scale: last?.scale ?? 1 };
  }

  private disposeObject(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) for (const m of material) m.dispose();
      else material?.dispose();
    });
  }
}
