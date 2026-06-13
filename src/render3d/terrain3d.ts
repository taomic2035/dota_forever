/** V1 平面地形占位(地面 + 河道色块)。V4 升级为高度图/坡道/河道/树/地标。 */
import * as THREE from 'three';

const WORLD = 15040;

export function buildTerrain3D(): THREE.Group {
  const g = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ color: '#3a4a2a' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD / 2, 0, WORLD / 2);
  ground.receiveShadow = true;
  g.add(ground);

  // 河道占位:中央对角带(V4 替换为真实河道几何)
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD * 1.5, 1500),
    new THREE.MeshLambertMaterial({ color: '#2c4a66', transparent: true, opacity: 0.85 }),
  );
  river.rotation.x = -Math.PI / 2;
  river.rotation.z = Math.PI / 4;
  river.position.set(WORLD / 2, 2, WORLD / 2);
  river.receiveShadow = true;
  g.add(river);

  return g;
}
