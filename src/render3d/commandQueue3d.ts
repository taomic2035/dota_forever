import * as THREE from 'three';
import type { CommandQueueLeg } from '../render/commandQueuePath';

export interface CommandQueue3DStateOptions {
  t: number;
  elevationAt: (x: number, z: number) => number;
}

export interface CommandQueue3DSegmentState {
  visible: boolean;
  position: { x: number; y: number; z: number };
  length: number;
  yaw: number;
  color: number;
  opacity: number;
  width: number;
}

export interface CommandQueue3DNodeState {
  visible: boolean;
  position: { x: number; y: number; z: number };
  color: number;
  opacity: number;
  pulseScale: number;
  index: number;
}

export interface CommandQueue3DEntryState {
  segment: CommandQueue3DSegmentState;
  node: CommandQueue3DNodeState;
}

export interface CommandQueue3DState {
  entries: CommandQueue3DEntryState[];
}

export interface CommandQueue3DEntryObjects {
  segment: THREE.Mesh;
  halo: THREE.Mesh;
  node: THREE.Group;
  nodeRing: THREE.Mesh;
  nodeCore: THREE.Mesh;
  flag: THREE.Mesh;
}

export interface CommandQueue3DObjects {
  root: THREE.Group;
  entries: CommandQueue3DEntryObjects[];
}

const CURRENT_COLOR = 0xc9ffc0;
const QUEUED_COLOR = 0x8dff7a;
const GROUND_LIFT = 2.2;

export function commandQueue3DState(legs: CommandQueueLeg[], options: CommandQueue3DStateOptions): CommandQueue3DState {
  return {
    entries: legs.map((leg) => {
      const dx = leg.to.x - leg.from.x;
      const dz = leg.to.y - leg.from.y;
      const length = Math.hypot(dx, dz);
      const mx = (leg.from.x + leg.to.x) / 2;
      const mz = (leg.from.y + leg.to.y) / 2;
      const isQueued = leg.kind === 'queued';
      const color = isQueued ? QUEUED_COLOR : CURRENT_COLOR;
      const pulse = 1 + Math.sin(options.t * Math.PI * 2 + leg.index * 0.9) * 0.08;

      return {
        segment: {
          visible: length > 1,
          position: { x: mx, y: options.elevationAt(mx, mz) + GROUND_LIFT, z: mz },
          length,
          yaw: -Math.atan2(dz, dx),
          color,
          opacity: isQueued ? 0.68 : 0.34,
          width: isQueued ? 7.5 : 4.8,
        },
        node: {
          visible: true,
          position: { x: leg.to.x, y: options.elevationAt(leg.to.x, leg.to.y) + GROUND_LIFT + 0.8, z: leg.to.y },
          color,
          opacity: isQueued ? 0.92 : 0.62,
          pulseScale: Math.max(0.92, pulse),
          index: leg.index,
        },
      };
    }),
  };
}

export function createCommandQueue3DObjects(maxEntries = 10): CommandQueue3DObjects {
  const root = new THREE.Group();
  root.name = 'command-queue-3d';
  root.visible = false;

  const entries: CommandQueue3DEntryObjects[] = [];
  for (let i = 0; i < maxEntries; i++) {
    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2.8, 1),
      new THREE.MeshBasicMaterial({ color: CURRENT_COLOR, transparent: true, opacity: 0, depthWrite: false }),
    );
    segment.name = `command-queue:segment:${i}`;
    segment.renderOrder = 5;

    const halo = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1.2, 1),
      new THREE.MeshBasicMaterial({
        color: CURRENT_COLOR,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.name = `command-queue:halo:${i}`;
    halo.renderOrder = 4;

    const node = new THREE.Group();
    node.name = `command-queue:node:${i}`;
    const nodeRing = new THREE.Mesh(
      new THREE.TorusGeometry(18, 2.6, 6, 24),
      new THREE.MeshBasicMaterial({ color: CURRENT_COLOR, transparent: true, opacity: 0, depthWrite: false }),
    );
    nodeRing.name = `command-queue:node-ring:${i}`;
    nodeRing.rotation.x = Math.PI / 2;
    nodeRing.renderOrder = 6;

    const nodeCore = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 10, 7, 8),
      new THREE.MeshBasicMaterial({ color: CURRENT_COLOR, transparent: true, opacity: 0, depthWrite: false }),
    );
    nodeCore.name = `command-queue:node-core:${i}`;
    nodeCore.renderOrder = 7;

    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(7, 28, 3),
      new THREE.MeshBasicMaterial({ color: CURRENT_COLOR, transparent: true, opacity: 0, depthWrite: false }),
    );
    flag.name = `command-queue:flag:${i}`;
    flag.position.y = 20;
    flag.rotation.z = Math.PI;
    flag.renderOrder = 7;

    node.add(nodeRing, nodeCore, flag);
    root.add(halo, segment, node);
    const entry = { segment, halo, node, nodeRing, nodeCore, flag };
    hideEntry(entry);
    entries.push(entry);
  }

  return { root, entries };
}

export function applyCommandQueue3D(objects: CommandQueue3DObjects, state: CommandQueue3DState): void {
  objects.root.visible = state.entries.length > 0;
  objects.entries.forEach((entry, i) => {
    const s = state.entries[i];
    if (!s) {
      hideEntry(entry);
      return;
    }

    entry.segment.visible = s.segment.visible;
    entry.segment.position.set(s.segment.position.x, s.segment.position.y, s.segment.position.z);
    entry.segment.rotation.set(0, s.segment.yaw, 0);
    entry.segment.scale.set(s.segment.length, 1, s.segment.width);
    setMaterial(entry.segment, s.segment.color, s.segment.opacity);

    entry.halo.visible = s.segment.visible;
    entry.halo.position.copy(entry.segment.position);
    entry.halo.rotation.copy(entry.segment.rotation);
    entry.halo.scale.set(s.segment.length, 1, s.segment.width * 2.15);
    setMaterial(entry.halo, s.segment.color, s.segment.opacity * 0.18);

    entry.node.visible = s.node.visible;
    entry.node.position.set(s.node.position.x, s.node.position.y, s.node.position.z);
    entry.node.scale.setScalar(s.node.pulseScale);
    entry.nodeRing.rotation.z = s.node.index * 0.62;
    for (const mesh of [entry.nodeRing, entry.nodeCore, entry.flag]) {
      setMaterial(mesh, s.node.color, s.node.opacity);
    }
    setMaterial(entry.nodeRing, s.node.color, s.node.opacity * 0.92);
    setMaterial(entry.flag, s.node.color, s.node.opacity * 0.72);
  });
}

function hideEntry(entry: CommandQueue3DEntryObjects): void {
  entry.segment.visible = false;
  entry.halo.visible = false;
  entry.node.visible = false;
}

function setMaterial(mesh: THREE.Mesh, color: number, opacity: number): void {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.color.setHex(color);
  mat.opacity = opacity;
}
