/** Tab 记分板:双方英雄 等级/状态/KDA/补刀/金币/净值/装备。 */
import type { World } from '../sim/world';
import { Team } from '../sim/map';
import { scoreboardHeroSummary } from './scoreboardModel';

export class Scoreboard {
  private root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;top:64px;left:50%;transform:translateX(-50%);display:none;z-index:50;' +
      'background:#0c0f08f0;border:1px solid #3a4428;border-radius:10px;padding:12px 16px;color:#e8e2c8;font-size:13px;';
    parent.appendChild(this.root);
  }

  setVisible(show: boolean, world?: World): void {
    this.root.style.display = show ? 'block' : 'none';
    if (show && world) this.render(world);
  }

  private render(world: World): void {
    const section = (team: Team) => {
      const heroes = [...world.units.values()].filter((u) => u.isHero() && u.team === team);
      const color = team === Team.Dawn ? '#8fd17a' : '#ef9a9a';
      const name = team === Team.Dawn ? '晨曦军团' : '永夜军团';
      const kills = heroes.reduce((s, h) => s + h.heroMeta!.kills, 0);
      const rows = heroes
        .map((h) => {
          const m = h.heroMeta!;
          const summary = scoreboardHeroSummary({
            gold: m.gold,
            level: h.level,
            alive: h.alive,
            now: world.time,
            respawnAt: m.respawnAt,
            buybackCooldownUntil: m.buybackCooldownUntil,
            inventory: h.inventory,
            backpack: h.backpack,
            stash: h.stash,
            tpSlot: h.tpSlot,
          });
          const items = summary.items
            .map((i) => `<span title="${i.tooltip}">${i.label}${i.charges > 1 ? `x${i.charges}` : ''}</span>`)
            .join(' / ');
          const respawnIn = !h.alive ? Math.max(0, Math.ceil((m.respawnAt ?? world.time) - world.time)) : 0;
          const nameCell = h.alive
            ? `${h.heroDef?.glyph ?? ''} ${h.name}`
            : `<span style="color:#ef5350">✖</span> ${h.name} <span style="color:#ef5350;font-size:11px">复活 ${respawnIn}s</span>`;
          return `<tr style="opacity:${h.alive ? 1 : 0.55}">
            <td style="padding:2px 10px;color:${h.heroDef?.color ?? '#ccc'}">${nameCell}</td>
            <td style="padding:2px 10px">${h.level}</td>
            <td title="${summary.status.detail}" style="padding:2px 10px;color:${summary.status.color};font-size:11px;font-weight:700;white-space:nowrap">${summary.status.label}${summary.status.detail ? ` <span style="font-weight:400;color:#b7ad91">${summary.status.detail}</span>` : ''}</td>
            <td style="padding:2px 10px">${m.kills}/${m.deaths}/${m.assists}</td>
            <td style="padding:2px 10px">${m.lastHits}/${m.denies}</td>
            <td style="padding:2px 10px;color:#ffd54f">${summary.gold}</td>
            <td style="padding:2px 10px;color:#ffd76a;font-weight:700">${summary.netWorth}</td>
            <td style="padding:2px 10px;font-size:11px;color:#aab">${items}</td>
          </tr>`;
        })
        .join('');
      return `<div style="color:${color};font-weight:700;margin:6px 0 2px">${name} — ${kills} 击杀</div>
        <table style="border-collapse:collapse">
          <tr style="color:#9a8;font-size:11px"><th style="padding:0 10px">英雄</th><th>级</th><th>状态</th><th>杀/死/助</th><th>补/反</th><th>金</th><th>净值</th><th>装备</th></tr>
          ${rows}
        </table>`;
    };
    this.root.innerHTML = section(Team.Dawn) + section(Team.Night);
  }
}
