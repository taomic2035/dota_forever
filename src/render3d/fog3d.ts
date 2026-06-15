/**
 * 3D 战争迷雾:贴合地形高度的半透明纱罩 mesh + 由 vision 网格驱动的 DataTexture。
 *
 * 为什么用世界空间 mesh 而非屏幕叠加:纱罩在 3D 场景里,经透视相机渲染天然得到正确的
 * 地面投影与高低地起伏;纹理三档(可见/已探索/未探索)与 2D FogRenderer 共用 writeFogRGBA,
 * 保证两个渲染器迷雾一致。补上 3D 此前「地面永远全亮」的核心可读性漏洞。
 *
 * 渲染:transparent + depthWrite=false + renderOrder 靠后 → 雾叠在地形上;单位更高、不透明,
 * 深度测试使其遮住身前的雾(可见单位不被自身位置的雾压暗);雾中敌方单位本就被 drawBars 剔除。
 */
import * as THREE from 'three';
import type { World } from '../sim/world';
import type { GameMap, Team } from '../sim/map';
import { WORLD } from '../data/mapLayout';
import { terrainElevation } from './terrain3d';
import { writeFogRGBA } from '../render/fogShared';

const FOG_MESH_N = 100;            // 纱罩网格分辨率(地形 GRID_N≈118;略粗 + 抬升足以避免穿模)
const FOG_LIFT = 6;               // 抬离地表(防 z-fighting / 高地穿模)
const FOG_UPDATE_INTERVAL = 0.12; // 纹理刷新降频(vision 数据本身 0.25s 一变)

export class Fog3D {
  readonly mesh: THREE.Mesh;
  private tex: THREE.DataTexture;
  private data: Uint8Array;
  private lastUpdate = -1;

  constructor(map: GameMap) {
    this.data = new Uint8Array(map.GW * map.GH * 4);
    this.tex = new THREE.DataTexture(this.data, map.GW, map.GH, THREE.RGBAFormat);
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.LinearFilter;
    this.tex.needsUpdate = true;

    const N = FOG_MESH_N, step = WORLD / (N - 1);
    const positions = new Float32Array(N * N * 3);
    const uvs = new Float32Array(N * N * 2);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = i * step, z = j * step;
        const k = (j * N + i) * 3, u = (j * N + i) * 2;
        positions[k] = x;
        positions[k + 1] = terrainElevation(map, x, z) + FOG_LIFT;
        positions[k + 2] = z;
        uvs[u] = x / WORLD;       // DataTexture flipY=false:uv(0,0)→cell(0,0)→世界(0,0),对齐
        uvs[u + 1] = z / WORLD;
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
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      transparent: true,
      depthWrite: false,
      fog: false,            // 不受场景距离雾影响(雾纱罩自有暗色)
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 6;     // 透明叠加,排在地形/单位之后
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;     // 默认隐藏,update 时按 viewerTeam 开启
  }

  /** 按观察者队伍刷新迷雾纹理;viewerTeam=null(观战)隐藏纱罩(全可见)。 */
  update(world: World, viewerTeam: Team | null, now: number): void {
    if (viewerTeam === null || !world.vision) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    if (now - this.lastUpdate < FOG_UPDATE_INTERVAL) return;
    this.lastUpdate = now;
    if (writeFogRGBA(world, viewerTeam, this.data)) this.tex.needsUpdate = true;
  }

  dispose(): void {
    this.tex.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.geometry.dispose();
  }
}
