import * as THREE from 'three';

export interface HeroStatusFxInput {
  castGlow: number;
  channelPulse: number;
  stunStars: number;
  invisibilityAlpha: number;
  t: number;
}

export interface HeroStatusFxState {
  stunRing: { visible: boolean; opacity: number; rotation: number; scale: number };
  castGlow: { visible: boolean; opacity: number; scale: number };
  invisShell: { visible: boolean; opacity: number; scale: number };
}

export interface HeroStatusFxObjects {
  root: THREE.Group;
  stunRing: THREE.Mesh;
  castGlow: THREE.Mesh;
  invisShell: THREE.Mesh;
}

export function heroStatusFxState(i: HeroStatusFxInput): HeroStatusFxState {
  const castEnergy = Math.max(0, i.castGlow);
  const channelEnergy = Math.max(0, i.channelPulse);
  const combinedCast = Math.min(1.35, castEnergy + channelEnergy * 0.45);
  const invisible = i.invisibilityAlpha < 0.95;

  return {
    stunRing: {
      visible: i.stunStars > 0.05,
      opacity: Math.min(0.9, i.stunStars * 0.82),
      rotation: i.t * 2.6,
      scale: 0.86 + i.stunStars * 0.22,
    },
    castGlow: {
      visible: combinedCast > 0.08,
      opacity: Math.min(0.86, 0.24 + combinedCast * 0.46),
      scale: 0.82 + combinedCast * 0.58,
    },
    invisShell: {
      visible: invisible,
      opacity: invisible ? 0.18 + (1 - i.invisibilityAlpha) * 0.34 : 0,
      scale: 1.04 + (1 - i.invisibilityAlpha) * 0.12,
    },
  };
}

export function createHeroStatusFxObjects(): HeroStatusFxObjects {
  const root = new THREE.Group();
  root.name = 'hero-status-fx';

  const stunRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.035, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xffdc5c, transparent: true, opacity: 0, depthWrite: false }),
  );
  stunRing.name = 'status-fx:stun-ring';
  stunRing.position.y = 3.05;
  stunRing.rotation.x = Math.PI / 2;

  const castGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0x93d7ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  castGlow.name = 'status-fx:cast-glow';
  castGlow.position.set(0.72, 1.7, -0.28);

  const invisShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 16, 10),
    new THREE.MeshBasicMaterial({
      color: 0x9c88ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  invisShell.name = 'status-fx:invis-shell';
  invisShell.position.y = 1.2;

  root.add(stunRing, castGlow, invisShell);
  applyHeroStatusFx(rootObjects(root, stunRing, castGlow, invisShell), heroStatusFxState({
    castGlow: 0,
    channelPulse: 0,
    stunStars: 0,
    invisibilityAlpha: 1,
    t: 0,
  }));
  return rootObjects(root, stunRing, castGlow, invisShell);
}

export function applyHeroStatusFx(objects: HeroStatusFxObjects, state: HeroStatusFxState): void {
  objects.stunRing.visible = state.stunRing.visible;
  (objects.stunRing.material as THREE.MeshBasicMaterial).opacity = state.stunRing.opacity;
  objects.stunRing.rotation.z = state.stunRing.rotation;
  objects.stunRing.scale.setScalar(state.stunRing.scale);

  objects.castGlow.visible = state.castGlow.visible;
  (objects.castGlow.material as THREE.MeshBasicMaterial).opacity = state.castGlow.opacity;
  objects.castGlow.scale.setScalar(state.castGlow.scale);

  objects.invisShell.visible = state.invisShell.visible;
  (objects.invisShell.material as THREE.MeshBasicMaterial).opacity = state.invisShell.opacity;
  objects.invisShell.scale.setScalar(state.invisShell.scale);
}

function rootObjects(root: THREE.Group, stunRing: THREE.Mesh, castGlow: THREE.Mesh, invisShell: THREE.Mesh): HeroStatusFxObjects {
  return { root, stunRing, castGlow, invisShell };
}
