import type { CombatLogEntry } from './combatLogModel';
import { formatClock } from './combatLogModel';

/** 战斗日志面板:L 键 toggle 的可滚动事件列表(时间戳 + 着色行)。 */
export class CombatLogPanel {
  private root: HTMLElement;
  open = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed;left:12px;top:84px;width:280px;max-height:46vh;display:none;flex-direction:column;',
      'background:#0b0e08ee;border:1px solid #3a4428;border-radius:8px;padding:8px 10px;z-index:46;',
      'color:#cfd8a0;font-size:12px;pointer-events:auto;overflow:hidden;',
    ].join('');
    this.root.innerHTML = `<div style="font-weight:700;color:#e0c98a;margin-bottom:5px;display:flex;justify-content:space-between">
      <span>战斗日志</span><span style="font-size:10px;color:#7d7560">L 关闭</span></div>
      <div id="cl-list" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:1px"></div>`;
    parent.appendChild(this.root);
  }

  toggle(): void {
    this.open = !this.open;
    this.root.style.display = this.open ? 'flex' : 'none';
  }

  render(entries: CombatLogEntry[]): void {
    if (!this.open) return;
    const list = this.root.querySelector('#cl-list')!;
    if (entries.length === 0) {
      list.innerHTML = '<div style="color:#6b6550;font-size:11px;padding:6px 0">暂无战斗事件</div>';
      return;
    }
    list.innerHTML = entries
      .map((e) => `<div style="line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        <span style="color:#6b6550">${formatClock(e.at)}</span> <span style="color:${e.color}">${e.text}</span></div>`)
      .join('');
    list.scrollTop = list.scrollHeight; // 自动滚到最新
  }
}
