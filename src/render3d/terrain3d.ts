/** 3D 地形:地面 + 河道 + 树木(InstancedMesh)。高度图/坡道 V4 后续。 */
import * as THREE from 'three';
import type { GameMap } from '../sim/map';

const WORLD = 15040;
const MAX_TREES = 1400;

export function buildTerrain3D(map: GameMap): THREE.Group {
  const g = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ color: '#33421f' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD / 2, 0, WORLD / 2);
  ground.receiveShadow = true;
  g.add(ground);

  // 河道(对角带)
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD * 1.5, 1500),
    new THREE.MeshLambertMaterial({ color: '#2c4a66', transparent: true, opacity: 0.85 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.rotation.z = Math.PI / 4;
  river.position.set(WORLD / 2, 2, WORLD / 2);
  river.receiveShadow = true;
  g.add(river);

  // 树木:采样树格(每 2 格)→ InstancedMesh(树干 + 树冠共享实例矩阵)
  const pts: { x: number; z: number }[] = [];
  for (let cy = 0; cy < map.GH && pts.length < MAX_TREES; cy += 2) {
    for (let cx = 0; cx < map.GW && pts.length < MAX_TREES; cx += 2) {
      if (map.trees.has(map.cellIndex(cx, cy))) {
        const c = map.cellCenter(cx, cy);
        pts.push({ x: c.x, z: c.y });
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
      m4.makeTranslation(p.x, 0, p.z);
      trunks.setMatrixAt(i, m4);
      folis.setMatrixAt(i, m4);
    });
    trunks.instanceMatrix.needsUpdate = true;
    folis.instanceMatrix.needsUpdate = true;
    g.add(trunks, folis);
  }

  return g;
}
