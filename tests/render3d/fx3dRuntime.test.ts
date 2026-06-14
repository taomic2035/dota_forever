import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Fx3D } from '../../src/render3d/fx3d';
import type { GameEvent } from '../../src/sim/world';

function fakeWorld(events: GameEvent[]): any {
  return { events, projectiles: [] };
}

describe('Fx3D runtime inspection', () => {
  it('names V5 runtime groups and layers for Opus smoke checks', () => {
    const scene = new THREE.Scene();
    const fx = new Fx3D(scene);

    fx.consume(fakeWorld([{ kind: 'fx', fx: 'fireblast', pos: { x: 0, y: 0 } }]), null);

    const names: string[] = [];
    scene.traverse((obj) => {
      if (obj.name) names.push(obj.name);
    });

    expect(names.some((name) => name.startsWith('fx3d:burst:fire:embers'))).toBe(true);
    expect(names.some((name) => name.startsWith('fx3d-layer:core:sphere'))).toBe(true);
    expect(names.some((name) => name.startsWith('fx3d-layer:glow:sphere'))).toBe(true);
  });
});
