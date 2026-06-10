/**
 * 迷雾渲染:低分辨率离屏(1px/格)三档透明度(未探索/已探索/可见),放大柔化叠加。
 */
import type { World } from '../sim/world';
import type { Camera } from './camera';
import { Team } from '../sim/map';

export class FogRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;

  constructor(private gw: number, private gh: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = gw;
    this.canvas.height = gh;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(gw, gh);
  }

  /** 更新迷雾位图(每渲染帧调用,数据本身 0.25s 一变)。 */
  update(world: World, team: Team): void {
    if (!world.vision) return;
    const grid = world.vision.grids[team as 0 | 1];
    const explored = world.vision.explored[team as 0 | 1];
    const d = this.img.data;
    for (let i = 0; i < grid.length; i++) {
      const o = i * 4;
      d[o] = 4; d[o + 1] = 6; d[o + 2] = 3;
      d[o + 3] = grid[i] ? 0 : explored[i] ? 150 : 235;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }

  /** 叠加到主画布(跟随镜头变换)。 */
  draw(ctx: CanvasRenderingContext2D, camera: Camera, cellSize: number): void {
    const scale = camera.zoom * cellSize;
    const topLeft = camera.screenToWorld({ x: 0, y: 0 });
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      this.canvas,
      -topLeft.x / cellSize * scale,
      -topLeft.y / cellSize * scale,
      this.gw * scale,
      this.gh * scale,
    );
    ctx.restore();
  }
}
