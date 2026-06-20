import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applyAttackCommand3D,
  attackCommand3DState,
  createAttackCommand3DObjects,
} from '../../src/render3d/attackCommand3d';

describe('attackCommand3DState', () => {
  it('lifts attack target cues over terrain with danger color and target radius', () => {
    const state = attackCommand3DState({
      visible: true,
      kind: 'attackTarget',
      tone: 'danger',
      label: '攻击目标',
      from: { x: 100, y: 200 },
      to: { x: 300, y: 260 },
      radius: 42,
    }, {
      t: 0.25,
      elevationAt: (x, z) => (x + z) / 100,
    });

    expect(state.visible).toBe(true);
    expect(state.color).toBe(0xff4c42);
    expect(state.line.visible).toBe(true);
    expect(state.line.length).toBeCloseTo(Math.hypot(200, 60));
    expect(state.line.position.x).toBe(200);
    expect(state.line.position.y).toBeCloseTo(6.7);
    expect(state.line.position.z).toBe(230);
    expect(state.target.position.x).toBe(300);
    expect(state.target.position.y).toBeCloseTo(8.6);
    expect(state.target.position.z).toBe(260);
    expect(state.target.radius).toBe(42);
    expect(state.target.opacity).toBeGreaterThan(0.8);
  });

  it('uses softer dashed-style state for auto targets and hides empty hints', () => {
    const auto = attackCommand3DState({
      visible: true,
      kind: 'autoTarget',
      tone: 'ready',
      label: '自动攻击',
      from: { x: 0, y: 0 },
      to: { x: 0, y: 100 },
      radius: 32,
    }, { t: 0, elevationAt: () => 0 });

    expect(auto.color).toBe(0x9cff74);
    expect(auto.line.opacity).toBeLessThan(0.5);
    expect(auto.target.opacity).toBeLessThan(0.8);

    expect(attackCommand3DState({
      visible: false,
      kind: 'none',
      tone: 'muted',
      label: '',
      from: null,
      to: null,
      radius: 0,
    }, { t: 0, elevationAt: () => 0 }).visible).toBe(false);
  });
});

describe('applyAttackCommand3D', () => {
  it('updates pooled meshes and hides them when state is hidden', () => {
    const objects = createAttackCommand3DObjects();
    const state = attackCommand3DState({
      visible: true,
      kind: 'attackMove',
      tone: 'busy',
      label: 'A-Move',
      from: { x: 0, y: 0 },
      to: { x: 100, y: 0 },
      radius: 34,
    }, { t: 0, elevationAt: () => 0 });

    applyAttackCommand3D(objects, state);

    expect(objects.root.visible).toBe(true);
    expect(objects.line.visible).toBe(true);
    expect(objects.targetRing.visible).toBe(true);
    expect(objects.targetCross.visible).toBe(true);
    expect(objects.line.scale.x).toBeCloseTo(100);
    expect((objects.targetRing.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xffd45a);

    applyAttackCommand3D(objects, attackCommand3DState({
      visible: false,
      kind: 'none',
      tone: 'muted',
      label: '',
      from: null,
      to: null,
      radius: 0,
    }, { t: 0, elevationAt: () => 0 }));

    expect(objects.root.visible).toBe(false);
  });
});
