import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { AbilityDef } from '../data/heroes/types';
import type { ItemInstance } from '../sim/items';
import { heroAttributes, canBuyback } from '../sim/hero';
import { buybackCost, RUNE_INTERVAL } from '../data/balance';
import { canLearn, canLearnStatBonus, abilityReady, hasScepter } from '../sim/abilities';
import { itemDef } from '../data/items';
import type { UxFeedback } from './uxFeedback';
import { fxStyle } from '../render/fxStyle';
import { statusChips, statusChipTime } from '../render/statusChips';
import { abilityIconSvg } from './abilityIconSvg';
import { DEFAULT_CONTROL_SETTINGS, type ControlSettings } from '../engine/controlSettings';
import { commandCardActionFromValue, type CommandCardAction } from '../engine/commandCardActions';
import { buildCommandCard, buildSelectionSummary, type CommandCardButton, type SelectionSummary } from './commandCard';
import { buildCourierHudModel, type CourierHudModel } from './courierHudModel';
import { buildHeroXpHudModel, type HeroXpHudModel } from './heroXpHudModel';

const HOTKEYS = ['Q', 'W', 'E', 'R'];

export class Hud {
  root: HTMLElement;
  private topbar: HTMLElement;
  private bottom: HTMLElement;
  /** 低血危险暗角:血量越低红光越强,临界脉动(DotA-like 危险反馈)。 */
  private vignette: HTMLElement;
  onLearn?: (index: number) => void;
  onLearnStat?: () => void;
  onBuyback?: () => void;
  onSell?: (invSlot: number) => void;
  onMoveToBackpack?: (invSlot: number) => void;
  onMoveFromBackpack?: (bpSlot: number) => void;
  onCommandCard?: (action: CommandCardAction) => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:inherit;color:#e8e2c8;';
    parent.appendChild(this.root);

    this.topbar = document.createElement('div');
    this.topbar.style.cssText = [
      'position:absolute;top:0;left:50%;transform:translateX(-50%);',
      'background:linear-gradient(#1d2316ee,#10130bee);border:1px solid #3a4428;border-top:none;',
      'border-radius:0 0 8px 8px;padding:4px 18px;font-size:14px;display:flex;gap:18px;align-items:center;',
    ].join('');
    this.root.appendChild(this.topbar);

    this.bottom = document.createElement('div');
    this.bottom.style.cssText = [
      'position:absolute;bottom:0;left:50%;transform:translateX(-50%);pointer-events:auto;',
      'width:min(920px,calc(100vw - 260px));height:172px;box-sizing:border-box;',
      'background:linear-gradient(#182015f6,#070a06fb);border:1px solid #5a4a25;border-bottom:none;',
      'box-shadow:0 -8px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,230,150,.08);',
      'border-radius:8px 8px 0 0;padding:8px 10px;font-size:12px;',
    ].join('');
    this.root.appendChild(this.bottom);

    // 低血危险暗角(全屏红光内阴影,pointer-events:none,默认透明;update 按血量驱动)
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;box-shadow:inset 0 0 160px 40px rgba(200,10,10,0.85);transition:opacity .12s;';
    this.root.insertBefore(this.vignette, this.topbar); // 置于最底,不遮 HUD/按钮

    // 用 mousedown 而非 click:HUD 每帧重建 innerHTML,click 需 mousedown+mouseup 命中同一元素,
    // 但元素在两者之间被重建销毁 → click 永不触发(学技能/买活/背包点击全失效)。mousedown 按下即触发,先于重建。
    this.bottom.addEventListener('mousedown', (e) => {
      const el = (e.target as HTMLElement).closest('[data-command-card],[data-learn],[data-learnstat],[data-buyback],[data-bag],[data-bagout]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      // 右键库存物品 → 出售(经 shop.sellSlot 校验商店范围 + toast,天然防误卖)
      if (e.button === 2 && el.hasAttribute('data-bag')) { this.onSell?.(Number(el.getAttribute('data-bag'))); return; }
      if (e.button === 2) return; // 其他槽位右键不处理
      const commandAction = commandCardActionFromValue(el.getAttribute('data-command-card'));
      if (commandAction) this.onCommandCard?.(commandAction);
      else if (el.hasAttribute('data-buyback')) this.onBuyback?.();
      else if (el.hasAttribute('data-learnstat')) this.onLearnStat?.();
      else if (el.hasAttribute('data-bag')) this.onMoveToBackpack?.(Number(el.getAttribute('data-bag')));
      else if (el.hasAttribute('data-bagout')) this.onMoveFromBackpack?.(Number(el.getAttribute('data-bagout')));
      else this.onLearn?.(Number(el.getAttribute('data-learn')));
    });
  }

  update(world: World, hero: Unit | undefined, ux?: UxFeedback, controlSettings: ControlSettings = DEFAULT_CONTROL_SETTINGS): void {
    this.renderTopbar(world, hero);
    if (!hero) {
      this.bottom.innerHTML = '';
      return;
    }

    const attrs = heroAttributes(hero);
    const meta = hero.heroMeta!;
    const dead = !hero.alive;
    const respawnIn = Math.max(0, Math.ceil(meta.respawnAt - world.time));
    // 低血危险暗角:血 <35% 起红光渐强,<20% 脉动(DotA-like 危险反馈,提醒撤退)
    const hpFrac = dead ? 1 : hero.hp / Math.max(1, hero.calc.maxHp);
    if (hpFrac < 0.35) {
      const danger = (0.35 - hpFrac) / 0.35;
      const pulse = hpFrac < 0.2 ? 0.78 + 0.22 * Math.sin(performance.now() / 130) : 1;
      this.vignette.style.opacity = String(Math.min(0.6, danger * 0.62 * pulse).toFixed(3));
    } else if (this.vignette.style.opacity !== '0') {
      this.vignette.style.opacity = '0';
    }
    const abilityHtml = (hero.heroDef?.abilities ?? []).map((_, i) => this.abilitySlot(world, hero, i, ux)).join('');
    const itemHtml = hero.inventory.map((inst, i) => this.itemSlot(world, inst, i, ux)).join('');
    const tpHtml = this.itemSlot(world, hero.tpSlot, 6, ux); // 专属回城卷轴槽
    const bagHtml = hero.backpack.map((inst, j) => this.backpackSlot(inst, j)).join(''); // 背包栏(3 格)
    const xpModel = buildHeroXpHudModel({ level: hero.level, xp: meta.xp });
    const commandHtml = this.commandCard(controlSettings);
    const selectionSummary = this.selectionSummary(world, hero, ux);
    const courierSummary = this.courierSummary(world, hero, ux);

    this.bottom.innerHTML = `
      <div style="display:grid;grid-template-columns:260px 1fr 392px;gap:10px;height:100%;">
        <div style="display:grid;grid-template-columns:74px 1fr;gap:8px;min-width:0;">
          <div style="position:relative;width:74px;height:74px;border-radius:4px;border:2px solid ${hero.heroDef?.color ?? '#888'};background:${dead ? '#252525' : (hero.heroDef?.color ?? '#555') + '33'};display:flex;align-items:center;justify-content:center;font-size:34px;color:${hero.heroDef?.color ?? '#ccc'}">
            ${hero.heroDef?.glyph ?? '?'}
            <span style="position:absolute;left:-5px;bottom:-7px;background:#0b0d09;border:1px solid #caa84a;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;color:#ffd76a;font-weight:800">${hero.level}</span>
            ${meta.skillPoints > 0 ? `<span style="position:absolute;top:-7px;right:-7px;background:#ffd54f;color:#1a1a0a;font-size:11px;font-weight:800;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px #ffd54f">+${meta.skillPoints}</span>` : ''}
          </div>
          <div style="min-width:0;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">
              <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hero.name}</b>
              <span style="color:#d9b44a;white-space:nowrap">${meta.kills}/${meta.deaths}/${meta.assists}</span>
            </div>
            ${dead ? `<div style="color:#ef5350;font-size:14px;padding:6px 0 3px">阵亡 - ${respawnIn}s</div>${this.deathRecap(world, hero)}${this.buybackRow(world, hero)}` : `${this.meter(hero.hp, hero.calc.maxHp, '#4caf50', '#1f6b2b', '生命')}${this.meter(hero.mp, hero.calc.maxMp, '#42a5f5', '#14569a', '法力')}${this.xpBar(xpModel)}`}
            ${dead ? '' : `<div style="display:flex;gap:8px;margin-top:4px;font-size:12px;font-weight:700;">
              <span title="护甲(物理减伤)" style="flex:1;text-align:center;background:#1c2230;border:1px solid #3a4a6a;border-radius:3px;padding:2px 0;color:#9ec1ff">🛡 ${hero.calc.armor.toFixed(1)}</span>
              <span title="魔法抗性" style="flex:1;text-align:center;background:#241c30;border:1px solid #4a3a6a;border-radius:3px;padding:2px 0;color:#c6a0ff">✨ ${Math.round((hero.calc.magicResist ?? 0) * 100)}%</span>
              <span title="攻击力" style="flex:1;text-align:center;background:#2a2418;border:1px solid #5a4a25;border-radius:3px;padding:2px 0;color:#ffd28a">⚔ ${Math.round(hero.calc.dmgMin)}-${Math.round(hero.calc.dmgMax)}</span>
            </div>`}
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px 8px;margin-top:4px;color:#cfc7a5;font-size:11px;">
              <span title="力量/敏捷/智力">STR ${attrs.str.toFixed(0)} AGI ${attrs.agi.toFixed(0)} INT ${attrs.int.toFixed(0)}</span>
              <span title="移动速度">移速 ${Math.round(hero.calc.moveSpeed)}</span>
              <span title="攻击速度(次/秒)">攻速 ${((1 + (hero.calc.ias ?? 0)) / Math.max(0.1, hero.calc.bat)).toFixed(2)}/s</span>
              <span title="正补/反补">补/反 ${meta.lastHits}/${meta.denies}</span>
            </div>
            ${dead ? '' : this.buffBar(world, hero)}
          </div>
        </div>
        <div style="display:grid;grid-template-rows:auto 1fr;gap:6px;min-width:0;align-items:end;">
          <div style="align-self:start;justify-self:center;width:min(246px,100%);">
            ${this.courierStatusHtml(courierSummary)}
            ${selectionSummary.visible ? this.selectionSummaryHtml(selectionSummary) : ''}
            ${commandHtml}
          </div>
          <div style="display:flex;align-items:end;justify-content:center;gap:5px;min-width:0;">
            ${abilityHtml}
            ${this.statBonusSlot(hero)}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:flex-end;justify-content:end;">
          <div style="align-self:flex-end">${tpHtml}</div>
          <div style="display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,64px);gap:5px;align-content:end;justify-content:end;">
            ${itemHtml}
          </div>
          <div title="背包栏" style="display:flex;flex-direction:column;gap:4px;align-self:flex-end;">
            ${bagHtml}
          </div>
        </div>
      </div>`;
  }

  private commandCard(settings: ControlSettings): string {
    const buttons = buildCommandCard(settings);
    return `<div title="Command card" style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;">${buttons.map((button) => this.commandButton(button)).join('')}</div>`;
  }

  private courierSummary(world: World, hero: Unit, ux?: UxFeedback): CourierHudModel {
    const couriers = [...world.units.values()].filter((unit) => unit.kind === 'courier' && unit.team === hero.team);
    const courier = couriers.find((unit) => unit.alive) ?? couriers[couriers.length - 1];
    const fountain = [...world.units.values()].find((unit) => unit.kind === 'building' && unit.team === hero.team && unit.buildingKind === 'fountain');
    const atFountain = !!(courier && fountain && this.distSq(courier, fountain) <= 360 * 360);
    const stashItems = hero.stash.filter((item) => item !== null).length;

    return buildCourierHudModel({
      selectedUnitId: ux?.selectedUnitId,
      courier: courier ? {
        id: courier.id,
        alive: courier.alive,
        hp: courier.hp,
        maxHp: courier.calc.maxHp,
        orderType: courier.order?.type,
        atFountain,
        stashItems,
      } : undefined,
    });
  }

  private distSq(a: Unit, b: Unit): number {
    const dx = a.pos.x - b.pos.x;
    const dy = a.pos.y - b.pos.y;
    return dx * dx + dy * dy;
  }

  private courierStatusHtml(model: CourierHudModel): string {
    const palette: Record<CourierHudModel['tone'], { border: string; bg: string; fg: string; hp: string }> = {
      ready: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74', hp: '#6fcf5a' },
      busy: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a', hp: '#d9b44a' },
      danger: { border: '#8a3434', bg: '#260d0d', fg: '#ff8f8f', hp: '#ef5350' },
      muted: { border: '#3b3d35', bg: '#11130f', fg: '#9a9277', hp: '#55584a' },
    };
    const p = palette[model.tone];
    const selected = model.selected ? 'box-shadow:0 0 0 1px #d9b44a inset,0 0 8px #d9b44a55;' : '';
    return `<div data-command-card="selectCourier" title="${model.detail} - F2 selects courier" style="height:21px;margin-bottom:3px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:5px;padding:0 5px;box-sizing:border-box;cursor:pointer;${selected}">
      <b style="font-size:9px;letter-spacing:0;white-space:nowrap;">${model.label}</b>
      <span style="font-size:9px;color:#cfc7a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${model.detail}</span>
      <span style="min-width:32px;text-align:right;color:${p.hp};font-size:9px;font-weight:800;">${model.hpPercent}%</span>
    </div>`;
  }

  private commandButton(button: CommandCardButton): string {
    return `<div title="${button.tooltip}" data-command-card="${button.action}" style="height:24px;border:1px solid #425331;border-radius:3px;background:#11180d;color:#d8d0ae;display:grid;grid-template-columns:1fr auto;align-items:center;gap:3px;padding:0 4px;box-sizing:border-box;opacity:${button.enabled ? 1 : 0.45};">
      <span style="font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${button.label}</span>
      <span style="min-width:20px;text-align:center;border:1px solid #6a5a2a;border-radius:2px;background:#211b0d;color:#ffd76a;font-size:9px;font-weight:800;line-height:14px;">${button.hotkey}</span>
    </div>`;
  }

  private selectionSummary(world: World, hero: Unit, ux?: UxFeedback): SelectionSummary {
    const commandableUnits = (ux?.commandableSelectedIds ?? [])
      .map((id) => world.getUnit(id))
      .filter((unit): unit is Unit => !!unit && unit.alive);
    const primary = ux?.selectedUnitId ? world.getUnit(ux.selectedUnitId) : undefined;
    return buildSelectionSummary({
      primaryName: primary?.name ?? hero.name,
      commandableUnits,
    });
  }

  private selectionSummaryHtml(summary: SelectionSummary): string {
    return `<div title="${summary.detail}" style="height:18px;margin-bottom:3px;border:1px solid #4b6a37;border-radius:3px;background:#13200f;color:#9cff74;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 5px;box-sizing:border-box;">
      <b style="font-size:10px;white-space:nowrap;">${summary.title}</b>
      <span style="font-size:9px;color:#cfe8bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${summary.detail}</span>
    </div>`;
  }

  private renderTopbar(world: World, hero: Unit | undefined): void {
    const t = world.time;
    const sign = t < 0 ? '-' : '';
    const mm = Math.floor(Math.abs(t) / 60);
    const ss = Math.floor(Math.abs(t) % 60).toString().padStart(2, '0');
    const gold = hero?.heroMeta?.gold ?? 0;
    let dawnKills = 0;
    let nightKills = 0;
    for (const u of world.units.values()) {
      if (!u.isHero() || !u.heroMeta) continue;
      if (u.team === 0) dawnKills += u.heroMeta.kills;
      else if (u.team === 1) nightKills += u.heroMeta.kills;
    }
    // 神符刷新倒计时(经典 0:00 起每 RUNE_INTERVAL 刷新;纯算,无需 sim 暴露)
    const nextRune = t < 0 ? 0 : (Math.floor(t / RUNE_INTERVAL) + 1) * RUNE_INTERVAL;
    const rLeft = Math.max(0, Math.ceil(nextRune - t));
    const rune = `${Math.floor(rLeft / 60)}:${(rLeft % 60).toString().padStart(2, '0')}`;
    // 守护符文(Glyph)冷却指示(按 G 强化己方建筑;读 world.glyphReadyAt[队])
    const gReadyAt = hero ? (world.glyphReadyAt?.[hero.team] ?? 0) : 0;
    const gLeft = Math.max(0, Math.ceil(gReadyAt - t));
    const glyph = gLeft <= 0 ? '就绪' : `${Math.floor(gLeft / 60)}:${(gLeft % 60).toString().padStart(2, '0')}`;
    // 深渊领主(Boss/Roshan)重生计时:最受争夺的目标计时(读 world.bossId/bossRespawnAt)
    const bossActive = world.bossId !== 0 || world.bossRespawnAt !== Infinity;
    const bossAlive = !!world.getUnit(world.bossId)?.alive;
    const bLeft = Math.max(0, Math.ceil(world.bossRespawnAt - t));
    const bossTxt = bossAlive ? '在世' : world.bossRespawnAt === Infinity ? '?' : `${Math.floor(bLeft / 60)}:${(bLeft % 60).toString().padStart(2, '0')}`;
    this.topbar.innerHTML =
      `<span style="color:#8fd17a;font-weight:700">${dawnKills}</span>` +
      `<span style="color:#8a9">晨曦</span>` +
      `<span>${world.isNight ? '夜晚' : '白昼'}</span>` +
      `<span style="color:#cfd8a0">${sign}${mm}:${ss}</span>` +
      `<span title="下一波神符刷新" style="color:#5fd0d0">⟳${rune}</span>` +
      `<span title="守护符文 G(强化己方建筑)" style="color:${gLeft <= 0 ? '#8fd17a' : '#9a9277'}">🛡${glyph}</span>` +
      (bossActive ? `<span title="深渊领主(Boss)重生计时" style="color:${bossAlive ? '#8fd17a' : '#d9a44a'}">☠${bossTxt}</span>` : '') +
      `<span style="color:#ffd54f">${gold}</span>` +
      `<span style="color:#a89">永夜</span>` +
      `<span style="color:#ef9a9a;font-weight:700">${nightKills}</span>`;
  }

  /** 死亡回放:显示最后击杀来源(被谁击杀)。 */
  private deathRecap(world: World, hero: Unit): string {
    const killer = hero.lastAttackerId ? world.getUnit(hero.lastAttackerId) : undefined;
    if (!killer) return '';
    const who = killer.isHero() ? killer.name
      : killer.kind === 'tower' ? '防御塔'
      : killer.kind === 'building' ? '建筑'
      : killer.kind === 'boss' ? '深渊领主'
      : killer.kind === 'neutral' ? '野怪' : '小兵';
    const color = killer.isHero() ? (killer.heroDef?.color ?? '#ef5350') : '#b0a890';
    return `<div style="font-size:11px;color:#9a9277;margin-bottom:2px">被 <span style="color:${color};font-weight:700">${who}</span> 击杀</div>`;
  }

  /** 死亡时买活行:可买活则显示按钮(费用),冷却中显示倒计时,金不足显示所需。 */
  private buybackRow(world: World, hero: Unit): string {
    const cost = buybackCost(hero.level);
    const cd = Math.ceil((hero.heroMeta?.buybackCooldownUntil ?? 0) - world.time);
    if (cd > 0) return `<div style="font-size:11px;color:#9a9277">买活冷却 ${cd}s</div>`;
    if (canBuyback(world, hero)) {
      return `<div data-buyback="1" title="立即复活(B)" style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid #6fcf5a;border-radius:3px;background:#6fcf5a22;color:#9fe87a;font-size:12px;font-weight:700;cursor:pointer">买活 (B) · ${cost}金</div>`;
    }
    return `<div style="font-size:11px;color:#a8895a">买活需 ${cost}金(余 ${hero.heroMeta?.gold ?? 0})</div>`;
  }

  /** buff/debuff 状态栏:活跃定时 modifier 按状态分类着色 + 剩余秒数(战斗可读性)。 */
  private buffBar(world: World, hero: Unit): string {
    // 状态分类/标签与选中信息卡共用 statusChips(DRY)
    const chips = statusChips(world, hero, world.time, 10);
    if (!chips.length) return '';
    const html = chips.map((c) =>
      `<span title="${c.key}" style="display:inline-flex;align-items:center;height:15px;padding:0 3px;border:1px solid ${c.color};border-radius:2px;background:${c.color}22;color:${c.color};font-size:9px;font-weight:700">${c.tag}${statusChipTime(c.remaining)}</span>`,
    ).join('');
    return `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;max-width:100%">${html}</div>`;
  }

  private meter(value: number, max: number, top: string, bottom: string, label = ''): string {
    const safeMax = Math.max(1, max);
    const frac = Math.max(0, Math.min(1, value / safeMax));
    // 加高加粗(血/蓝是第一信息),数值带阴影更易读;label 在左端标注 生命/法力
    return `<div style="background:#070807;border:1px solid #2a3220;height:21px;margin:3px 0;position:relative;border-radius:3px;overflow:hidden">
      <div style="background:linear-gradient(${top},${bottom});height:100%;width:${frac * 100}%"></div>
      ${label ? `<span style="position:absolute;left:5px;top:0;line-height:21px;font-size:11px;color:#fff;opacity:.85;text-shadow:0 1px 2px #000">${label}</span>` : ''}
      <span style="position:absolute;inset:0;text-align:center;font-size:12px;font-weight:700;line-height:21px;color:#fff;text-shadow:0 1px 2px #000">${Math.ceil(value)} / ${Math.round(max)}</span>
    </div>`;
  }

  private xpBar(model: HeroXpHudModel): string {
    return `<div title="${model.detail}" style="height:8px;margin:2px 0 3px;border:1px solid #4b3f1f;border-radius:2px;background:#080906;position:relative;overflow:hidden;">
      <div style="height:100%;width:${model.percent}%;background:linear-gradient(90deg,#b88a1d,#ffd76a);box-shadow:0 0 6px #d9b44a66;"></div>
      <span style="position:absolute;right:3px;top:-1px;line-height:8px;font-size:8px;color:#1a1405;font-weight:800;text-shadow:0 1px 1px #ffd76a99;">${model.label}</span>
    </div>`;
  }

  private abilitySlot(world: World, hero: Unit, i: number, ux?: UxFeedback): string {
    const def = hero.heroDef?.abilities[i];
    const inst = hero.abilities[i];
    if (!def || !inst) return '';
    const lvl = inst.level;
    const onCd = world.time < inst.cooldownUntil;
    const cdLeft = Math.ceil(inst.cooldownUntil - world.time);
    const manaIdx = Math.max(0, lvl - 1);
    const cdTotal = def.cooldown?.[manaIdx] ?? 0;
    const cdFrac = cdTotal > 0 ? Math.max(0, Math.min(1, (inst.cooldownUntil - world.time) / cdTotal)) : 1;
    const mana = def.manaCost?.[manaIdx] ?? 0;
    const passive = def.targetMode === 'passive';
    const learnable = canLearn(hero, i);
    const ready = abilityReady(world, hero, i);
    const family = fxStyle(def.key || def.name);
    // 阿哈利姆神杖:持杖且该技能有升级时,洋红高亮 + ✦ 徽标
    const aghs = !!(def.scepter || def.scepterPassive);
    const scepterOn = aghs && hasScepter(hero);
    const border = scepterOn ? '#d56bff' : learnable ? '#ffd54f' : lvl > 0 ? (ready || passive ? '#7fae4a' : '#5a6a3a') : '#2c3520';
    const bg = lvl > 0 ? (ready || passive ? '#2a3a18' : '#1d2412') : '#0d100a';
    const flash = ux?.hudFlashFor(`ability-${i}`, world.time);
    const flashShadow = flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' : '';
    const pips = Array.from({ length: def.maxLevel }, (_, k) =>
      `<span style="width:6px;height:4px;border-radius:1px;background:${k < lvl ? '#ffd54f' : '#3a4428'}"></span>`).join('');
    const aghsDesc = aghs && def.scepter?.desc ? `\n${def.scepter.desc}` : aghs ? '\n神杖:增强升级' : '';
    return `<div ${learnable ? `data-learn="${i}" ` : ''}title="${def.name}${def.ultimate ? ' (Ultimate)' : ''}${learnable ? ' — 点击学习' : ''}: ${def.description}${aghsDesc}"
      style="position:relative;width:66px;height:66px;border:1.5px solid ${border};border-radius:4px;background:${bg};${learnable ? 'cursor:pointer;' : ''}
      display:flex;flex-direction:column;align-items:center;justify-content:center;${flashShadow}${lvl === 0 && !learnable ? 'opacity:.55;' : ''}">
      <span style="position:absolute;top:0;left:0;right:0;height:3px;border-radius:4px 4px 0 0;background:${family.color};box-shadow:0 0 6px ${family.glow}"></span>
      <span style="position:absolute;top:2px;left:4px;font-size:10px;color:#cfd8a0;font-weight:700">${HOTKEYS[i]}</span>
      ${passive ? '<span style="position:absolute;top:2px;right:4px;font-size:8px;color:#9ab">P</span>' : ''}
      ${scepterOn ? '<span style="position:absolute;bottom:2px;left:4px;font-size:10px;color:#d56bff;font-weight:800;text-shadow:0 0 5px #d56bff">✦</span>' : ''}
      <div style="opacity:${lvl > 0 || learnable ? 1 : 0.45}">${abilityIconSvg(def)}</div>
      <div style="display:flex;gap:2px;margin-top:5px">${pips}</div>
      ${mana > 0 && lvl > 0 ? `<span style="position:absolute;bottom:2px;right:4px;font-size:9px;color:#5aa2ff">${mana}</span>` : ''}
      ${onCd ? `<span style="position:absolute;inset:0;border-radius:4px;background:conic-gradient(rgba(0,0,0,0.66) ${(cdFrac * 360).toFixed(0)}deg, rgba(0,0,0,0.12) 0);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000">${cdLeft}</span>` : ''}
      ${learnable ? `<span data-learn="${i}" style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);background:#ffd54f;color:#1a1a0a;font-size:12px;font-weight:800;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 8px #ffd54f">+</span>` : ''}
    </div>`;
  }

  private statBonusSlot(hero: Unit): string {
    if (!canLearnStatBonus(hero)) return '';
    return `<div data-learnstat="1" title="属性加点"
      style="width:42px;height:66px;border:1.5px solid #ffd54f;border-radius:4px;background:#2a3a18;cursor:pointer;
      display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#ffd54f;box-shadow:0 0 6px #ffd54f66">
      <span style="font-size:18px;font-weight:800;line-height:1">+</span><span>加点</span>
    </div>`;
  }

  /** 物品程序化图标:按类别绘制 SVG 符号(药瓶/宝石/剑/盾/法球/合成星)。 */
  private itemIcon(category: string): string {
    const M: Record<string, { c: string; p: string }> = {
      consumable: { c: '#6fcf5a', p: '<path d="M10 3 H14 M11 3 V8 L7 19 H17 L13 8 V3"/>' },
      attribute: { c: '#c9b07a', p: '<path d="M12 4 L19 9 L12 20 L5 9 Z"/>' },
      weapon: { c: '#e0673a', p: '<path d="M12 3 V14 M8 14 H16 M11 14 V20 H13 V14"/>' },
      armor: { c: '#6aa0d0', p: '<path d="M12 3 L19 6 V12 C19 17 12 21 12 21 C12 21 5 17 5 12 V6 Z"/>' },
      arcane: { c: '#b06bff', p: '<circle cx="12" cy="12" r="6"/>' },
      combined: { c: '#ffd54f', p: '<path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z"/>' },
    };
    const m = M[category] ?? M.combined;
    return `<svg viewBox="0 0 24 24" width="26" height="26" style="display:block"><g stroke="${m.c}" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round">${m.p}</g></svg>`;
  }

  private itemSlot(world: World, inst: ItemInstance | null, i: number, ux?: UxFeedback): string {
    const flash = ux?.hudFlashFor(`item-${i}`, world.time);
    const isTp = i === 6; // 专属回城卷轴槽(第 7 格),热键 T
    const label = isTp ? 'T' : String(i + 1);
    const emptyBorder = isTp ? '#3a4a6a' : '#2c3520'; // TP 槽空时偏蓝,区分普通格
    const flashShadow =
      flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' :
      flash?.kind === 'confirm' ? 'box-shadow:0 0 0 2px #d9b44a inset,0 0 10px #d9b44a;' :
      '';
    if (!inst) {
      return `<div title="${isTp ? '回城卷轴槽(按 T 使用)' : ''}" style="position:relative;width:64px;height:64px;border:1px solid ${flash?.kind === 'reject' ? '#ff3040' : emptyBorder};border-radius:4px;background:#0d100a;${flashShadow}
        font-size:10px;color:#555;display:flex;align-items:center;justify-content:center">
        <span style="position:absolute;top:2px;left:4px;color:${isTp ? '#6f8fbf' : '#777'}">${label}</span>
        ${isTp ? '<span style="font-size:9px;color:#3a4a6a">TP</span>' : ''}
      </div>`;
    }
    const def = itemDef(inst.itemKey);
    const onCd = world.time < inst.cooldownUntil;
    const itemCdTotal = def.active?.cooldown ?? 0;
    const itemCdFrac = itemCdTotal > 0 ? Math.max(0, Math.min(1, (inst.cooldownUntil - world.time) / itemCdTotal)) : 1;
    const border = flash?.kind === 'reject' ? '#ff3040' : flash?.kind === 'confirm' ? '#d9b44a' : '#5a6a3a';
    const canBag = i < 6; // 主物品栏可点击移入背包栏(TP 槽除外)
    const tip = canBag ? `${def.name}: ${def.description}(左键移入背包栏 · 右键出售)` : `${def.name}: ${def.description}`;
    return `<div ${canBag ? `data-bag="${i}" ` : ''}title="${tip}" style="position:relative;width:64px;height:64px;border:1px solid ${border};border-radius:4px;
      background:${onCd ? '#1a1a1a' : '#222b18'};font-size:11px;color:#cfd8a0;display:flex;flex-direction:column;cursor:${canBag ? 'pointer' : 'default'};
      align-items:center;justify-content:center;overflow:hidden;${onCd ? 'opacity:.5;' : ''}${flashShadow}">
      <span style="position:absolute;top:2px;left:4px;color:#d9b44a">${label}</span>
      ${this.itemIcon(def.category)}
      ${inst.charges > 0 ? `<span style="position:absolute;bottom:1px;right:3px;font-size:10px;color:#ffd54f;font-weight:700">${inst.charges}</span>` : ''}
      ${onCd ? `<span style="position:absolute;inset:0;border-radius:4px;background:conic-gradient(rgba(0,0,0,0.66) ${(itemCdFrac * 360).toFixed(0)}deg, rgba(0,0,0,0.12) 0);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000">${Math.ceil(inst.cooldownUntil - world.time)}</span>` : ''}
    </div>`;
  }

  /** 背包栏槽(后备栏,不提供加成;点击物品移入主物品栏,移入后 6 秒就绪)。 */
  private backpackSlot(inst: ItemInstance | null, j: number): string {
    if (!inst) {
      return `<div title="背包栏(随身·不提供加成)" style="width:44px;height:44px;border:1px dashed #3a3320;border-radius:3px;background:#0c0e08;"></div>`;
    }
    const def = itemDef(inst.itemKey);
    return `<div data-bagout="${j}" title="${def.name}(背包栏·无加成 — 点击移入物品栏,移入后 6 秒就绪)" style="position:relative;width:44px;height:44px;border:1px solid #6a5a3a;border-radius:3px;background:#1c1a12;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.78;">
      ${this.itemIcon(def.category)}
      ${inst.charges > 0 ? `<span style="position:absolute;bottom:0;right:2px;font-size:9px;color:#caa84a;font-weight:700">${inst.charges}</span>` : ''}
    </div>`;
  }
}
