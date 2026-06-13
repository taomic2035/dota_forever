/** 主菜单与英雄选择(通过 URL 参数启动对局,无内部状态)。 */
import { HEROES } from '../data/heroes';
import { abilityIconSvg } from './abilityIconSvg';
import {
  ABILITY_CAST_SLOT_COUNT,
  ITEM_CAST_SLOT_COUNT,
  cameraPanSpeedLabel,
  castInputModeLabel,
  cycleCameraPanSpeed,
  cycleCastInputMode,
  cycleCastInputOverride,
  type ControlSettings,
} from '../engine/controlSettings';

const ROLE_NAME: Record<string, string> = {
  carry: '核心', support: '辅助', ganker: '游走', tank: '先手',
};

export function showMenu(parent: HTMLElement): void {
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;' +
    'background:radial-gradient(ellipse at center, #1a2012 0%, #0a0c08 70%);color:#e8e2c8;z-index:200;';
  parent.appendChild(root);

  const title = `
    <div style="font-size:54px;font-weight:800;letter-spacing:6px;color:#d9b44a;text-shadow:0 2px 18px #000">DOTA FOREVER</div>
    <div style="color:#9a8;margin:8px 0 36px;font-size:15px">经典玩法致敬之作 · 5v5 三路推塔 · 全原创内容</div>`;

  const home = () => {
    root.innerHTML = `${title}
      <div style="display:flex;gap:18px">
        <button id="btn-play" style="${btnCss('#2c3a22', '#8fd17a')}">开始对战</button>
        <button id="btn-spectate" style="${btnCss('#1d2330', '#7ec8e3')}">观战 AI 对局</button>
      </div>
      <div style="color:#665;margin-top:46px;font-size:12px;max-width:560px;text-align:center;line-height:1.7">
        操作:右键移动/攻击 · A 强制攻击(可反补) · QWER 技能 · 1-6 物品 · F 商店<br>
        B 买活 · S 停止 · H 保持 · 空格 回到英雄 · Tab 记分板 · P 暂停 · Alt+小地图 信号
      </div>`;
    root.querySelector('#btn-play')!.addEventListener('click', pick);
    root.querySelector('#btn-spectate')!.addEventListener('click', () => {
      location.search = '?mode=spectate&speed=4';
    });
  };

  const pick = () => {
    const cards = HEROES.map((h) => {
      const abilities = h.abilities
        .map((a) => `${a.ultimate ? '【大招】' : ''}${a.name}:${a.description}`)
        .join('\n');
      return `<div class="hero-card" data-key="${h.key}" title="${abilities}" style="
        width:150px;border:2px solid ${h.color};border-radius:10px;padding:12px 8px;cursor:pointer;
        background:#10130bd9;text-align:center;transition:transform .1s;">
        <div style="font-size:34px;color:${h.color}">${h.glyph}</div>
        <div style="font-weight:700;margin-top:6px">${h.name}<span style="color:#9a8;font-size:11px"> · ${h.title}</span></div>
        <div style="font-size:11px;color:#aab;margin-top:3px">${h.primary === 'str' ? '力量' : h.primary === 'agi' ? '敏捷' : '智力'} · ${ROLE_NAME[h.aiRole]}</div>
        <div style="display:flex;gap:5px;justify-content:center;margin-top:7px">${h.abilities.map((a) => abilityIconSvg(a, 22)).join('')}</div>
      </div>`;
    }).join('');
    root.innerHTML = `${title}
      <div style="font-size:17px;color:#cfd8a0;margin-bottom:12px">选择你的英雄</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;align-content:flex-start;max-width:900px;max-height:48vh;overflow-y:auto;padding:4px">${cards}</div>
      <div id="hero-detail" style="width:min(880px,calc(100vw - 40px));min-height:120px;margin-top:12px;padding:12px 16px;background:#0c0f08e0;border:1px solid #3a4428;border-radius:10px;text-align:left">${heroDetailHtml(HEROES[0])}</div>
      <div style="display:flex;gap:14px;margin-top:16px">
        <button id="btn-random" style="${btnCss('#3a3422', '#ffd54f')}">随机英雄</button>
        <button id="btn-back" style="${btnCss('#222', '#999')}">返回</button>
      </div>`;
    const detail = root.querySelector('#hero-detail') as HTMLElement;
    root.querySelectorAll('.hero-card').forEach((el) => {
      el.addEventListener('click', () => {
        location.search = `?mode=play&hero=${(el as HTMLElement).dataset.key}`;
      });
      el.addEventListener('mouseenter', () => {
        (el as HTMLElement).style.transform = 'scale(1.06)';
        const h = HEROES.find((x) => x.key === (el as HTMLElement).dataset.key);
        if (h) detail.innerHTML = heroDetailHtml(h);
      });
      el.addEventListener('mouseleave', () => { (el as HTMLElement).style.transform = ''; });
    });
    root.querySelector('#btn-random')!.addEventListener('click', () => {
      const h = HEROES[Math.floor(Math.random() * HEROES.length)];
      location.search = `?mode=play&hero=${h.key}`;
    });
    root.querySelector('#btn-back')!.addEventListener('click', home);
  };

  home();
}

const PICK_HOTKEYS = ['Q', 'W', 'E', 'R'];
/** 英雄选择详情面板:4 技能(图标+热键+名+CD/法力/类型+描述)。 */
function heroDetailHtml(h: (typeof HEROES)[number]): string {
  const abis = h.abilities.map((a, i) => {
    const cd = a.cooldown?.[0];
    const mp = a.manaCost?.[0];
    const meta = [a.ultimate ? '大招' : a.targetMode === 'passive' ? '被动' : '', cd ? `CD ${cd}s` : '', mp ? `${mp} 法力` : '']
      .filter(Boolean).join(' · ');
    return `<div style="display:flex;gap:8px;align-items:flex-start">
      <div style="flex:none;margin-top:1px">${abilityIconSvg(a, 26)}</div>
      <div style="min-width:0">
        <div style="font-weight:700;color:#e8e2c8;font-size:12px">${PICK_HOTKEYS[i]} · ${a.name}${meta ? ` <span style="color:#8a9;font-weight:400;font-size:10px">${meta}</span>` : ''}</div>
        <div style="font-size:11px;color:#aab;line-height:1.35">${a.description}</div>
      </div></div>`;
  }).join('');
  const prim = h.primary === 'str' ? '力量' : h.primary === 'agi' ? '敏捷' : '智力';
  return `<div style="font-weight:700;color:${h.color};margin-bottom:6px">${h.name} · ${h.title} <span style="color:#9a8;font-weight:400;font-size:12px">(${prim} · ${ROLE_NAME[h.aiRole]})</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px">${abis}</div>`;
}

function btnCss(bg: string, color: string): string {
  return `padding:14px 38px;font-size:19px;border-radius:10px;border:1px solid ${color}55;\
background:${bg};color:${color};cursor:pointer;font-weight:700;letter-spacing:2px;`;
}

/** 游戏内 ESC 暂停菜单。 */
export interface PauseMenuControlOptions {
  getSettings(): ControlSettings;
  onChange(settings: ControlSettings): void;
}

export function createPauseMenu(
  parent: HTMLElement,
  onResume: () => void,
  controls?: PauseMenuControlOptions,
): { toggle: () => void } {
  const abilityHotkeys = ['Q', 'W', 'E', 'R'];
  const abilityButtons = Array.from({ length: ABILITY_CAST_SLOT_COUNT }, (_, index) =>
    `<button id="pm-ability-cast-slot-${index}" data-ability-cast-slot="${index}" style="${slotBtnCss('#152031', '#7ec8e3')}"></button>`,
  ).join('');
  const itemButtons = Array.from({ length: ITEM_CAST_SLOT_COUNT }, (_, index) =>
    `<button id="pm-item-cast-slot-${index}" data-item-cast-slot="${index}" style="${slotBtnCss('#272314', '#d9b44a')}"></button>`,
  ).join('');
  const root = document.createElement('div');
  root.style.cssText =
    'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;' +
    'background:rgba(5,7,4,0.7);z-index:120;color:#e8e2c8;gap:14px;';
  root.innerHTML = `
    <div style="font-size:30px;font-weight:700;color:#cfd8a0">游戏暂停</div>
    ${controls ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:360px">
      <button id="pm-ability-cast" style="${compactBtnCss('#1d2330', '#7ec8e3')}"></button>
      <button id="pm-item-cast" style="${compactBtnCss('#2c2a18', '#d9b44a')}"></button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:360px">
      <button id="pm-camera-speed" style="${compactBtnCss('#18271f', '#8fd17a')}"></button>
      <button id="pm-edge-pan" style="${compactBtnCss('#221a2c', '#c39cff')}"></button>
    </div>
    <div style="width:430px;display:flex;flex-direction:column;gap:7px">
      <div style="${sectionLabelCss('#7ec8e3')}">Abilities</div>
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px">${abilityButtons}</div>
      <div style="${sectionLabelCss('#d9b44a')}">Items</div>
      <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:6px">${itemButtons}</div>
    </div>` : ''}
    <button id="pm-resume" style="${btnCss('#2c3a22', '#8fd17a')}">继续游戏</button>
    <button id="pm-restart" style="${btnCss('#3a3422', '#ffd54f')}">重新开始</button>
    <button id="pm-menu" style="${btnCss('#222', '#999')}">回主菜单</button>`;
  parent.appendChild(root);
  let shown = false;
  const toggle = () => {
    shown = !shown;
    root.style.display = shown ? 'flex' : 'none';
    onResume();
  };
  const syncControls = () => {
    if (!controls) return;
    const settings = controls.getSettings();
    const ability = root.querySelector('#pm-ability-cast') as HTMLButtonElement | null;
    const item = root.querySelector('#pm-item-cast') as HTMLButtonElement | null;
    const camera = root.querySelector('#pm-camera-speed') as HTMLButtonElement | null;
    const edgePan = root.querySelector('#pm-edge-pan') as HTMLButtonElement | null;
    if (ability) ability.textContent = `Ability ${castInputModeLabel(settings.abilityCast)}`;
    if (item) item.textContent = `Item ${castInputModeLabel(settings.itemCast)}`;
    if (camera) camera.textContent = `Camera ${cameraPanSpeedLabel(settings.cameraPanSpeed)}`;
    if (edgePan) edgePan.textContent = `Edge ${settings.cameraEdgePan ? 'On' : 'Off'}`;
    root.querySelectorAll<HTMLButtonElement>('[data-ability-cast-slot]').forEach((button) => {
      const slot = Number(button.dataset.abilityCastSlot);
      const hotkey = abilityHotkeys[slot] ?? '?';
      button.textContent = `${hotkey} ${slotOverrideLabel(settings.abilityCasts[slot])}`;
    });
    root.querySelectorAll<HTMLButtonElement>('[data-item-cast-slot]').forEach((button) => {
      const slot = Number(button.dataset.itemCastSlot);
      button.textContent = `${slot + 1} ${slotOverrideLabel(settings.itemCasts[slot])}`;
    });
  };
  root.querySelector('#pm-ability-cast')?.addEventListener('click', () => {
    if (!controls) return;
    const settings = controls.getSettings();
    controls.onChange({ ...settings, abilityCast: cycleCastInputMode(settings.abilityCast) });
    syncControls();
  });
  root.querySelector('#pm-item-cast')?.addEventListener('click', () => {
    if (!controls) return;
    const settings = controls.getSettings();
    controls.onChange({ ...settings, itemCast: cycleCastInputMode(settings.itemCast) });
    syncControls();
  });
  root.querySelector('#pm-camera-speed')?.addEventListener('click', () => {
    if (!controls) return;
    const settings = controls.getSettings();
    controls.onChange({ ...settings, cameraPanSpeed: cycleCameraPanSpeed(settings.cameraPanSpeed) });
    syncControls();
  });
  root.querySelector('#pm-edge-pan')?.addEventListener('click', () => {
    if (!controls) return;
    const settings = controls.getSettings();
    controls.onChange({ ...settings, cameraEdgePan: !settings.cameraEdgePan });
    syncControls();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-ability-cast-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!controls) return;
      const slot = Number(button.dataset.abilityCastSlot);
      const settings = controls.getSettings();
      const abilityCasts = settings.abilityCasts.slice();
      abilityCasts[slot] = cycleCastInputOverride(abilityCasts[slot]);
      controls.onChange({ ...settings, abilityCasts });
      syncControls();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-item-cast-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!controls) return;
      const slot = Number(button.dataset.itemCastSlot);
      const settings = controls.getSettings();
      const itemCasts = settings.itemCasts.slice();
      itemCasts[slot] = cycleCastInputOverride(itemCasts[slot]);
      controls.onChange({ ...settings, itemCasts });
      syncControls();
    });
  });
  syncControls();
  root.querySelector('#pm-resume')!.addEventListener('click', toggle);
  root.querySelector('#pm-restart')!.addEventListener('click', () => location.reload());
  root.querySelector('#pm-menu')!.addEventListener('click', () => { location.search = ''; });
  return { toggle };
}

function compactBtnCss(bg: string, color: string): string {
  return `height:44px;font-size:13px;border-radius:6px;border:1px solid ${color}55;\
background:${bg};color:${color};cursor:pointer;font-weight:700;letter-spacing:0;`;
}

function slotBtnCss(bg: string, color: string): string {
  return `height:34px;font-size:11px;border-radius:5px;border:1px solid ${color}44;\
background:${bg};color:${color};cursor:pointer;font-weight:700;letter-spacing:0;white-space:nowrap;`;
}

function sectionLabelCss(color: string): string {
  return `font-size:11px;color:${color};text-transform:uppercase;letter-spacing:0;text-align:left;`;
}

function slotOverrideLabel(mode: ControlSettings['abilityCasts'][number]): string {
  return mode ? castInputModeLabel(mode) : 'Auto';
}
