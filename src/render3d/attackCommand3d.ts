import * as THREE from 'three';
import type { AttackCommandWorldHintModel } from '../render/attackCommandWorldHint';

export interface AttackCommand3DStateOptions {
  t: number;
  elevationAt: (x: number, z: number) => number;
}

export interface AttackCommand3DLineState {
  visible: boolean;
  position: { x: number; y: number; z: number };
  length: number;
  yaw: number;
  opacity: number;
  width: number;
}

export interface AttackCommand3DTargetState {
  visible: boolean;
  position: { x: number; y: number; z: number };
  radius: number;
  opacity: number;
  pulseScale: number;
}

export interface AttackCommand3DState {
  visible: boolean;
  color: number;
  line: AttackCommand3DLineState;
  target: AttackCommand3DTargetState;
}

export interface AttackCommand3DObjects {
  root: THREE.Group;
  line: THREE.Mesh;
  lineGlow: THREE.Mesh;
  targetRing: THREE.Mesh;
  targetCross: THREE.Group;
  crossA: THREE.Mesh;
  crossB: THREE.Mesh;
}

const GROUND_LIFT = 2.4;
const ATTACK_COLOR = 0xff4c42;
const ATTACK_MOVE_COLOR = 0xffd45a;
const AUTO_COLOR = 0x9cff74;

export function attackCommand3DState(
  hint: AttackCommandWorldHintModel,
  options: AttackCommand3DStateOptions,
): AttackCommand3DState {
  if (!hint.visible || !hint.from || !hint.to) return hiddenState();
  const dx = hint.to.x - hint.from.x;
  const dz = hint.to.y - hint.from.y;
  const length = Math.hypot(dx, dz);
  const mx = (hint.from.x + hint.to.x) / 2;
  const mz = (hint.from.y + hint.to.y) / 2;
  const auto = hint.kind === 'autoTarget';
  const pulseScale = 1 + Math.sin(options.t * Math.PI * 2) * (hint.kind === 'attackTarget' ? 0.08 : 0.05);
  const color = hint.tone === 'danger' ? ATTACK_COLOR : hint.tone === 'busy' ? ATTACK_MOVE_COLOR : AUTO_COLOR;

  return {
    visible: true,
    color,
    line: {
      visible: length > 1,
      position: { x: mx, y: options.elevationAt(mx, mz) + GROUND_LIFT, z: mz },
      length,
      yaw: -Math.atan2(dz, dx),
      opacity: auto ? 0.34 : hint.kind === 'attackMove' ? 0.5 : 0.68,
      width: auto ? 4.2 : hint.kind === 'attackMove' ? 5.4 : 6.8,
    },
    target: {
      visible: true,
      position: { x: hint.to.x, y: options.elevationAt(hint.to.x, hint.to.y) + GROUND_LIFT + 0.6, z: hint.to.y },
      radius: hint.radius,
      opacity: auto ? 0.58 : hint.kind === 'attackMove' ? 0.74 : 0.92,
      pulseScale: Math.max(0.9, pulseScale),
    },
  };
}

export function createAttackCommand3DObjects(): AttackCommand3DObjects {
  const root = new THREE.Group();
  root.name = 'attack-command-3d';
  root.visible = false;

  const line = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2.2, 1),
    new THREE.MeshBasicMaterial({ color: ATTACK_COLOR, transparent: true, opacity: 0, depthWrite: false }),
  );
  line.name = 'attack-command:line';
  line.renderOrder = 6;

  const lineGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.9, 1),
    new THREE.MeshBasicMaterial({
      color: ATTACK_COLOR,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lineGlow.name = 'attack-command:line-glow';
  lineGlow.renderOrder = 5;

  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.055, 8, 48),
    new THREE.MeshBasicMaterial({ color: ATTACK_COLOR, transparent: true, opacity: 0, depthWrite: false }),
  );
  targetRing.name = 'attack-command:target-ring';
  targetRing.rotation.x = Math.PI / 2;
  targetRing.renderOrder = 8;

  const targetCross = new THREE.Group();
  targetCross.name = 'attack-command:target-cross';
  const crossA = crossBar('attack-command:cross-a');
  const crossB = crossBar('attack-command:cross-b');
  crossB.rotation.y = Math.PI / 2;
  targetCross.add(crossA, crossB);

  root.add(lineGlow, line, targetRing, targetCross);
  return { root, line, lineGlow, targetRing, targetCross, crossA, crossB };
}

export function applyAttackCommand3D(objects: AttackCommand3DObjects, state: AttackCommand3DState): void {
  objects.root.visible = state.visible;
  if (!state.visible) {
    objects.line.visible = false;
    objects.lineGlow.visible = false;
    objects.targetRing.visible = false;
    objects.targetCross.visible = false;
    return;
  }

  objects.line.visible = state.line.visible;
  objects.line.position.set(state.line.position.x, state.line.position.y, state.line.position.z);
  objects.line.rotation.set(0, state.line.yaw, 0);
  objects.line.scale.set(state.line.length, 1, state.line.width);
  setMaterial(objects.line, state.color, state.line.opacity);

  objects.lineGlow.visible = state.line.visible;
  objects.lineGlow.position.copy(objects.line.position);
  objects.lineGlow.rotation.copy(objects.line.rotation);
  objects.lineGlow.scale.set(state.line.length, 1, state.line.width * 2.2);
  setMaterial(objects.lineGlow, state.color, state.line.opacity * 0.2);

  objects.targetRing.visible = state.target.visible;
  objects.targetRing.position.set(state.target.position.x, state.target.position.y, state.target.position.z);
  objects.targetRing.scale.setScalar(state.target.radius * state.target.pulseScale);
  setMaterial(objects.targetRing, state.color, state.target.opacity);

  objects.targetCross.visible = state.target.visible;
  objects.targetCross.position.copy(objects.targetRing.position);
  objects.targetCross.scale.setScalar(Math.max(1, state.target.radius * 0.8));
  for (const mesh of [objects.crossA, objects.crossB]) setMaterial(mesh, state.color, state.target.opacity * 0.82);
}

function hiddenState(): AttackCommand3DState {
  return {
    visible: false,
    color: AUTO_COLOR,
    line: {
      visible: false,
      position: { x: 0, y: 0, z: 0 },
      length: 0,
      yaw: 0,
      opacity: 0,
      width: 0,
    },
    target: {
      visible: false,
      position: { x: 0, y: 0, z: 0 },
      radius: 0,
      opacity: 0,
      pulseScale: 1,
    },
  };
}

function crossBar(name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.2, 0.08),
    new THREE.MeshBasicMaterial({ color: ATTACK_COLOR, transparent: true, opacity: 0, depthWrite: false }),
  );
  mesh.name = name;
  mesh.renderOrder = 9;
  return mesh;
}

function setMaterial(mesh: THREE.Mesh, color: number, opacity: number): void {
  const mat = mesh.material as THREE.MeshBasicMaterial;
  mat.color.setHex(color);
  mat.opacity = opacity;
}
