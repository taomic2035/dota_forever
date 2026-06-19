/** Three.js 场景:俯视透视相机、定向光阴影、环境光、昼夜光照 + 后处理(Bloom/色调映射)。无游戏逻辑。 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Camera } from '../render/camera';

export class Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  readonly hemi: THREE.HemisphereLight;
  readonly canvas: HTMLCanvasElement;
  /** 后处理合成器:RenderPass → Bloom(发光件/特效辉光)→ OutputPass(色调映射输出)。 */
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // 设备像素比(Retina 等高 DPI):必须在创建 composer 前设置,使 composer 的渲染目标
    // 继承同一 pixelRatio。否则默认 1 → 高 DPI 下半分辨率(模糊),且某些 GPU/驱动上
    // 渲染目标与画布 drawingBuffer 比例错配会出现「只渲染 1/4 画面」。上限 2 防 5K 过载。
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // 电影级色调映射,质感更润
    this.renderer.toneMappingExposure = 1.45;
    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    parent.appendChild(this.canvas);

    this.scene.background = new THREE.Color('#5a6e7c');
    this.scene.fog = new THREE.Fog(0x6a7e8c, 4200, 11000); // 距离雾:远端柔化并褪入天空地平线(非褪入虚空)
    this.cam = new THREE.PerspectiveCamera(40, 16 / 9, 10, 60000);
    // 天空穹顶由 V4 地形层(terrain3d.buildTerrain3D 的 terrain-sky-dome)提供,场景不再自建。

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

    // 后处理:Bloom 仅对高亮(发光/特效)生效(threshold 0.82),适度强度避免过曝
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.55, 0.5, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  resize(w: number, h: number) {
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  /** 由 2D Camera(pos=世界中心 XZ,zoom)推导透视相机位姿(固定俯角约 55°)。 */
  syncCamera(c: Camera) {
    const dist = 900 / Math.max(0.12, c.zoom);
    const pitch = Math.PI * 0.31; // ~56° 俯角(更俯视,战场可读性优先,兼顾人形可辨)
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
    // 雾/背景随昼夜过渡(地平线色;天空穹顶由 V4 地形层提供,远景柔化进地平线)
    const horizon = night ? '#141d33' : '#6a7e8c';
    this.scene.background = new THREE.Color(horizon);
    if (this.scene.fog) (this.scene.fog as THREE.Fog).color.set(horizon);
  }

  render() {
    this.composer.render();
  }
}
