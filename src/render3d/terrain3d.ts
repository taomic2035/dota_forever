/** 3D 地形:高度网格(高台抬升 / 河道下沉 / 平滑成坡)+ 河道水面 + 树木(InstancedMesh)。 */
import * as THREE from 'three';
import type { GameMap } from '../sim/map';

const WORLD = 15040;
const MAX_TREES = 1400;
const GRID_N = 118;       // 高度网格分辨率(约每 2 格一顶点)
const HIGH_RISE = 130;    // 高台抬升像素
const RIVER_DROP = 0.34;  // 河道相对下沉(归一)

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

  // 树木:采样树格 → InstancedMesh,贴地形高度
  const pts: { x: number; z: number; y: number }[] = [];
  for (let cy = 0; cy < map.GH && pts.length < MAX_TREES; cy += 2) {
    for (let cx = 0; cx < map.GW && pts.length < MAX_TREES; cx += 2) {
      if (map.trees.has(map.cellIndex(cx, cy))) {
        const c = map.cellCenter(cx, cy);
        pts.push({ x: c.x, z: c.y, y: terrainElevation(map, c.x, c.y) });
      }
    }
  }
  if (pts.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(6, 9, 34, 5).translate(0, 17, 0);
    const foliGeo = new THREE.ConeGeometry(38, 90, 7).translate(0, 78, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#5b4326' }), pts.length);
    const folis = new THREE.InstancedMesh(foliGeo, new THREE.MeshLambertMaterial({ color: '#2f5a23' }), pts.length);
    folis.castShadow = true;
    const m4 = new THREE.Matrix4();
    pts.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      trunks.setMatrixAt(i, m4);
      folis.setMatrixAt(i, m4);
    });
    trunks.instanceMatrix.needsUpdate = true;
    folis.instanceMatrix.needsUpdate = true;
    g.add(trunks, folis);
  }

  return g;
}
