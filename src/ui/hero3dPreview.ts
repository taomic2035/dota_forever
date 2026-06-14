import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AnimationAction,
  AnimationMixer,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  LoopOnce,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  ShadowMaterial,
  WebGLRenderer,
} from 'three';
import { CLASSIC_HERO3D_ASSETS, REQUIRED_HERO3D_ACTIONS, type Hero3DActionName } from '../render/hero3dAssets';
import { createHero3DModel, heroMaterialSurfaceProfile, updateHeroRuntimePresentation } from '../render/hero3dFactory';

interface PreviewHero {
  anchor: Group;
  model: Group;
  mixer: AnimationMixer;
  actions: Map<Hero3DActionName, AnimationAction>;
  activeAction: Hero3DActionName;
  label: HTMLElement;
}

export interface HeroRuntimePresentationPreviewSmoke {
  runtimeActionRoots: number;
  runtimeSurfaceRoots: number;
  animatedRoots: number;
  actionReactiveParts: number;
  surfaceMaterials: number;
  glintLayers: number;
  actionStates: Record<string, number>;
  shaderIntents: Record<string, number>;
}

export function showHero3DPreview(parent: HTMLElement): void {
  parent.innerHTML = '';
  const mount = document.createElement('div');
  mount.style.cssText = [
    'position:fixed',
    'inset:0',
    'overflow:hidden',
    'color:#f2e9cf',
    'background:radial-gradient(circle at 50% 38%, #314042 0%, #111716 42%, #050706 100%)',
  ].join(';');
  parent.appendChild(mount);

  const scene = new Scene();
  scene.background = null;
  scene.fog = new Fog('#050706', 13, 28);
  const camera = new PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8.6, 17.2);
  camera.lookAt(0, 1.05, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  mount.appendChild(renderer.domElement);

  const hemi = new HemisphereLight('#e7f4ff', '#1b1a16', 2.4);
  scene.add(hemi);
  const key = new DirectionalLight('#fff0bd', 4.2);
  key.position.set(-4, 9, 7);
  key.castShadow = true;
  scene.add(key);
  const rim = new DirectionalLight('#8bd8ff', 2.2);
  rim.position.set(6, 5, -6);
  scene.add(rim);
  const warmFill = new DirectionalLight('#f6b35c', 1.2);
  warmFill.position.set(4, 4, 6);
  scene.add(warmFill);

  scene.add(makeBackdrop());
  scene.add(makeGround());

  const vignette = document.createElement('div');
  vignette.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:4',
    'pointer-events:none',
    'background:linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,0) 38%, rgba(0,0,0,.5)), radial-gradient(circle at 50% 50%, rgba(255,230,150,.1), rgba(0,0,0,0) 42%, rgba(0,0,0,.56) 100%)',
  ].join(';');
  mount.appendChild(vignette);

  const labelsLayer = document.createElement('div');
  labelsLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;';
  mount.appendChild(labelsLayer);

  const heroes: PreviewHero[] = [];
  CLASSIC_HERO3D_ASSETS.forEach((asset, index) => {
    const { root: model, clips } = createHero3DModel(asset);
    const col = index % 5;
    const row = Math.floor(index / 5);
    const anchor = new Group();
    anchor.name = `hero3d-slot:${asset.key}`;
    anchor.position.set((col - 2) * 2.65, 0, (row - 0.5) * 2.3);
    anchor.rotation.y = row === 0 ? 0.24 : -0.18;
    anchor.add(makeHeroPad(asset.textures[0].palette[1], asset.textures[3].palette[0], asset.model.groundRadius));
    anchor.add(makeHeroLightColumn(asset.textures[3].palette[0], asset.model.groundRadius));
    anchor.add(model);
    scene.add(anchor);

    const mixer = new AnimationMixer(model);
    const actions = new Map<Hero3DActionName, AnimationAction>();
    for (const clip of clips) {
      const actionName = clip.name.split(':').pop() as Hero3DActionName;
      const action = mixer.clipAction(clip);
      if (clip.userData?.loop === LoopOnce) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions.set(actionName, action);
    }
    actions.get('idle')?.play();

    const label = document.createElement('div');
    label.style.cssText = [
      'position:absolute',
      'transform:translate(-50%, 28px)',
      'min-width:96px',
      'padding:4px 7px',
      'border:1px solid rgba(230,205,120,.5)',
      'border-radius:6px',
      'background:linear-gradient(180deg, rgba(20,24,22,.88), rgba(7,9,8,.78))',
      'box-shadow:0 10px 24px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.12)',
      'text-align:center',
      'font:700 11px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'line-height:1.35',
      'letter-spacing:0',
    ].join(';');
    label.innerHTML = `<span style="color:${asset.textures[0].palette[1]}">${asset.name}</span><br><span style="font-weight:500;color:#d0d8c2">${asset.title}</span>`;
    labelsLayer.appendChild(label);
    updateHeroRuntimePresentation(model, 'idle', 420);
    heroes.push({ anchor, model, mixer, actions, activeAction: 'idle', label });
  });

  const panel = createActionPanel((action) => {
    for (const hero of heroes) playAction(hero, action);
  });
  mount.appendChild(panel);

  const title = document.createElement('div');
  title.style.cssText = 'position:fixed;left:22px;top:18px;z-index:7;text-shadow:0 2px 14px #000;font:800 18px system-ui,sans-serif;letter-spacing:0;';
  title.textContent = '经典 10 英雄 · 游戏内 Three.js 模型 / 纹理 / 动作预览';
  mount.appendChild(title);

  const clock = new Clock();
  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    for (const hero of heroes) {
      hero.mixer.update(dt);
      updateHeroRuntimePresentation(hero.model, hero.activeAction, clock.elapsedTime * 1000);
      hero.anchor.rotation.y += Math.sin(clock.elapsedTime * 0.75 + hero.anchor.position.x) * 0.0009;
      updateLabel(camera, hero);
    }
    if (window.__hero3dPreview) {
      window.__hero3dPreview.runtimePresentation = heroRuntimePresentationSmokeForModels(heroes.map((hero) => hero.model));
    }
    renderer.render(scene, camera);
  });

  window.__hero3dPreview = {
    count: heroes.length,
    keys: CLASSIC_HERO3D_ASSETS.map((asset) => asset.key),
    actions: [...REQUIRED_HERO3D_ACTIONS],
    textureChannels: CLASSIC_HERO3D_ASSETS[0].textures.map((texture) => texture.channel),
    readability: CLASSIC_HERO3D_ASSETS.map((asset) => ({
      key: asset.key,
      primaryRead: asset.readability.primaryRead,
      anchors: asset.readability.silhouetteAnchors.length,
      fxPriority: asset.readability.fxPriority,
    })),
    surfaceRealism: heroes.map((hero, index) => {
      const asset = CLASSIC_HERO3D_ASSETS[index];
      return {
        key: asset.key,
        contactShadow: !!hero.model.getObjectByName(`hero3d:v6-contact-shadow:${asset.key}`),
        contactShadowOpacity: hero.model.userData.surfaceRealism?.contactShadowOpacity ?? 0,
        glints: countObjectsByPrefix(hero.model, 'v6-surface-glint:'),
        rimEligibleParts: asset.model.parts.filter((part) => heroMaterialSurfaceProfile(part.material).rimLightIntensity >= 0.58).length,
      };
    }),
    runtimePresentation: heroRuntimePresentationSmokeForModels(heroes.map((hero) => hero.model)),
  };
}

function countObjectsByPrefix(root: Group, prefix: string): number {
  let count = 0;
  root.traverse((obj) => {
    if (obj.name.startsWith(prefix)) count++;
  });
  return count;
}

function playAction(hero: PreviewHero, actionName: Hero3DActionName): void {
  const next = hero.actions.get(actionName);
  if (!next) return;
  hero.activeAction = actionName;
  updateHeroRuntimePresentation(hero.model, actionName, 0);
  for (const action of hero.actions.values()) {
    if (action !== next && actionName !== 'idle') action.fadeOut(0.12);
  }
  next.reset().fadeIn(0.08).play();
  if (actionName !== 'idle' && actionName !== 'walk') {
    const idle = hero.actions.get('idle');
    setTimeout(() => {
      next.fadeOut(0.18);
      idle?.reset().fadeIn(0.18).play();
      hero.activeAction = 'idle';
    }, Math.max(360, next.getClip().duration * 760));
  }
}

export function heroRuntimePresentationSmokeForModels(models: Group[]): HeroRuntimePresentationPreviewSmoke {
  const smoke: HeroRuntimePresentationPreviewSmoke = {
    runtimeActionRoots: 0,
    runtimeSurfaceRoots: 0,
    animatedRoots: 0,
    actionReactiveParts: 0,
    surfaceMaterials: 0,
    glintLayers: 0,
    actionStates: {},
    shaderIntents: {},
  };
  for (const model of models) {
    const runtimeAction = model.userData.runtimeAction;
    const runtimeSurface = model.userData.runtimeSurface;
    if (runtimeAction?.heroRuntimeAction) smoke.runtimeActionRoots++;
    if (runtimeSurface?.heroRuntimeSurface) {
      smoke.runtimeSurfaceRoots++;
      const intent = runtimeSurface.shaderIntent ?? model.userData.runtimeSurfaceShaderIntent;
      smoke.shaderIntents[intent] = (smoke.shaderIntents[intent] ?? 0) + 1;
    }
    if (model.userData.runtimeActionAnimated || model.userData.runtimeSurfaceAnimated) smoke.animatedRoots++;
    const state = model.userData.runtimeActionState;
    if (state) smoke.actionStates[state] = (smoke.actionStates[state] ?? 0) + 1;
    model.traverse((obj) => {
      if (obj.userData.heroRuntimePart && obj.userData.runtimeActionReactive) smoke.actionReactiveParts++;
      if (!(obj instanceof Mesh)) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (
          (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial) &&
          material.userData.heroRuntimeSurfaceMaterial
        ) {
          smoke.surfaceMaterials++;
          if (material.userData.heroRuntimeGlintLayer) smoke.glintLayers++;
        }
      }
    });
  }
  return smoke;
}

function createActionPanel(onAction: (action: Hero3DActionName) => void): HTMLElement {
  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed',
    'right:18px',
    'top:18px',
    'z-index:8',
    'display:flex',
    'gap:6px',
    'flex-wrap:wrap',
    'justify-content:flex-end',
    'max-width:432px',
    'padding:8px',
    'border:1px solid rgba(226,203,133,.2)',
    'border-radius:8px',
    'background:linear-gradient(180deg, rgba(18,22,19,.72), rgba(5,7,6,.52))',
    'box-shadow:0 14px 42px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)',
    'backdrop-filter:blur(10px)',
  ].join(';');
  for (const action of REQUIRED_HERO3D_ACTIONS) {
    const button = document.createElement('button');
    button.textContent = action;
    button.style.cssText = [
      'border:1px solid rgba(230,205,120,.48)',
      'border-radius:6px',
      'background:linear-gradient(180deg, rgba(34,40,32,.9), rgba(12,15,14,.82))',
      'color:#f4e6b8',
      'padding:7px 9px',
      'font:700 12px system-ui,sans-serif',
      'cursor:pointer',
    ].join(';');
    button.addEventListener('click', () => onAction(action));
    panel.appendChild(button);
  }
  return panel;
}

function updateLabel(camera: PerspectiveCamera, hero: PreviewHero): void {
  const p = hero.anchor.position.clone();
  p.y -= 0.34;
  p.project(camera);
  hero.label.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
  hero.label.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight}px`;
}

function makeGround() {
  const group = new Group();
  const stage = new Mesh(
    new PlaneGeometry(18.6, 8.8, 1, 1),
    new MeshStandardMaterial({
      color: '#18201b',
      roughness: 0.82,
      metalness: 0.08,
    }),
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.y = -0.05;
  stage.receiveShadow = true;
  group.add(stage);

  const ring = new Mesh(
    new RingGeometry(2.4, 8.4, 96),
    new MeshBasicMaterial({ color: '#c4a65a', transparent: true, opacity: 0.16 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.035;
  group.add(ring);

  const geometry = new PlaneGeometry(18, 8.5, 1, 1);
  const material = new ShadowMaterial({ color: '#000000', opacity: 0.36 });
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function makeBackdrop(): Group {
  const group = new Group();
  const pillarMaterial = new MeshStandardMaterial({
    color: '#28322b',
    roughness: 0.78,
    metalness: 0.18,
    emissive: '#111712',
    emissiveIntensity: 0.28,
  });
  for (let i = 0; i < 7; i++) {
    const x = -7.2 + i * 2.4;
    const pillar = new Mesh(new CylinderGeometry(0.08, 0.16, 2.6, 8), pillarMaterial);
    pillar.position.set(x, 1.18, -3.45);
    pillar.castShadow = true;
    group.add(pillar);

    const banner = new Mesh(
      new PlaneGeometry(0.72, 1.52),
      new MeshBasicMaterial({
        color: i % 2 ? '#263d40' : '#403824',
        transparent: true,
        opacity: 0.24,
      }),
    );
    banner.position.set(x + 0.34, 1.32, -3.5);
    banner.rotation.y = 0.08;
    group.add(banner);
  }

  const backGlow = new Mesh(
    new PlaneGeometry(15.6, 4.8),
    new MeshBasicMaterial({
      color: '#b8d6b4',
      transparent: true,
      opacity: 0.055,
    }),
  );
  backGlow.position.set(0, 1.72, -3.66);
  group.add(backGlow);
  return group;
}

function makeHeroPad(color: string, glow: string, radius: number): Group {
  const group = new Group();
  const base = new Mesh(
    new CylinderGeometry(radius * 0.98, radius * 1.12, 0.16, 36),
    new MeshStandardMaterial({
      color,
      emissive: new Color(glow),
      emissiveIntensity: 0.22,
      roughness: 0.52,
      metalness: 0.24,
    }),
  );
  base.position.y = -0.01;
  base.receiveShadow = true;
  group.add(base);

  const rim = new Mesh(
    new RingGeometry(radius * 1.02, radius * 1.2, 48),
    new MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.46 }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.09;
  group.add(rim);

  return group;
}

function makeHeroLightColumn(glow: string, radius: number): Mesh {
  const mesh = new Mesh(
    new CylinderGeometry(radius * 0.52, radius * 0.95, 2.9, 32, 1, true),
    new MeshBasicMaterial({
      color: glow,
      blending: AdditiveBlending,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
    }),
  );
  mesh.position.y = 1.42;
  return mesh;
}

declare global {
  interface Window {
    __hero3dPreview?: {
      count: number;
      keys: string[];
      actions: string[];
      textureChannels: string[];
      readability: {
        key: string;
        primaryRead: string;
        anchors: number;
        fxPriority: number;
      }[];
      surfaceRealism: {
        key: string;
        contactShadow: boolean;
        contactShadowOpacity: number;
        glints: number;
        rimEligibleParts: number;
      }[];
      runtimePresentation: HeroRuntimePresentationPreviewSmoke;
    };
  }
}
