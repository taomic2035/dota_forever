import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { commandQueue3DState, createCommandQueue3DObjects, applyCommandQueue3D } from '../../src/render3d/commandQueue3d';
import type { CommandQueueLeg } from '../../src/render/commandQueuePath';

const legs: CommandQueueLeg[] = [
  { from: { x: 1000, y: 1000 }, to: { x: 1200, y: 1000 }, kind: 'current', index: 0 },
  { from: { x: 1200, y: 1000 }, to: { x: 1400, y: 1200 }, kind: 'queued', index: 1 },
];

describe('commandQueue3DState', () => {
  it('turns queue legs into elevated ground ribbons and pulsing destination nodes', () => {
    const state = commandQueue3DState(legs, {
      t: 0.25,
      elevationAt: (x, z) => (x + z) / 1000,
    });

    expect(state.entries).toHaveLength(2);
    expect(state.entries[0].segment.visible).toBe(true);
    expect(state.entries[0].segment.length).toBeCloseTo(200);
    expect(state.entries[0].segment.position.x).toBe(1100);
    expect(state.entries[0].segment.position.y).toBeCloseTo(4.3);
    expect(state.entries[0].segment.position.z).toBe(1000);
    expect(state.entries[0].segment.opacity).toBeLessThan(state.entries[1].segment.opacity);
    expect(state.entries[1].segment.color).toBe(0x8dff7a);
    expect(state.entries[1].node.pulseScale).toBeGreaterThan(1);
    expect(state.entries[1].node.index).toBe(1);
  });
});

describe('applyCommandQueue3D', () => {
  it('updates visible pooled meshes and hides unused slots', () => {
    const objects = createCommandQueue3DObjects(3);
    const state = commandQueue3DState(legs, { t: 0, elevationAt: () => 0 });

    applyCommandQueue3D(objects, state);

    expect(objects.entries[0].segment.visible).toBe(true);
    expect(objects.entries[1].segment.visible).toBe(true);
    expect(objects.entries[2].segment.visible).toBe(false);
    expect(objects.entries[1].node.visible).toBe(true);
    expect(objects.entries[2].node.visible).toBe(false);
    expect(objects.entries[1].segment.scale.x).toBeCloseTo(Math.hypot(200, 200));
    expect((objects.entries[1].segment.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x8dff7a);
    expect(objects.root.visible).toBe(true);

    applyCommandQueue3D(objects, commandQueue3DState([], { t: 0, elevationAt: () => 0 }));

    expect(objects.root.visible).toBe(false);
  });
});
