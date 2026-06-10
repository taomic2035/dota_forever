/** 胜负结算画面。 */
import type { World } from '../sim/world';
import { Team } from '../sim/map';

export class EndScreen {
  private root: HTMLElement;
  shown = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;' +
      'background:rgba(5,7,4,0.82);z-index:100;color:#e8e2c8;';
    parent.appendChild(this.root);
  }

  /** 每帧检查;playerTeam null = 观战。 */
  check(world: World, playerTeam: Team | null): void {
    if (this.shown || world.gameOver === null) return;
    this.shown = true;
    const winner = world.gameOver;
    const winnerName = winner === Team.Dawn ? '晨曦军团' : '永夜军团';
    let title: string;
    let color: string;
    if (playerTeam === null) {
      title = `${winnerName} 获胜!`;
      color = winner === Team.Dawn ? '#8fd17a' : '#ef9a9a';
    } else if (winner === playerTeam) {
      title = '胜利!';
      color = '#ffd54f';
    } else {
      title = '战败…';
      color = '#ef9a9a';
    }
    // 简易战绩汇总
    const heroes = [...world.units.values()].filter((u) => u.isHero() && u.heroMeta);
    const rows = heroes
      .map((h) => {
        const m = h.heroMeta!;
        const teamColor = h.team === Team.Dawn ? '#8fd17a' : '#ef9a9a';
        return `<tr style="color:${teamColor}"><td style="padding:2px 14px">${h.name}</td>` +
          `<td style="padding:2px 14px">Lv ${h.level}</td>` +
          `<td style="padding:2px 14px">${m.kills}/${m.deaths}/${m.assists}</td>` +
          `<td style="padding:2px 14px">${m.lastHits}/${m.denies}</td>` +
          `<td style="padding:2px 14px">${m.gold}</td></tr>`;
      })
      .join('');
    const mm = Math.floor(world.time / 60);
    const ss = Math.floor(world.time % 60).toString().padStart(2, '0');
    this.root.innerHTML = `
      <div style="font-size:56px;font-weight:700;color:${color};text-shadow:0 2px 12px #000">${title}</div>
      <div style="color:#9a8;margin:6px 0 18px">比赛时长 ${mm}:${ss} — ${winnerName} 摧毁了敌方主基地</div>
      <table style="border-collapse:collapse;background:#10130bd9;border:1px solid #3a4428;border-radius:8px;font-size:14px">
        <tr style="color:#cfd8a0"><th style="padding:4px 14px">英雄</th><th>等级</th><th>杀/死/助</th><th>正补/反补</th><th>金币</th></tr>
        ${rows}
      </table>
      <button id="restart-btn" style="margin-top:22px;padding:10px 34px;font-size:17px;border-radius:8px;border:1px solid #5a6a3a;
        background:#2c3a22;color:#e8e2c8;cursor:pointer">再来一局</button>`;
    this.root.style.display = 'flex';
    this.root.querySelector('#restart-btn')!.addEventListener('click', () => location.reload());
  }
}
