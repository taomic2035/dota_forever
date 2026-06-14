/**
 * 公屏播报:一血 / 连杀里程碑(大杀特杀…超越神迹)的中央大字 + 弹入淡出。
 * 纯展示,消费 world 事件(first_blood / hero_kill 含 streakText);全局(含敌方,作预警)。
 */
import type { World } from '../sim/world';
import type { AudioDirector } from '../audio/director';

export class Announce {
  private root: HTMLElement;
  private hideAt = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%) scale(1);',
      'pointer-events:none;z-index:80;opacity:0;transition:opacity .4s, transform .25s;',
      'font-weight:800;font-size:34px;letter-spacing:2px;text-align:center;',
      'text-shadow:0 2px 8px #000,0 0 18px currentColor;white-space:nowrap;',
    ].join('');
    parent.appendChild(this.root);
  }

  private show(text: string, color: string): void {
    this.root.textContent = text;
    this.root.style.color = color;
    this.root.style.opacity = '1';
    this.root.style.transform = 'translate(-50%,-50%) scale(1.18)';
    // 下一帧回落到 1.0(弹入手感)
    requestAnimationFrame(() => { this.root.style.transform = 'translate(-50%,-50%) scale(1)'; });
    this.hideAt = performance.now() + 2400;
  }

  /** 每帧:到期淡出。 */
  update(): void {
    if (this.hideAt && performance.now() >= this.hideAt && this.root.style.opacity !== '0') {
      this.root.style.opacity = '0';
      this.hideAt = 0;
    }
  }

  /** 每 step 消费事件:一血 / 连杀里程碑(streak≥3)。 */
  consume(world: World, audio?: AudioDirector): void {
    for (const e of world.events) {
      if (e.kind === 'first_blood') {
        this.show('一血!', '#ff5252');
        audio?.announce();
      } else if (e.kind === 'hero_kill' && e.streakText) {
        const killer = world.getUnit(e.killerId);
        if ((killer?.heroMeta?.streak ?? 0) >= 3) {
          this.show(e.streakText, '#ffd54f');
          audio?.announce();
        }
      }
    }
  }
}
