/** 3D 地形:高度网格(高台抬升 / 河道下沉 / 平滑成坡)+ 河道水面 + 树木(InstancedMesh)。 */
import * as THREE from 'three';
import type { GameMap } from '../sim/map';
import { terrainVisualAt } from '../render/mapReadability';
import { terrainDressingSamples, type TerrainDressingKind, type TerrainDressingSample } from './terrainDressing';

const WORLD = 15040;
const MAX_TREES = 2800;
const GRID_N = 118;       // 高度网格分辨率(约每 2 格一顶点)
const HIGH_RISE = 130;    // 高台抬升像素
const RIVER_DROP = 0.34;  // 河道相对下沉(归一)

type TreePoint = { x: number; z: number; y: number };

// 平滑高度场缓存(归一:河 -0.34 / 平地 0 / 高台 1),按 map 构建一次
let smoothH: Float32Array | null = null;
let smW = 0, smH = 0, smCell = 64;

function buildSmoothHeight(map: GameMap): void {
  const W = map.GW, H = map.GH;
  let cur = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    cur[i] = map.height[i] === 2 ? 1 : map.height[i] === 0 ? -RIVER_DROP : 0;
  }
  // 3 次盒式模糊 → 离散台地变缓坡
  for (let pass = 0; pass < 3; pass++) {
    const nxt = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            s += cur[yy * W + xx]; n++;
          }
        }
        nxt[y * W + x] = s / n;
      }
    }
    cur = nxt;
  }
  smoothH = cur; smW = W; smH = H; smCell = map.CELL;
}

/** 世界坐标 (x,z) 的地形高度(像素)。供地形网格顶点与单位/建筑置位共用,保证单位贴地。 */
export function terrainElevation(map: GameMap, x: number, z: number): number {
  if (!smoothH) buildSmoothHeight(map);
  const h = smoothH!;
  const cx = x / smCell - 0.5, cy = z / smCell - 0.5;
  const x0 = Math.max(0, Math.min(smW - 1, Math.floor(cx)));
  const y0 = Math.max(0, Math.min(smH - 1, Math.floor(cy)));
  const x1 = Math.min(smW - 1, x0 + 1), y1 = Math.min(smH - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, cx - x0)), fy = Math.max(0, Math.min(1, cy - y0));
  const h00 = h[y0 * smW + x0], h10 = h[y0 * smW + x1];
  const h01 = h[y1 * smW + x0], h11 = h[y1 * smW + x1];
  const top = h00 * (1 - fx) + h10 * fx;
  const bot = h01 * (1 - fx) + h11 * fx;
  return (top * (1 - fy) + bot * fy) * HIGH_RISE;
}

/** 按高度取地表颜色(河蓝绿 → 平地绿 → 高地浅黄绿)。 */
function groundColor(norm: number, out: THREE.Color): void {
  if (norm < -0.05) out.set('#274b54');        // 河床
  else if (norm < 0.25) out.set('#33421f');    // 平地
  else if (norm < 0.7) out.set('#3e4d24');     // 缓坡
  else out.set('#566b35');                     // 高地
}

export function buildTerrain3D(map: GameMap): THREE.Group {
  if (!smoothH) buildSmoothHeight(map);
  const g = new THREE.Group();

  // 高度网格(BufferGeometry,顶点 Y 位移 + 顶点色按海拔)
  const N = GRID_N, step = WORLD / (N - 1);
  const positions = new Float32Array(N * N * 3);
  const colors = new Float32Array(N * N * 3);
  const col = new THREE.Color();
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = i * step, z = j * step;
      const y = terrainElevation(map, x, z);
      const k = (j * N + i) * 3;
      positions[k] = x; positions[k + 1] = y; positions[k + 2] = z;
      groundColor(y / HIGH_RISE, col);
      colors[k] = col.r; colors[k + 1] = col.g; colors[k + 2] = col.b;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  ground.receiveShadow = true;
  g.add(ground);

  // 河道水面(半透,略低于平地)
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD * 1.5, 1500),
    new THREE.MeshLambertMaterial({ color: '#2c6a88', transparent: true, opacity: 0.78 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.rotation.z = Math.PI / 4;
  river.position.set(WORLD / 2, -HIGH_RISE * RIVER_DROP + 6, WORLD / 2);
  g.add(river);
  g.add(buildRiverCurrent());

  for (const layer of buildDressingLayers(map)) g.add(layer);

  // 树木:采样树格 → InstancedMesh,贴地形高度
  const treeCells: TreePoint[] = [];
  for (let cy = 0; cy < map.GH; cy += 2) {
    for (let cx = 0; cx < map.GW; cx += 2) {
      if (map.trees.has(map.cellIndex(cx, cy))) {
        const c = map.cellCenter(cx, cy);
        treeCells.push({ x: c.x, z: c.y, y: terrainElevation(map, c.x, c.y) });
      }
    }
  }
  const pts: TreePoint[] = [];
  const stride = treeCells.length / Math.min(MAX_TREES, treeCells.length);
  for (let i = 0; i < Math.min(MAX_TREES, treeCells.length); i++) pts.push(treeCells[Math.floor(i * stride)]);
  if (pts.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(7, 12, 44, 5).translate(0, 22, 0);
    const canopyGeo = new THREE.DodecahedronGeometry(34, 0);
    const canopySmallGeo = new THREE.DodecahedronGeometry(24, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#5b4326' }), pts.length);
    const folis = new THREE.InstancedMesh(canopyGeo, new THREE.MeshLambertMaterial({ color: '#2f5a23' }), pts.length);
    const folis2 = new THREE.InstancedMesh(canopySmallGeo, new THREE.MeshLambertMaterial({ color: '#3f7030' }), pts.length * 2);
    trunks.name = 'terrain-tree-trunks';
    folis.name = 'terrain-tree-canopy-primary';
    folis2.name = 'terrain-tree-canopy-secondary';
    trunks.userData.count = pts.length;
    folis.userData.count = pts.length;
    folis2.userData.count = pts.length * 2;
    trunks.castShadow = true;
    folis.castShadow = true;
    folis2.castShadow = true;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    pts.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      trunks.setMatrixAt(i, m4);
      pos.set(p.x, p.y + 84 + (i % 5) * 4, p.z);
      q.setFromEuler(new THREE.Euler(0.08 * (i % 3), i * 0.37, -0.06 * (i % 4)));
      scl.setScalar(0.9 + (i % 7) * 0.035);
      m4.compose(pos, q, scl);
      folis.setMatrixAt(i, m4);
      for (let j = 0; j < 2; j++) {
        const sign = j === 0 ? -1 : 1;
        pos.set(p.x + sign * (18 + (i % 4) * 3), p.y + 64 + (i % 3) * 5, p.z + (j === 0 ? 12 : -14));
        q.setFromEuler(new THREE.Euler(0.12 * sign, i * 0.23 + j, 0.08 * sign));
        scl.setScalar(0.75 + ((i + j) % 5) * 0.04);
        m4.compose(pos, q, scl);
        folis2.setMatrixAt(i * 2 + j, m4);
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    folis.instanceMatrix.needsUpdate = true;
    folis2.instanceMatrix.needsUpdate = true;
    g.add(trunks, folis, folis2, buildTreeBiomeAccents(pts));
  }

  return g;
}

function buildTreeAccentLayer(
  name: string,
  pts: TreePoint[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  transform: (point: TreePoint, index: number, pos: THREE.Vector3, q: THREE.Quaternion, scl: THREE.Vector3) => void,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, pts.length);
  mesh.name = name;
  mesh.userData.count = pts.length;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  pts.forEach((p, i) => {
    transform(p, i, pos, q, scl);
    m4.compose(pos, q, scl);
    mesh.setMatrixAt(i, m4);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildTreeBiomeAccents(pts: TreePoint[]): THREE.Object3D {
  const radiant = pts.filter((p) => p.x - p.z < -WORLD * 0.12);
  const dire = pts.filter((p) => p.x - p.z > WORLD * 0.12);

  const radiantLight = buildTreeAccentLayer(
    'terrain-tree-radiant-light-canopy',
    radiant,
    new THREE.DodecahedronGeometry(18, 0),
    new THREE.MeshLambertMaterial({ color: '#6fae48' }),
    (p, i, pos, q, scl) => {
      pos.set(p.x - 12 + (i % 3) * 5, p.y + 101 + (i % 4) * 3, p.z + 10 - (i % 5) * 4);
      q.setFromEuler(new THREE.Euler(0.1, i * 0.41, -0.08));
      scl.setScalar(0.72 + (i % 5) * 0.035);
    },
  );
  const radiantBlooms = buildTreeAccentLayer(
    'terrain-tree-radiant-blooms',
    radiant.filter((_, i) => i % 2 === 0),
    new THREE.SphereGeometry(8, 7, 5),
    new THREE.MeshLambertMaterial({ color: '#ffd8c6', emissive: '#352018', emissiveIntensity: 0.18 }),
    (p, i, pos, q, scl) => {
      pos.set(p.x + 18 - (i % 4) * 7, p.y + 104 + (i % 3) * 5, p.z - 14 + (i % 5) * 5);
      q.setFromEuler(new THREE.Euler(0, i * 0.31, 0));
      scl.setScalar(1 + (i % 4) * 0.08);
    },
  );
  const direDark = buildTreeAccentLayer(
    'terrain-tree-dire-dark-canopy',
    dire,
    new THREE.DodecahedronGeometry(20, 0),
    new THREE.MeshLambertMaterial({ color: '#23341f' }),
    (p, i, pos, q, scl) => {
      pos.set(p.x + 10 - (i % 4) * 6, p.y + 92 + (i % 5) * 4, p.z - 12 + (i % 3) * 7);
      q.setFromEuler(new THREE.Euler(-0.08, i * 0.29, 0.1));
      scl.setScalar(0.82 + (i % 6) * 0.035);
    },
  );
  const direBranches = buildTreeAccentLayer(
    'terrain-tree-dire-dead-branches',
    dire.filter((_, i) => i % 2 === 0),
    new THREE.BoxGeometry(7, 50, 7).translate(0, 25, 0),
    new THREE.MeshLambertMaterial({ color: '#5c4229' }),
    (p, i, pos, q, scl) => {
      pos.set(p.x + 15 - (i % 3) * 13, p.y + 58 + (i % 4) * 4, p.z + 8 - (i % 5) * 4);
      q.setFromEuler(new THREE.Euler(0.32 + (i % 3) * 0.08, i * 0.52, -0.42));
      scl.set(0.85, 0.65 + (i % 4) * 0.07, 0.85);
    },
  );

  return groupLayer(
    'terrain-tree-biome-accents',
    radiantLight.userData.count + radiantBlooms.userData.count + direDark.userData.count + direBranches.userData.count,
    [radiantLight, radiantBlooms, direDark, direBranches],
  );
}

function buildRiverCurrent(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = 'terrain-river-current';
  group.userData.count = 9;
  group.userData.motion = 'flow';
  group.userData.flowDistance = 54;
  const geo = new THREE.PlaneGeometry(WORLD * 0.9, 42);
  const mats = [
    new THREE.MeshBasicMaterial({ color: '#8defff', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: '#b8edf7', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
  ];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(geo, mats[i % 2]);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.PI / 4 + (i % 3 - 1) * 0.025;
    m.position.set(WORLD * (0.18 + i * 0.08), -HIGH_RISE * RIVER_DROP + 8.5, WORLD * (0.2 + i * 0.075));
    m.userData.baseX = m.position.x;
    m.userData.baseZ = m.position.z;
    m.userData.flowPhase = i * 0.67;
    group.add(m);
  }
  return group;
}

export function updateTerrainRuntimeMotion(root: THREE.Object3D, t: number): void {
  const current = root.getObjectByName('terrain-river-current');
  if (current) {
    const distance = current.userData.flowDistance ?? 48;
    current.children.forEach((child) => {
      const phase = child.userData.flowPhase ?? 0;
      const offset = Math.sin(t * 1.18 + phase) * distance;
      child.position.x = (child.userData.baseX ?? child.position.x) + offset;
      child.position.z = (child.userData.baseZ ?? child.position.z) + offset;
    });
  }

  const foam = root.getObjectByName('terrain-river-foam-glints') as THREE.InstancedMesh | undefined;
  const foamMaterial = foam && !Array.isArray(foam.material) ? foam.material : undefined;
  if (foam && foamMaterial && 'opacity' in foamMaterial) {
    const base = foam.userData.baseOpacity ?? foamMaterial.opacity ?? 0.38;
    foamMaterial.opacity = base + Math.sin(t * 2.4) * 0.09;
  }

  const reeds = root.getObjectByName('terrain-river-reeds');
  if (reeds) reeds.rotation.z = Math.sin(t * 1.35) * (reeds.userData.swayAmplitude ?? 0.026);

  const runeColumns = root.getObjectByName('terrain-rune-beacon-columns') as THREE.InstancedMesh | undefined;
  const runeColumnMaterial = runeColumns && !Array.isArray(runeColumns.material) ? runeColumns.material : undefined;
  if (runeColumns && runeColumnMaterial && 'opacity' in runeColumnMaterial) {
    const base = runeColumns.userData.baseOpacity ?? runeColumnMaterial.opacity ?? 0.28;
    runeColumnMaterial.opacity = base + (0.5 + Math.sin(t * 2.2) * 0.5) * 0.18;
  }

  const campBeacons = root.getObjectByName('terrain-neutral-camp-beacons');
  if (campBeacons) {
    const base = campBeacons.userData.baseScaleY ?? 1;
    campBeacons.scale.y = base + (0.5 + Math.sin(t * 1.55) * 0.5) * 0.1;
  }

  const forestHaze = root.getObjectByName('terrain-forest-shadow-haze') as THREE.InstancedMesh | undefined;
  const forestMaterial = forestHaze && !Array.isArray(forestHaze.material) ? forestHaze.material : undefined;
  if (forestHaze && forestMaterial && 'opacity' in forestMaterial) {
    const base = forestHaze.userData.baseOpacity ?? forestMaterial.opacity ?? 0.2;
    forestMaterial.opacity = base + (0.5 + Math.sin(t * 1.35) * 0.5) * 0.12;
  }

  const missCrowns = root.getObjectByName('terrain-highground-miss-crowns') as THREE.InstancedMesh | undefined;
  const missMaterial = missCrowns && !Array.isArray(missCrowns.material) ? missCrowns.material : undefined;
  if (missCrowns && missMaterial && 'opacity' in missMaterial) {
    const base = missCrowns.userData.baseOpacity ?? missMaterial.opacity ?? 0.5;
    missMaterial.opacity = base + (0.5 + Math.sin(t * 2.7) * 0.5) * 0.2;
  }
}

function samplesOf(samples: TerrainDressingSample[], kind: TerrainDressingKind): TerrainDressingSample[] {
  return samples.filter((sample) => sample.kind === kind);
}

function instancedLayer(
  name: string,
  map: GameMap,
  samples: TerrainDressingSample[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  scale: THREE.Vector3,
  yOffset = 0,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, samples.length);
  mesh.name = name;
  mesh.userData.count = samples.length;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    q.setFromEuler(new THREE.Euler(0, s.rotation, 0));
    pos.set(s.x, terrainElevation(map, s.x, s.z) + yOffset, s.z);
    scl.set(scale.x * s.scale, scale.y * s.scale, scale.z * s.scale);
    m4.compose(pos, q, scl);
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function groupLayer(name: string, count: number, children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.userData.count = count;
  for (const child of children) g.add(child);
  return g;
}

function buildSkyDome(samples: TerrainDressingSample[]): THREE.Object3D {
  const s = samples[0];
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(WORLD * 0.86, 24, 12),
    new THREE.MeshBasicMaterial({ color: s?.color ?? '#6aa7d8', transparent: true, opacity: 0.18, side: THREE.BackSide }),
  );
  dome.name = 'terrain-sky-dome';
  dome.userData.count = samples.length;
  dome.position.set(WORLD / 2, WORLD * 0.34, WORLD / 2);
  return dome;
}

function buildCloudShadows(samples: TerrainDressingSample[]): THREE.Object3D {
  const group = new THREE.Group();
  group.name = 'terrain-cloud-shadows';
  group.userData.count = samples.length;
  const geo = new THREE.PlaneGeometry(900, 240);
  const mat = new THREE.MeshBasicMaterial({
    color: '#d8ecf2',
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const s of samples) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(s.x, Math.max(32, s.y), s.z);
    m.rotation.set(-Math.PI / 2, 0, s.rotation);
    m.scale.setScalar(s.scale);
    group.add(m);
  }
  return group;
}

function buildAtmosphereLayer(samples: TerrainDressingSample[]): THREE.Object3D {
  const hazeSamples = samplesOf(samples, 'sky_horizon_haze');
  const shaftSamples = samplesOf(samples, 'sky_sun_shaft');
  const haze = new THREE.Group();
  haze.name = 'terrain-horizon-haze';
  haze.userData.count = hazeSamples.length;
  const hazeGeo = new THREE.PlaneGeometry(WORLD * 0.86, 360);
  const hazeMats = [
    new THREE.MeshBasicMaterial({ color: '#b9d8dc', transparent: true, opacity: 0.11, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: '#d7e7c8', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
  ];
  hazeSamples.forEach((s, i) => {
    const m = new THREE.Mesh(hazeGeo, hazeMats[i % hazeMats.length]);
    m.position.set(s.x, s.y, s.z);
    m.rotation.set(0, s.rotation, 0);
    m.scale.setScalar(s.scale);
    haze.add(m);
  });

  const shafts = new THREE.Group();
  shafts.name = 'terrain-sun-shafts';
  shafts.userData.count = shaftSamples.length;
  const shaftGeo = new THREE.PlaneGeometry(190, 920);
  const shaftMat = new THREE.MeshBasicMaterial({
    color: '#ffe7a8',
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  shaftSamples.forEach((s, i) => {
    const m = new THREE.Mesh(shaftGeo, shaftMat);
    m.position.set(s.x, s.y, s.z);
    m.rotation.set(0.52, s.rotation, -0.24);
    m.scale.set(0.82 + (i % 3) * 0.12, s.scale, 1);
    shafts.add(m);
  });

  return groupLayer('terrain-atmosphere', haze.userData.count + shafts.userData.count, [haze, shafts]);
}

function buildFlowerLayer(map: GameMap, samples: TerrainDressingSample[]): THREE.Object3D {
  const stem = instancedLayer(
    'terrain-flower-stems',
    map,
    samples,
    new THREE.CylinderGeometry(1.2, 1.8, 18, 4).translate(0, 9, 0),
    new THREE.MeshLambertMaterial({ color: '#4f773d' }),
    new THREE.Vector3(1, 1, 1),
  );
  const blossom = instancedLayer(
    'terrain-flower-blossoms',
    map,
    samples,
    new THREE.SphereGeometry(5, 6, 4).translate(0, 20, 0),
    new THREE.MeshLambertMaterial({ color: '#ffb0a0', emissive: '#241311', emissiveIntensity: 0.16 }),
    new THREE.Vector3(1, 1, 1),
  );
  return groupLayer('terrain-flower-patches', samples.length, [stem, blossom]);
}

function buildLandmarkLayer(map: GameMap, samples: TerrainDressingSample[]): THREE.Object3D {
  const group = new THREE.Group();
  group.name = 'terrain-landmark-rings';
  group.userData.count = samples.length;
  for (const s of samples) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(95 * s.scale, 4.5, 6, 42),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ring.position.set(s.x, terrainElevation(map, s.x, s.z) + 7, s.z);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = s.rotation;
    group.add(ring);
  }
  return group;
}

function cueSample(
  map: GameMap,
  cx: number,
  cy: number,
  salt: number,
  color: string,
  rotation = 0,
): TerrainDressingSample {
  const p = map.cellCenter(cx, cy);
  const jitterX = (((cx + 3) * 41 + (cy + 5) * 17 + salt * 13) % 100) / 100 - 0.5;
  const jitterZ = (((cx + 11) * 29 + (cy + 7) * 43 + salt * 19) % 100) / 100 - 0.5;
  return {
    kind: 'landmark_ring',
    x: p.x + jitterX * map.CELL * 0.36,
    y: 0,
    z: p.y + jitterZ * map.CELL * 0.36,
    scale: 0.78 + (((cx + salt) * 23 + cy * 31) % 100) / 420,
    rotation,
    color,
    variant: (cx + cy + salt) % 4,
  };
}

function edgeCueRotation(map: GameMap, cx: number, cy: number): number {
  let vx = 0;
  let vy = 0;
  const h = map.height[map.cellIndex(cx, cy)];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (!map.inBounds(x, y)) continue;
      if (map.height[map.cellIndex(x, y)] === h) continue;
      vx += dx;
      vy += dy;
    }
  }
  if (Math.abs(vx) + Math.abs(vy) < 0.001) return 0;
  return Math.atan2(vy, vx) + Math.PI / 2;
}

function terrainMechanicSamples(map: GameMap, tag: string, stride: number, cap: number, color: string): TerrainDressingSample[] {
  const out: TerrainDressingSample[] = [];
  for (let cy = 2; cy < map.GH - 2; cy++) {
    for (let cx = 2; cx < map.GW - 2; cx++) {
      if ((cx * 37 + cy * 53) % stride !== 0) continue;
      const visual = terrainVisualAt(map, cx, cy);
      if (!visual.walkable || !visual.tags.includes(tag)) continue;
      out.push(cueSample(map, cx, cy, tag === 'lowHighVisionBreak' ? 73 : 61, color, edgeCueRotation(map, cx, cy)));
      if (out.length >= cap) return out;
    }
  }
  return out;
}

function buildForestShadowLayer(map: GameMap): THREE.Object3D {
  const samples = terrainMechanicSamples(map, 'treeShadow', 5, 260, '#071108');
  const floor = instancedLayer(
    'terrain-forest-shadow-floor',
    map,
    samples,
    new THREE.CircleGeometry(74, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#030705', transparent: true, opacity: 0.44, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.Vector3(1.45, 1, 0.88),
    7,
  );
  floor.castShadow = false;
  const haze = instancedLayer(
    'terrain-forest-shadow-haze',
    map,
    samples,
    new THREE.PlaneGeometry(62, 90).translate(0, 45, 0),
    new THREE.MeshBasicMaterial({
      color: '#142414',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    new THREE.Vector3(1, 1, 1),
    18,
  );
  haze.castShadow = false;
  haze.userData.readability = 'forestVisionPocket';
  haze.userData.baseOpacity = 0.2;
  floor.userData.readability = 'forestVisionPocket';
  const group = groupLayer('terrain-forest-shadow-pockets', samples.length, [floor, haze]);
  group.userData.motion = 'forest-breathe';
  return group;
}

function forestPocketSamples(map: GameMap): TerrainDressingSample[] {
  return map.forestPockets.map((pocket, index) => ({
    kind: 'landmark_ring',
    x: pocket.pos.x,
    y: 0,
    z: pocket.pos.y,
    scale: Math.max(0.85, pocket.r / 230),
    rotation: (index * Math.PI) / 5,
    color: pocket.side === 0 ? '#9ee878' : '#7fd1a0',
    variant: index % 4,
  }));
}

function buildForestWalkablePocketLayer(map: GameMap): THREE.Object3D {
  const samples = forestPocketSamples(map);
  const floor = instancedLayer(
    'terrain-forest-pocket-floor',
    map,
    samples,
    new THREE.CircleGeometry(102, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#071108', transparent: true, opacity: 0.56, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.Vector3(1.25, 1, 0.92),
    11,
  );
  floor.castShadow = false;
  floor.userData.readability = 'walkableForestPocket';

  const canopyShadows = instancedLayer(
    'terrain-forest-pocket-canopy-shadows',
    map,
    samples,
    new THREE.PlaneGeometry(148, 118).translate(0, 59, 0),
    new THREE.MeshBasicMaterial({
      color: '#1b3a18',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    new THREE.Vector3(1, 1, 1),
    28,
  );
  canopyShadows.castShadow = false;
  canopyShadows.userData.readability = 'walkableForestPocket';
  canopyShadows.userData.baseOpacity = 0.28;

  const group = groupLayer('terrain-forest-walkable-pockets', samples.length, [floor, canopyShadows]);
  group.userData.motion = 'forest-breathe';
  group.userData.readability = 'walkableForestPocket';
  return group;
}

function buildJungleEntranceLayer(map: GameMap, samples: TerrainDressingSample[]): THREE.Object3D {
  const floor = instancedLayer(
    'terrain-jungle-entrance-floor',
    map,
    samples,
    new THREE.CircleGeometry(86, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#18351b', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.Vector3(1.35, 1, 0.62),
    9,
  );
  floor.castShadow = false;
  floor.userData.readability = 'walkableJungleEntrance';

  const arches = instancedLayer(
    'terrain-jungle-entrance-arches',
    map,
    samples,
    new THREE.TorusGeometry(42, 3.2, 5, 24),
    new THREE.MeshBasicMaterial({ color: '#9ee878', transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending }),
    new THREE.Vector3(1.08, 1, 0.42),
    32,
  );
  arches.castShadow = false;
  arches.userData.readability = 'walkableJungleEntrance';

  const group = groupLayer('terrain-jungle-walkway-entrances', samples.length, [floor, arches]);
  group.userData.readability = 'walkableJungleEntrance';
  return group;
}

function buildCliffVisionCueLayer(map: GameMap): THREE.Object3D {
  const samples = terrainMechanicSamples(map, 'lowHighVisionBreak', 2, 180, '#10160f');
  const hatches = instancedLayer(
    'terrain-cliff-vision-break-hatches',
    map,
    samples,
    new THREE.BoxGeometry(96, 6, 12).translate(0, 3, 0),
    new THREE.MeshBasicMaterial({ color: '#050806', transparent: true, opacity: 0.72, depthWrite: false }),
    new THREE.Vector3(1, 1, 1),
    10,
  );
  hatches.castShadow = false;
  const crowns = instancedLayer(
    'terrain-highground-miss-crowns',
    map,
    samples,
    new THREE.TorusGeometry(46, 2.4, 5, 24),
    new THREE.MeshBasicMaterial({ color: '#e4c46a', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }),
    new THREE.Vector3(1, 1, 0.72),
    16,
  );
  crowns.castShadow = false;
  crowns.userData.readability = 'highGroundMiss';
  crowns.userData.baseOpacity = 0.5;
  const group = groupLayer('terrain-cliff-vision-break-cues', samples.length, [hatches, crowns]);
  group.userData.motion = 'highground-miss-pulse';
  return group;
}

function buildHighgroundPlateauBannerLayer(map: GameMap): THREE.Object3D {
  const samples = map.highgroundPlateaus.map((plateau, index) => ({
    kind: 'landmark_ring' as const,
    x: plateau.pos.x,
    y: 0,
    z: plateau.pos.y,
    scale: Math.max(0.9, plateau.r / 560),
    rotation: (index * Math.PI) / 4,
    color: '#e4c46a',
    variant: index % 4,
  }));
  const banners = instancedLayer(
    'terrain-highground-plateau-banners',
    map,
    samples,
    new THREE.ConeGeometry(42, 150, 5).translate(0, 75, 0),
    new THREE.MeshLambertMaterial({ color: '#e4c46a', emissive: '#3a2c10', emissiveIntensity: 0.18 }),
    new THREE.Vector3(0.7, 1, 0.7),
    24,
  );
  banners.userData.readability = 'highGroundPlateau';
  return banners;
}

function landmarkCueSamples(map: GameMap, kind: 'camp' | 'rune'): TerrainDressingSample[] {
  const positions = kind === 'camp'
    ? map.camps.map((camp) => ({ pos: camp.pos, color: camp.tier === 'ancient' ? '#ff815e' : camp.tier === 'large' ? '#ffe083' : '#bdf7c8', scale: camp.tier === 'ancient' ? 1.28 : camp.tier === 'large' ? 1.08 : 0.92 }))
    : map.runeSpots.map((pos, index) => ({ pos, color: index % 2 === 0 ? '#7ed9ff' : '#d89cff', scale: 1.04 }));
  return positions.map((entry, index) => {
    const cell = map.cellOf(entry.pos);
    return {
      kind: 'landmark_ring',
      x: entry.pos.x,
      y: 0,
      z: entry.pos.y,
      scale: entry.scale,
      rotation: (index * Math.PI) / 6,
      color: entry.color,
      variant: index % 4,
    };
  });
}

function buildCampBeaconLayer(map: GameMap): THREE.Object3D {
  const samples = landmarkCueSamples(map, 'camp');
  const plates = instancedLayer(
    'terrain-neutral-camp-plates',
    map,
    samples,
    new THREE.CylinderGeometry(80, 96, 8, 18).translate(0, 4, 0),
    new THREE.MeshLambertMaterial({ color: '#27301f', emissive: '#162112', emissiveIntensity: 0.2 }),
    new THREE.Vector3(1, 1, 1),
    5,
  );
  const banners = instancedLayer(
    'terrain-neutral-camp-banners',
    map,
    samples,
    new THREE.ConeGeometry(34, 120, 5).translate(0, 60, 0),
    new THREE.MeshLambertMaterial({ color: '#bdf7c8', emissive: '#27361f', emissiveIntensity: 0.22 }),
    new THREE.Vector3(0.7, 1, 0.7),
    16,
  );
  const group = groupLayer('terrain-neutral-camp-beacons', samples.length, [plates, banners]);
  group.userData.motion = 'camp-pulse';
  group.userData.baseScaleY = 1;
  return group;
}

function buildRuneBeaconLayer(map: GameMap): THREE.Object3D {
  const samples = landmarkCueSamples(map, 'rune');
  const rings = instancedLayer(
    'terrain-rune-beacon-rings',
    map,
    samples,
    new THREE.TorusGeometry(72, 5, 8, 36),
    new THREE.MeshBasicMaterial({ color: '#8defff', transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending }),
    new THREE.Vector3(1, 1, 1),
    22,
  );
  rings.castShadow = false;
  const columns = instancedLayer(
    'terrain-rune-beacon-columns',
    map,
    samples,
    new THREE.CylinderGeometry(18, 30, 180, 10).translate(0, 90, 0),
    new THREE.MeshBasicMaterial({ color: '#b58cff', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending }),
    new THREE.Vector3(1, 1, 1),
    24,
  );
  columns.castShadow = false;
  columns.userData.baseOpacity = 0.28;
  const group = groupLayer('terrain-rune-beacons', samples.length, [rings, columns]);
  group.userData.motion = 'rune-pulse';
  return group;
}

function buildCliffFaceLayer(map: GameMap, samples: TerrainDressingSample[]): THREE.Object3D {
  const walls = instancedLayer(
    'terrain-cliff-face-walls',
    map,
    samples,
    new THREE.BoxGeometry(96, 92, 18).translate(0, -46, 0),
    new THREE.MeshLambertMaterial({ color: '#1f261f' }),
    new THREE.Vector3(1, 1, 1),
    -10,
  );
  const caps = instancedLayer(
    'terrain-cliff-rock-caps',
    map,
    samples,
    new THREE.DodecahedronGeometry(18, 0),
    new THREE.MeshLambertMaterial({ color: '#64724b' }),
    new THREE.Vector3(1.8, 0.42, 0.92),
    2,
  );
  const shadows = instancedLayer(
    'terrain-cliff-ledge-shadows',
    map,
    samples,
    new THREE.BoxGeometry(104, 12, 30).translate(0, 6, 0),
    new THREE.MeshBasicMaterial({ color: '#07100c', transparent: true, opacity: 0.44, depthWrite: false }),
    new THREE.Vector3(1, 1, 1),
    -72,
  );
  return groupLayer('terrain-cliff-faces', samples.length, [walls, caps, shadows]);
}

function buildCliffBiomeDetailLayer(
  map: GameMap,
  radiantMoss: TerrainDressingSample[],
  direScorch: TerrainDressingSample[],
  rubble: TerrainDressingSample[],
  cracks: TerrainDressingSample[],
): THREE.Object3D {
  const moss = instancedLayer(
    'terrain-cliff-radiant-moss',
    map,
    radiantMoss,
    new THREE.PlaneGeometry(84, 18).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#6f8755', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.Vector3(1, 1, 1),
    12,
  );
  const scorch = instancedLayer(
    'terrain-cliff-dire-scorch',
    map,
    direScorch,
    new THREE.PlaneGeometry(88, 20).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#4b352d', transparent: true, opacity: 0.56, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.Vector3(1, 1, 1),
    13,
  );
  const stoneRubble = instancedLayer(
    'terrain-cliff-rubble',
    map,
    rubble,
    new THREE.DodecahedronGeometry(9, 0),
    new THREE.MeshLambertMaterial({ color: '#7f7760' }),
    new THREE.Vector3(1.35, 0.34, 0.8),
    -64,
  );
  const crackLines = instancedLayer(
    'terrain-cliff-cracks',
    map,
    cracks,
    new THREE.BoxGeometry(66, 4, 5).translate(0, 2, 0),
    new THREE.MeshBasicMaterial({ color: '#11160f', transparent: true, opacity: 0.58, depthWrite: false }),
    new THREE.Vector3(1, 1, 1),
    -18,
  );
  return groupLayer(
    'terrain-cliff-biome-details',
    moss.userData.count + scorch.userData.count + stoneRubble.userData.count + crackLines.userData.count,
    [moss, scorch, stoneRubble, crackLines],
  );
}

function duplicatedSamples(samples: TerrainDressingSample[], lateralOffset: number): TerrainDressingSample[] {
  const out: TerrainDressingSample[] = [];
  for (const sample of samples) {
    const dx = Math.cos(sample.rotation + Math.PI / 2) * lateralOffset;
    const dz = Math.sin(sample.rotation + Math.PI / 2) * lateralOffset;
    out.push({ ...sample, x: sample.x - dx, z: sample.z - dz, scale: sample.scale * 0.9 });
    out.push({ ...sample, x: sample.x + dx, z: sample.z + dz, scale: sample.scale * 0.9 });
  }
  return out;
}

function buildCliffFenceLayer(map: GameMap, samples: TerrainDressingSample[]): THREE.Object3D {
  const posts = duplicatedSamples(samples, 42);
  const rails = instancedLayer(
    'terrain-cliff-fence-rails',
    map,
    samples,
    new THREE.BoxGeometry(104, 12, 10).translate(0, 28, 0),
    new THREE.MeshLambertMaterial({ color: '#8a5f36' }),
    new THREE.Vector3(1, 1, 1),
    6,
  );
  const postLayer = instancedLayer(
    'terrain-cliff-fence-posts',
    map,
    posts,
    new THREE.CylinderGeometry(6, 8, 42, 5).translate(0, 21, 0),
    new THREE.MeshLambertMaterial({ color: '#6d4325' }),
    new THREE.Vector3(1, 1, 1),
    3,
  );
  const bases = instancedLayer(
    'terrain-cliff-fence-stone-bases',
    map,
    posts,
    new THREE.DodecahedronGeometry(12, 0),
    new THREE.MeshLambertMaterial({ color: '#756b58' }),
    new THREE.Vector3(1.35, 0.45, 1.1),
    -4,
  );
  return groupLayer('terrain-cliff-fences', samples.length, [rails, postLayer, bases]);
}

function buildGroundDecalLayer(
  map: GameMap,
  dirtPaths: TerrainDressingSample[],
  grassMottle: TerrainDressingSample[],
  stoneSlabs: TerrainDressingSample[],
): THREE.Object3D {
  const dirt = instancedLayer(
    'terrain-ground-dirt-paths',
    map,
    dirtPaths,
    new THREE.CircleGeometry(50, 9).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#8a6a3f', transparent: true, opacity: 0.38, depthWrite: false }),
    new THREE.Vector3(1.42, 1, 0.46),
    6,
  );
  const mottle = instancedLayer(
    'terrain-ground-grass-mottle',
    map,
    grassMottle,
    new THREE.CircleGeometry(46, 8).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#526f38', transparent: true, opacity: 0.34, depthWrite: false }),
    new THREE.Vector3(1.25, 1, 0.78),
    5,
  );
  const slabs = instancedLayer(
    'terrain-ground-stone-slabs',
    map,
    stoneSlabs,
    new THREE.BoxGeometry(64, 5, 38).translate(0, 2.5, 0),
    new THREE.MeshLambertMaterial({ color: '#8b8068', transparent: true, opacity: 0.62 }),
    new THREE.Vector3(1, 1, 1),
    4,
  );
  return groupLayer(
    'terrain-ground-decals',
    dirt.userData.count + mottle.userData.count + slabs.userData.count,
    [dirt, mottle, slabs],
  );
}

function buildDressingLayers(map: GameMap): THREE.Object3D[] {
  const samples = terrainDressingSamples(map);
  const grass = samplesOf(samples, 'grass_tuft');
  const dirtPaths = samplesOf(samples, 'ground_path_dirt');
  const grassMottle = samplesOf(samples, 'ground_grass_mottle');
  const stoneSlabs = samplesOf(samples, 'ground_stone_slab');
  const flowers = samplesOf(samples, 'flower_patch');
  const jungleEntrances = samplesOf(samples, 'jungle_walkway_entrance');
  const reeds = samplesOf(samples, 'river_reed');
  const stones = samplesOf(samples, 'river_stone');
  const bankMud = samplesOf(samples, 'river_bank_mud');
  const foam = samplesOf(samples, 'river_foam_glint');
  const faces = samplesOf(samples, 'cliff_face');
  const radiantCliff = samplesOf(samples, 'cliff_radiant_moss');
  const direCliff = samplesOf(samples, 'cliff_dire_scorch');
  const cliffRubble = samplesOf(samples, 'cliff_rubble');
  const cliffCracks = samplesOf(samples, 'cliff_crack');
  const fences = samplesOf(samples, 'cliff_fence');
  const edges = samplesOf(samples, 'highground_edge');
  const ramps = samplesOf(samples, 'ramp_stair');
  const landmarks = samplesOf(samples, 'landmark_ring');
  const sky = samplesOf(samples, 'sky_dome');
  const clouds = samplesOf(samples, 'cloud_shadow');
  const riverReeds = instancedLayer(
    'terrain-river-reeds',
    map,
    reeds,
    new THREE.ConeGeometry(4, 54, 4).translate(0, 27, 0),
    new THREE.MeshLambertMaterial({ color: '#b8d990' }),
    new THREE.Vector3(1, 1, 1),
    -4,
  );
  riverReeds.userData.motion = 'reed-sway';
  riverReeds.userData.swayAmplitude = 0.026;
  const foamMaterial = new THREE.MeshBasicMaterial({ color: '#d4fbff', transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
  const riverFoamGlints = instancedLayer(
    'terrain-river-foam-glints',
    map,
    foam,
    new THREE.PlaneGeometry(92, 10).rotateX(-Math.PI / 2),
    foamMaterial,
    new THREE.Vector3(1, 1, 1),
    12,
  );
  riverFoamGlints.userData.motion = 'foam-pulse';
  riverFoamGlints.userData.baseOpacity = foamMaterial.opacity;

  return [
    buildSkyDome(sky),
    buildCloudShadows(clouds),
    buildAtmosphereLayer(samples),
    buildGroundDecalLayer(map, dirtPaths, grassMottle, stoneSlabs),
    instancedLayer(
      'terrain-grass-tufts',
      map,
      grass,
      new THREE.ConeGeometry(5, 36, 3).translate(0, 18, 0),
      new THREE.MeshLambertMaterial({ color: '#7fb95e' }),
      new THREE.Vector3(1, 1, 1),
    ),
    buildFlowerLayer(map, flowers),
    buildJungleEntranceLayer(map, jungleEntrances),
    instancedLayer(
      'terrain-river-bank-mud',
      map,
      bankMud,
      new THREE.CircleGeometry(38, 9).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: '#66583d', transparent: true, opacity: 0.52 }),
      new THREE.Vector3(1.35, 1, 0.4),
      7,
    ),
    riverReeds,
    instancedLayer(
      'terrain-river-stones',
      map,
      stones,
      new THREE.DodecahedronGeometry(13, 0),
      new THREE.MeshLambertMaterial({ color: '#6f8992' }),
      new THREE.Vector3(1.25, 0.55, 0.85),
      -18,
    ),
    riverFoamGlints,
    buildCliffFaceLayer(map, faces),
    buildCliffBiomeDetailLayer(map, radiantCliff, direCliff, cliffRubble, cliffCracks),
    buildCliffFenceLayer(map, fences),
    instancedLayer(
      'terrain-highground-edges',
      map,
      edges,
      new THREE.BoxGeometry(82, 8, 22).translate(0, 4, 0),
      new THREE.MeshLambertMaterial({ color: '#20261f', transparent: true, opacity: 0.68 }),
      new THREE.Vector3(1, 1, 1),
      2,
    ),
    instancedLayer(
      'terrain-ramp-stairs',
      map,
      ramps,
      new THREE.BoxGeometry(260, 10, 92).translate(0, 5, 0),
      new THREE.MeshLambertMaterial({ color: '#8d7450' }),
      new THREE.Vector3(1, 1, 1),
      4,
    ),
    buildLandmarkLayer(map, landmarks),
    buildForestShadowLayer(map),
    buildForestWalkablePocketLayer(map),
    buildCliffVisionCueLayer(map),
    buildHighgroundPlateauBannerLayer(map),
    buildCampBeaconLayer(map),
    buildRuneBeaconLayer(map),
  ];
}
