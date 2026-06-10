/** 主循环:固定步长模拟 + rAF 渲染插值;支持倍速与暂停。 */
import { DT } from '../data/balance';

export interface LoopHooks {
  step(): void;
  render(alpha: number): void;
}

export class GameLoop {
  speed = 1;
  paused = false;
  private acc = 0;
  private last = 0;
  private rafId = 0;

  constructor(private hooks: LoopHooks) {}

  start() {
    this.last = performance.now();
    const frame = (now: number) => {
      this.rafId = requestAnimationFrame(frame);
      let elapsed = (now - this.last) / 1000;
      this.last = now;
      if (elapsed > 0.25) elapsed = 0.25; // 切后台保护
      if (!this.paused) {
        this.acc += elapsed * this.speed;
        // 单帧最多模拟 12 步(高倍速保护),超出丢弃
        let steps = 0;
        while (this.acc >= DT && steps < 12 * Math.max(1, this.speed / 4)) {
          this.hooks.step();
          this.acc -= DT;
          steps++;
        }
        if (this.acc > DT * 4) this.acc = 0;
      }
      this.hooks.render(Math.min(1, this.acc / DT));
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }
}
