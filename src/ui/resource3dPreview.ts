import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import {
  RESOURCE3D_CATEGORIES,
  RESOURCE3D_SAMPLE_ASSETS,
  type Resource3DAssetSpec,
  type Resource3DCategory,
} from '../render/resource3dAssets';
import { createResource3DModel } from '../render/resource3dFactory';

const CATEGORY_LABEL: Record<Resource3DCategory, string> = {
  lane_units: '兵线单位',
  neutral_units: '中立野怪',
  boss_objectives: 'Boss / 目标',
  buildings: '建筑',
  shops_npcs: '商店 / NPC',
  couriers_summons: '信使 / 召唤物',
  items: '物品',
  item_components: '物品组件',
  consumables: '消耗品',
  wards_traps: '守卫 / 陷阱',
  spell_fx: '技能 / 投射物',
  projectiles: '独立弹道',
  aoe_indicators: '范围指示',
  environment_fx: '环境特效',
  map_props: '地图道具',
  runes_powerups: '神符 / 增益',
  pickups_drops: '掉落 / 拾取',
  status_effects: '状态效果',
  ability_icons: '技能图标',
  targeting_reticles: '施法指示',
  combat_numbers: '战斗数字',
  health_mana_ui: '血蓝条 UI',
  screen_overlays: '屏幕叠层',
  announcements: '击杀 / 播报',
  shop_inventory_ui: '商店 / 背包',
  sound_cue_markers: '音效提示',
  hero_roster_ui: '英雄名册',
  level_talent_ui: '等级 / 天赋',
  death_recap_ui: '死亡回放',
  scoreboard_ui: '比分面板',
  match_flow_ui: '赛前 / 结算',
  cursor_commands: '鼠标命令',
  system_notifications: '系统通知',
  tutorial_guides: '教程引导',
  ui_badges: 'UI 徽章',
  terrain_tiles: '地貌块',
  minimap_markers: '小地图标记',
  team_banners: '队伍旗帜',
};

interface PreviewResource {
  asset: Resource3DAssetSpec;
  anchor: Group;
  model: Group;
  label: HTMLElement;
  phase: number;
}

export function showResource3DPreview(parent: HTMLElement): void {
  parent.innerHTML = '';
  const mount = document.createElement('div');
  mount.style.cssText = [
    'position:fixed',
    'inset:0',
    'overflow:hidden',
    'color:#f4e8c2',
    'background:radial-gradient(circle at 50% 38%, #273b3d 0%, #101615 48%, #050706 100%)',
  ].join(';');
  parent.appendChild(mount);

  const scene = new Scene();
  scene.fog = new Fog('#050706', 13, 30);
  const camera = new PerspectiveCamera(39, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 8.8, 17.6);
  camera.lookAt(0, 0.95, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  mount.appendChild(renderer.domElement);

  scene.add(new HemisphereLight('#e8f4ff', '#1b1a14', 2.2));
  const key = new DirectionalLight('#fff0bd', 4.0);
  key.position.set(-4, 9, 7);
  key.castShadow = true;
  scene.add(key);
  const rim = new DirectionalLight('#84d7ff', 2.1);
  rim.position.set(6, 4, -6);
  scene.add(rim);
  const fill = new DirectionalLight('#f2a85a', 1.1);
  fill.position.set(4, 4, 6);
  scene.add(fill);

  scene.add(makeStage());

  const labelsLayer = document.createElement('div');
  labelsLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;';
  mount.appendChild(labelsLayer);

  const categoryRoot = new Group();
  scene.add(categoryRoot);
  let resources: PreviewResource[] = [];
  let activeCategory: Resource3DCategory = RESOURCE3D_CATEGORIES[0];

  const title = document.createElement('div');
  title.style.cssText = 'position:fixed;left:22px;top:18px;z-index:7;text-shadow:0 2px 14px #000;font:800 18px system-ui,sans-serif;letter-spacing:0;';
  title.textContent = '其它资源打样 · Three.js 模型 / 纹理 / 动效预览';
  mount.appendChild(title);

  const tabs = createTabs((category) => {
    activeCategory = category;
    showCategory(category);
  });
  mount.appendChild(tabs);

  const note = document.createElement('div');
  note.style.cssText = [
    'position:fixed',
    'left:22px',
    'bottom:18px',
    'z-index:7',
    'padding:8px 10px',
    'border:1px solid rgba(226,203,133,.26)',
    'border-radius:8px',
    'background:rgba(6,8,7,.58)',
    'box-shadow:0 14px 34px rgba(0,0,0,.28)',
    'font:600 12px system-ui,sans-serif',
    'color:#d9d2b6',
  ].join(';');
  mount.appendChild(note);

  function showCategory(category: Resource3DCategory): void {
    categoryRoot.clear();
    labelsLayer.innerHTML = '';
    resources = [];
    const assets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === category);
    const dense = assets.length > 15;
    const columns = dense ? 6 : 5;
    const rows = Math.ceil(assets.length / columns);
    const spacingX = dense ? 2.08 : 2.65;
    const spacingZ = dense ? 1.72 : 2.35;
    const modelScale = dense ? 0.72 : 1;
    assets.forEach((asset, index) => {
      const { root: model } = createResource3DModel(asset);
      const col = index % columns;
      const row = Math.floor(index / columns);
      const anchor = new Group();
      anchor.name = `resource3d-slot:${asset.key}`;
      anchor.position.set(
        (col - (columns - 1) / 2) * spacingX,
        0,
        (row - (rows - 1) / 2) * spacingZ,
      );
      anchor.rotation.y = row % 2 === 0 ? 0.24 : -0.16;
      anchor.scale.setScalar(modelScale);
      anchor.add(model);
      categoryRoot.add(anchor);

      const label = document.createElement('div');
      label.style.cssText = [
        'position:absolute',
        'transform:translate(-50%, 24px)',
        `min-width:${dense ? 84 : 108}px`,
        `padding:${dense ? '4px 5px' : '5px 7px'}`,
        'border:1px solid rgba(230,205,120,.46)',
        'border-radius:6px',
        'background:linear-gradient(180deg, rgba(18,23,21,.88), rgba(7,9,8,.72))',
        'box-shadow:0 10px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.1)',
        'text-align:center',
        `font:700 ${dense ? 10 : 11}px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`,
        'line-height:1.35',
        'letter-spacing:0',
      ].join(';');
      label.innerHTML = `<span style="color:${asset.palette[1]}">${asset.name}</span><br><span style="font-weight:500;color:#d0d8c2">${asset.role}</span>`;
      labelsLayer.appendChild(label);
      resources.push({ asset, anchor, model, label, phase: index * 0.67 });
    });
    note.textContent = `${CATEGORY_LABEL[category]} · ${assets.length} 个样例 · 后续可逐类替换 GLB / PBR / 动作资源`;
    updateActiveTabs(tabs, category);
  }

  const clock = new Clock();
  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  renderer.setAnimationLoop(() => {
    const t = clock.elapsedTime;
    for (const res of resources) {
      animateResource(res, t);
      updateLabel(camera, res);
    }
    renderer.render(scene, camera);
  });

  showCategory(activeCategory);
  window.__resource3dPreview = {
    categories: [...RESOURCE3D_CATEGORIES],
    total: RESOURCE3D_SAMPLE_ASSETS.length,
    counts: Object.fromEntries(RESOURCE3D_CATEGORIES.map((category) => [
      category,
      RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === category).length,
    ])),
  };
}

function createTabs(onSelect: (category: Resource3DCategory) => void): HTMLElement {
  const tabs = document.createElement('div');
  tabs.style.cssText = [
    'position:fixed',
    'right:18px',
    'top:18px',
    'z-index:8',
    'display:flex',
    'gap:6px',
    'flex-wrap:wrap',
    'justify-content:flex-end',
    'max-width:520px',
    'padding:8px',
    'border:1px solid rgba(226,203,133,.22)',
    'border-radius:8px',
    'background:linear-gradient(180deg, rgba(18,22,19,.76), rgba(5,7,6,.54))',
    'box-shadow:0 14px 42px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)',
    'backdrop-filter:blur(10px)',
  ].join(';');
  for (const category of RESOURCE3D_CATEGORIES) {
    const button = document.createElement('button');
    button.dataset.category = category;
    button.textContent = CATEGORY_LABEL[category];
    button.style.cssText = [
      'border:1px solid rgba(230,205,120,.48)',
      'border-radius:6px',
      'background:linear-gradient(180deg, rgba(34,40,32,.9), rgba(12,15,14,.82))',
      'color:#f4e6b8',
      'padding:7px 9px',
      'font:700 12px system-ui,sans-serif',
      'cursor:pointer',
    ].join(';');
    button.addEventListener('click', () => onSelect(category));
    tabs.appendChild(button);
  }
  return tabs;
}

function updateActiveTabs(tabs: HTMLElement, active: Resource3DCategory): void {
  for (const child of [...tabs.children]) {
    const button = child as HTMLButtonElement;
    const isActive = button.dataset.category === active;
    button.style.background = isActive
      ? 'linear-gradient(180deg, rgba(224,196,96,.92), rgba(96,78,32,.92))'
      : 'linear-gradient(180deg, rgba(34,40,32,.9), rgba(12,15,14,.82))';
    button.style.color = isActive ? '#16150f' : '#f4e6b8';
  }
}

function animateResource(res: PreviewResource, t: number): void {
  const phase = t + res.phase;
  res.anchor.rotation.y += 0.0008 + Math.sin(phase * 0.5) * 0.00045;
  if (res.asset.previewMotion === 'spin') {
    res.model.rotation.y += 0.015;
  } else if (res.asset.previewMotion === 'float') {
    res.model.position.y = Math.sin(phase * 1.8) * 0.08;
  } else if (res.asset.previewMotion === 'pulse') {
    const s = 1 + Math.sin(phase * 2.2) * 0.045;
    res.model.scale.setScalar(s);
  } else if (res.asset.previewMotion === 'impact') {
    const hit = Math.max(0, Math.sin(phase * 2.8));
    res.model.scale.set(1 + hit * 0.035, 1 - hit * 0.03, 1 + hit * 0.035);
  } else if (res.asset.previewMotion === 'ambient') {
    res.model.rotation.y += 0.003;
    res.model.position.y = Math.sin(phase * 1.15) * 0.025;
  }
}

function updateLabel(camera: PerspectiveCamera, res: PreviewResource): void {
  const p = res.anchor.position.clone();
  p.y -= 0.42;
  p.project(camera);
  res.label.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
  res.label.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight}px`;
}

function makeStage(): Group {
  const group = new Group();
  const stage = new Mesh(
    new PlaneGeometry(18.8, 9.2, 1, 1),
    new MeshStandardMaterial({ color: '#17211c', roughness: 0.84, metalness: 0.08 }),
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.y = -0.05;
  stage.receiveShadow = true;
  group.add(stage);

  const ring = new Mesh(
    new RingGeometry(2.4, 8.4, 96),
    new MeshBasicMaterial({ color: '#c4a65a', transparent: true, opacity: 0.14 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.035;
  group.add(ring);

  const back = new Mesh(
    new PlaneGeometry(15.8, 4.8),
    new MeshBasicMaterial({ color: new Color('#b8d6b4'), transparent: true, opacity: 0.052 }),
  );
  back.position.set(0, 1.65, -3.7);
  group.add(back);
  return group;
}

declare global {
  interface Window {
    __resource3dPreview?: {
      categories: string[];
      total: number;
      counts: Record<string, number>;
    };
  }
}
