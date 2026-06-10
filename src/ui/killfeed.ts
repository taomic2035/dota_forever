/** 击杀播报:右上角滚动条目,6 秒淡出。 */
import type { World } from '../sim/world';

export class KillFeed {
  private root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;top:48px;right:12px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;pointer-events:none;z-index:30;';
    parent.appendChild(this.root);
  }

  /** 每次 step 后调用,消费当帧事件。 */
  consume(world: World): void {
    for (const e of world.events) {
      if (e.kind === 'hero_kill') {
        const killer = world.getUnit(e.killerId);
        const victim = world.getUnit(e.victimId);
        const text = e.streakText ?? `${victim?.name ?? '英雄'} 阵亡`;
        this.push(text, killer ? (killer.team === 0 ? '#8fd17a' : '#ef9a9a') : '#bbb', e.bounty);
      } else if (e.kind === 'tower_fell') {
        this.push(`${world.getUnit(e.unitId)?.name ?? '防御塔'} 被摧毁`, '#ffd54f');
      } else if (e.kind === 'rax_fell') {
        this.push(`${world.getUnit(e.unitId)?.name ?? '兵营'} 被摧毁`, '#ffb74d');
      } else if (e.kind === 'boss_killed') {
        this.push('深渊领主被击败!', '#ce93d8');
      }
    }
  }

  push(text: string, color: string, bounty?: number): void {
    const el = document.createElement('div');
    el.style.cssText =
      `background:#10130bcc;border:1px solid #3a4428;border-radius:6px;padding:4px 10px;font-size:13px;color:${color};` +
      'text-shadow:0 1px 2px #000;transition:opacity 1s;';
    el.textContent = bounty ? `${text}(+${bounty})` : text;
    this.root.appendChild(el);
    while (this.root.children.length > 6) this.root.removeChild(this.root.firstChild!);
    setTimeout(() => { el.style.opacity = '0'; }, 5000);
    setTimeout(() => el.remove(), 6200);
  }
}
