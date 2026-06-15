/** 主循环:固定步长模拟 + rAF 渲染插值;支持倍速与暂停。 */
import { DT } from '../data/balance';

export interface LoopHooks {
  step(): void;
  render(alpha: number): void;
}

/** 观战变速档位。 */
export const SPEED_STEPS = [0.5, 1, 2, 4, 8] as const;

/** 在固定速度档位间步进:返回 current 按 dir(+1 加速/-1 减速)移动一档后的速度(就近吸附 + 钳制端点)。 */
export function steppedSpeed(current: number, dir: 1 | -1, steps: readonly number[] = SPEED_STEPS): number {
  let i = steps.findIndex((s) => s >= current - 1e-6);
  if (i < 0) i = steps.length - 1;
  return steps[Math.max(0, Math.min(steps.length - 1, i + dir))];
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
