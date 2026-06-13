/** Three.js 场景:俯视透视相机、定向光阴影、环境光、昼夜光照。无游戏逻辑。 */
import * as THREE from 'three';
import type { Camera } from '../render/camera';

export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;
  readonly canvas: HTMLCanvasElement;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    parent.appendChild(this.canvas);

    this.scene.background = new THREE.Color('#0a0c08');
    this.scene.fog = new THREE.Fog(0x0a0c08, 3600, 9200); // 距离雾:近处清晰,远端柔化(纵深+柔化地图边缘)
    this.cam = new THREE.PerspectiveCamera(40, 16 / 9, 10, 60000);

    this.sun = new THREE.DirectionalLight('#fff6e0', 1.35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 100;
    this.sun.shadow.camera.far = 6000;
    this.sun.shadow.bias = -0.0004;
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -2400; sc.right = 2400; sc.top = 2400; sc.bottom = -2400;
    sc.updateProjectionMatrix();
    this.scene.add(this.sun, this.sun.target);

    this.ambient = new THREE.AmbientLight('#6a7a8a', 0.95);
    this.scene.add(this.ambient);
    // 半球光:天空/地面渐变填充,提升 PBR 素材受光面(避免英雄结构件发黑)
    this.hemi = new THREE.HemisphereLight('#cfe0f2', '#3a3324', 0.85);
    this.scene.add(this.hemi);
  }

  resize(w: number, h: number) {
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  /** 由 2D Camera(pos=世界中心 XZ,zoom)推导透视相机位姿(固定俯角约 55°)。 */
  syncCamera(c: Camera) {
    const dist = 900 / Math.max(0.12, c.zoom);
    const pitch = Math.PI * 0.27; // ~48° 俯角(更侧视,人形站姿清晰)
    const cx = c.pos.x, cz = c.pos.y;
    this.cam.position.set(cx, Math.sin(pitch) * dist, cz + Math.cos(pitch) * dist);
    this.cam.lookAt(cx, 0, cz);
    this.sun.position.set(cx - 900, 1900, cz - 700);
    this.sun.target.position.set(cx, 0, cz);
    this.sun.target.updateMatrixWorld();
  }

  /** 昼夜光照过渡。 */
  setNight(night: boolean) {
    this.sun.color.set(night ? '#5878b0' : '#fff6e0');
    this.sun.intensity = night ? 0.7 : 1.35;
    this.ambient.color.set(night ? '#2a3550' : '#6a7a8a');
    this.ambient.intensity = night ? 0.7 : 0.95;
    this.hemi.color.set(night ? '#46587e' : '#cfe0f2');
    this.hemi.intensity = night ? 0.5 : 0.85;
    this.scene.background = new THREE.Color(night ? '#05060a' : '#0a0c08');
    if (this.scene.fog) (this.scene.fog as THREE.Fog).color.set(night ? '#05060a' : '#0a0c08');
  }

  render() {
    this.renderer.render(this.scene, this.cam);
  }
}
