import type { World } from '../sim/world';
import type { Unit } from '../sim/unit';
import type { AbilityDef } from '../data/heroes/types';
import type { ItemInstance } from '../sim/items';
import { heroAttributes, canBuyback } from '../sim/hero';
import { buybackCost, FOUNTAIN_AURA_RADIUS, FOUNTAIN_STATS, RUNE_INTERVAL, UPHILL_MISS_CHANCE } from '../data/balance';
import { canLearn, canLearnStatBonus, abilityReady, abilityManaCost, hasScepter, hasShard } from '../sim/abilities';
import { itemDef } from '../data/items';
import type { UxFeedback } from './uxFeedback';
import { fxStyle } from '../render/fxStyle';
import {
  buildDisableBarModel,
  buildModifierIconTokens,
  modifierTokenTime,
  type DisableBarModel,
  type ModifierIconToken,
} from './modifierDisplayModel';
import { abilityIconSvg } from './abilityIconSvg';
import { DEFAULT_CONTROL_SETTINGS, abilityKeyLabels, hudScaleValue, type ChatWheelPreset, type ControlSettings } from '../engine/controlSettings';
import { isCommandableByPlayer } from '../engine/selection';
import { commandCardActionFromValue, type CommandCardAction } from '../engine/commandCardActions';
import { buildCommandCard, buildSelectionSummary, type CommandCardButton, type SelectionSummary } from './commandCard';
import { buildCourierHudModel, type CourierHudModel } from './courierHudModel';
import {
  buildCourierControlModel,
  type CourierControlAction,
  type CourierControlModel,
} from './courierControlModel';
import { buildHeroXpHudModel, type HeroXpHudModel } from './heroXpHudModel';
import { buildDeathAssistSummary, type DeathAssistSource, type DeathRecapEntry, type ControlInstance, type ControlKind } from './deathRecapModel';
import { buildEnemyHeroBar } from './enemyHeroBarModel';
import { isVisibleTo } from '../sim/vision';
import type { QuickbuyModel } from './quickbuyModel';
import { buildAbilitySlotTitle } from './abilityTooltipModel';
import { buildCooldownOverlayModel, type CooldownOverlayModel } from './cooldownOverlayModel';
import { buildAbilitySlotBadges, type AbilitySlotBadge, type AbilitySlotBadgeTone } from './abilitySlotBadgeModel';
import { buildGameSpeedHudModel, type GameSpeedHudModel } from './gameSpeedHudModel';
import { abilityStatusBroadcastLabel, itemStatusBroadcastLabel } from './statusBroadcastModel';
import {
  bossStatusBroadcastLabel,
  buybackStatusBroadcastLabel,
  gameClockBroadcastLabel,
  glyphStatusBroadcastLabel,
  resourceStatusBroadcastLabel,
  runeStatusBroadcastLabel,
} from './tacticalStatusBroadcastModel';
import { buildChatWheelModel, chatWheelBroadcastLabel, type ChatWheelCall } from './chatWheelModel';
import { hudAccessibilityPalette } from './accessibilityPalette';
import {
  buildBackpackItemSlotTitle,
  buildEmptyBackpackSlotTitle,
  buildEmptyItemSlotTitle,
  buildItemSlotTitle,
} from './itemTooltipModel';
import { buildCombatCommandHintModel, type CombatCommandHintModel } from './combatCommandHintModel';
import { buildFountainStatusModel, type FountainStatusModel } from './fountainStatusModel';
import {
  buildItemLogisticsModel,
  type CourierLogisticsInput,
  type ItemLogisticsItemInput,
  type ItemLogisticsModel,
  type ItemSlotLogisticsModel,
} from './itemLogisticsModel';
import {
  buildMapMechanicsModel,
  type MapMechanicsChip,
  type MapMechanicsModel,
  type MapMechanicsRadarEntry,
} from './mapMechanicsModel';
import { buildOrbPriorityModel, type OrbPriorityEntry, type OrbPriorityModel } from './orbPriorityModel';
import { buildTutorialCoachModel, type TutorialCoachModel } from './tutorialCoachModel';
import type { ThreatEdge, ThreatEdgeIndicator } from './threatDirectionModel';
import type { SpectatorTimelineEntry } from './spectatorTimelineModel';
import type { SpectatorControlAction, SpectatorControlActionId, SpectatorControlsModel } from './spectatorControlsModel';
import type { TeamCommunicationEntry } from './teamCommunicationLogModel';

const DEFAULT_ABILITY_HOTKEYS = ['Q', 'W', 'E', 'R'];

export class Hud {
  root: HTMLElement;
  private topbar: HTMLElement;
  private heroBar: HTMLElement;
  private mapMechanicsRadar: HTMLElement;
  private tutorialCoach: HTMLElement;
  private chatWheel: HTMLElement;
  private teamCommunicationLog: HTMLElement;
  private spectatorTimeline: HTMLElement;
  private combatFeed: HTMLElement;
  private threatEdges: HTMLElement;
  private bottom: HTMLElement;
  /** 低血危险暗角:血量越低红光越强,临界脉动(DotA-like 危险反馈)。 */
  private vignette: HTMLElement;
  onLearn?: (index: number) => void;
  onLearnStat?: () => void;
  onBuyback?: () => void;
  onSell?: (invSlot: number) => void;
  onMoveToBackpack?: (invSlot: number) => void;
  onMoveFromBackpack?: (bpSlot: number) => void;
  /** 死亡回顾:致命前 ~10s 的伤害来源拆解(由 main 每帧在死亡时填入)。 */
  deathRecapEntries: DeathRecapEntry[] = [];
  /** 死亡回顾:致命前 ~10s 的控制时间线(眩晕/缠绕/沉默…按顺序)。 */
  deathControlEntries: ControlInstance[] = [];
  /** 死亡回顾:致命前总锁定时长(秒,区间并集)。 */
  deathControlLockdown = 0;
  /** 死亡回顾:击杀事件里的协助英雄,用于呈现 Dota 式参战来源。 */
  deathAssistSources: DeathAssistSource[] = [];
  /** 实时受伤来源(战斗中显示在屏幕侧边:谁正在打你、打了多少)。由 main 在近期受击时填入。 */
  incomingDamage: DeathRecapEntry[] = [];
  /** 方向性受击边缘提示:从 ThreatDirectionLog 派生,仅展示不改 sim。 */
  threatIndicators: ThreatEdgeIndicator[] = [];
  /** Quickbuy 目标提醒(由 main 每帧从 ShopPanel 填入;离店仍在顶栏可见)。 */
  quickbuy: QuickbuyModel | null = null;
  /** 观战/调试事件时间线。仅 main 在 spectate/debug 模式填入。 */
  spectatorTimelineEntries: SpectatorTimelineEntry[] = [];
  spectatorJumpHistoryEntries: SpectatorTimelineEntry[] = [];
  spectatorControls: SpectatorControlsModel = { visible: false, summary: '', actions: [] };
  /** 本地队伍沟通日志:Alt-click 状态广播 / 聊天轮盘短时间留痕。 */
  teamCommunicationEntries: TeamCommunicationEntry[] = [];
  private chatWheelOpen = false;
  private chatWheelPreset: ChatWheelPreset = DEFAULT_CONTROL_SETTINGS.chatWheelPreset;
  private chatWheelCustomLabels = DEFAULT_CONTROL_SETTINGS.chatWheelCustomLabels;
  /** 点击顶栏英雄 chip → 镜头跳到该英雄(main 注入,内部做视野/雾门控)。 */
  onCenterUnit?: (id: number) => void;
  onCommandCard?: (action: CommandCardAction) => void;
  onStatusBroadcast?: (label: string) => void;
  onCourierDeliver?: () => void;
  onToggleAbility?: (index: number) => void;
  onDeathRecapContext?: (groupKey: string) => void;
  onSpectatorTimelineFocus?: (entryId: string) => void;
  onSpectatorControl?: (action: SpectatorControlActionId) => void;

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
      'pointer-events:auto;',
    ].join('');
    this.root.appendChild(this.topbar);
    this.topbar.addEventListener('mousedown', (e) => {
      const el = (e.target as HTMLElement).closest('[data-status-broadcast]') as HTMLElement | null;
      if (!el || !e.altKey) return;
      e.preventDefault();
      this.onStatusBroadcast?.(el.getAttribute('data-status-broadcast') ?? '');
    });

    // 双方英雄顶栏:友军(左)+ 敌方(右),DotA 式常驻总览。等级/复活公开;敌方血蓝仅视野内显示。置于顶栏正下方居中。
    this.heroBar = document.createElement('div');
    this.heroBar.style.cssText = [
      'position:absolute;top:32px;left:50%;transform:translateX(-50%);',
      'display:flex;gap:10px;align-items:flex-start;',
    ].join('');
    this.root.appendChild(this.heroBar);

    this.mapMechanicsRadar = document.createElement('div');
    this.mapMechanicsRadar.style.cssText = [
      'position:absolute;top:74px;left:50%;transform:translateX(-50%);',
      'display:none;align-items:center;gap:5px;pointer-events:auto;',
      'max-width:min(760px,calc(100vw - 300px));overflow:hidden;',
      'background:#070a06d8;border:1px solid #34402a;border-radius:4px;padding:4px 6px;',
      'box-shadow:0 6px 18px rgba(0,0,0,.28);',
    ].join('');
    this.root.appendChild(this.mapMechanicsRadar);

    this.tutorialCoach = document.createElement('div');
    this.tutorialCoach.style.cssText = [
      'position:absolute;right:12px;bottom:184px;width:274px;',
      'pointer-events:none;display:none;flex-direction:column;gap:3px;',
      'background:#070a06dc;border:1px solid #34402a;border-radius:4px;padding:6px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.34);',
    ].join('');
    this.root.appendChild(this.tutorialCoach);

    this.chatWheel = document.createElement('div');
    this.chatWheel.style.cssText = [
      'position:absolute;top:48px;left:12px;',
      'pointer-events:auto;display:flex;flex-direction:column;gap:4px;align-items:flex-start;',
    ].join('');
    this.root.appendChild(this.chatWheel);
    this.chatWheel.addEventListener('mousedown', (e) => {
      const el = (e.target as HTMLElement).closest('[data-chat-wheel-toggle],[data-chat-wheel-call]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      if (el.hasAttribute('data-chat-wheel-toggle')) {
        this.chatWheelOpen = !this.chatWheelOpen;
        this.renderChatWheel();
        return;
      }
      const label = el.getAttribute('data-chat-wheel-call');
      if (label) this.onStatusBroadcast?.(label);
      this.chatWheelOpen = false;
      this.renderChatWheel();
    });

    this.teamCommunicationLog = document.createElement('div');
    this.teamCommunicationLog.style.cssText = [
      'position:absolute;top:88px;left:12px;width:230px;max-height:118px;',
      'pointer-events:none;display:none;flex-direction:column;gap:3px;',
      'background:#070a06d6;border:1px solid #2f3b29;border-radius:4px;padding:5px;',
      'box-shadow:0 6px 18px rgba(0,0,0,.28);overflow:hidden;',
    ].join('');
    this.root.appendChild(this.teamCommunicationLog);

    this.spectatorTimeline = document.createElement('div');
    this.spectatorTimeline.style.cssText = [
      'position:absolute;top:218px;left:12px;width:230px;max-height:30vh;',
      'pointer-events:auto;display:none;flex-direction:column;gap:3px;',
      'background:#080a07d8;border:1px solid #3a4428;border-radius:4px;padding:5px;',
      'box-shadow:0 6px 18px rgba(0,0,0,.35);overflow:hidden;',
    ].join('');
    this.root.appendChild(this.spectatorTimeline);
    this.spectatorTimeline.addEventListener('mousedown', (e) => {
      const el = (e.target as HTMLElement).closest('[data-spectator-timeline-id],[data-spectator-control]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const action = el.getAttribute('data-spectator-control') as SpectatorControlActionId | null;
      if (action) {
        this.onSpectatorControl?.(action);
        return;
      }
      this.onSpectatorTimelineFocus?.(el.getAttribute('data-spectator-timeline-id') ?? '');
    });

    // 实时受伤来源提示:战斗中显示在屏幕左侧(谁正在打你 + 伤害量),便于即时判断威胁/撤退。
    this.combatFeed = document.createElement('div');
    this.combatFeed.style.cssText = [
      'position:absolute;left:12px;top:40%;transform:translateY(-50%);',
      'display:flex;flex-direction:column;gap:3px;pointer-events:none;min-width:120px;',
    ].join('');
    this.root.appendChild(this.combatFeed);

    this.threatEdges = document.createElement('div');
    this.threatEdges.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.root.appendChild(this.threatEdges);

    // 点击英雄 chip → 居中镜头(mousedown:HUD 每帧重建,click 会跨重建丢失)。chip 自带 pointer-events:auto。
    this.heroBar.addEventListener('mousedown', (e) => {
      const el = (e.target as HTMLElement).closest('[data-hero-id]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      const statusLabel = el.getAttribute('data-status-broadcast');
      if (e.altKey && statusLabel) {
        this.onStatusBroadcast?.(statusLabel);
        return;
      }
      this.onCenterUnit?.(Number(el.getAttribute('data-hero-id')));
    });

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
      const el = (e.target as HTMLElement).closest('[data-courier-action],[data-command-card],[data-ability-toggle],[data-death-recap-context],[data-learn],[data-learnstat],[data-buyback],[data-bag],[data-bagout],[data-status-broadcast]') as HTMLElement | null;
      if (!el) return;
      e.preventDefault();
      const deathContext = el.getAttribute('data-death-recap-context');
      if (deathContext) {
        this.onDeathRecapContext?.(deathContext);
        return;
      }
      const courierAction = el.getAttribute('data-courier-action');
      if (courierAction === 'deliver') {
        this.onCourierDeliver?.();
        return;
      }
      if (courierAction === 'select') {
        this.onCommandCard?.('selectCourier');
        return;
      }
      const statusLabel = el.getAttribute('data-status-broadcast');
      if (e.altKey && statusLabel) {
        this.onStatusBroadcast?.(statusLabel);
        return;
      }
      // 右键库存物品 → 出售(经 shop.sellSlot 校验商店范围 + toast,天然防误卖)
      if (e.button === 2 && el.hasAttribute('data-bag')) { this.onSell?.(Number(el.getAttribute('data-bag'))); return; }
      if (e.button === 2 && el.hasAttribute('data-ability-toggle')) {
        this.onToggleAbility?.(Number(el.getAttribute('data-ability-toggle')));
        return;
      }
      if (e.button === 2) return; // 其他槽位右键不处理
      const commandAction = commandCardActionFromValue(el.getAttribute('data-command-card'));
      if (commandAction) this.onCommandCard?.(commandAction);
      else if (el.hasAttribute('data-buyback')) this.onBuyback?.();
      else if (el.hasAttribute('data-learnstat')) this.onLearnStat?.();
      else if (el.hasAttribute('data-bag')) this.onMoveToBackpack?.(Number(el.getAttribute('data-bag')));
      else if (el.hasAttribute('data-bagout')) this.onMoveFromBackpack?.(Number(el.getAttribute('data-bagout')));
      else if (el.hasAttribute('data-learn')) this.onLearn?.(Number(el.getAttribute('data-learn')));
    });
  }

  toggleChatWheel(): void {
    this.chatWheelOpen = !this.chatWheelOpen;
    this.renderChatWheel();
  }

  update(
    world: World,
    hero: Unit | undefined,
    ux?: UxFeedback,
    controlSettings: ControlSettings = DEFAULT_CONTROL_SETTINGS,
    loopState: { speed?: number; paused?: boolean } = {},
  ): void {
    // HUD 缩放(可访问性):底部英雄面板按设置缩放,锚定底部中央(点击命中随 transform 一同缩放)
    const scale = hudScaleValue(controlSettings.hudScale);
    const palette = hudAccessibilityPalette(controlSettings.accessibilityMode);
    this.chatWheelPreset = controlSettings.chatWheelPreset;
    this.chatWheelCustomLabels = controlSettings.chatWheelCustomLabels;
    this.bottom.style.transformOrigin = 'bottom center';
    this.bottom.style.transform = `translateX(-50%) scale(${scale})`;
    this.renderChatWheel();
    this.renderTeamCommunicationLog();
    this.renderSpectatorTimeline();
    const mapMechanics = hero ? this.mapMechanics(world, hero) : undefined;
    this.renderTopbar(world, hero, buildGameSpeedHudModel({ speed: loopState.speed ?? 1, paused: loopState.paused ?? false }));
    this.renderHeroBars(world, hero, ux?.altInfo ?? false);
    this.renderMapMechanicsRadar(mapMechanics);
    this.renderCombatFeed();
    this.renderThreatEdges();
    if (!hero) {
      this.bottom.innerHTML = '';
      this.mapMechanicsRadar.style.display = 'none';
      this.renderTutorialCoach(undefined);
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
      this.vignette.style.boxShadow = `inset 0 0 160px 40px ${palette.dangerVignette}`;
      this.vignette.style.opacity = String(Math.min(0.6, danger * 0.62 * pulse).toFixed(3));
    } else if (this.vignette.style.opacity !== '0') {
      this.vignette.style.opacity = '0';
    }
    const xpModel = buildHeroXpHudModel({ level: hero.level, xp: meta.xp });
    const commandHtml = this.commandCard(world, hero, ux, controlSettings);
    const selectionSummary = this.selectionSummary(world, hero, ux, controlSettings);
    const combatCommandHint = this.combatCommandHint(world, hero, ux, controlSettings);
    const fountainStatus = this.fountainStatus(world, hero);
    const courierSummary = this.courierSummary(world, hero, ux);
    const courierControls = buildCourierControlModel({
      status: courierSummary.status,
      primaryAction: courierSummary.primaryAction,
      selected: courierSummary.selected,
      stashItems: hero.stash.filter((item) => item !== null).length,
      tone: courierSummary.tone,
      hpPercent: courierSummary.hpPercent,
    });
    const itemLogistics = this.itemLogistics(world, hero);
    this.renderTutorialCoach(buildTutorialCoachModel({
      heroAlive: hero.alive,
      map: mapMechanics,
      itemPrimaryAction: itemLogistics.primaryAction,
      backpackDelayDetail: itemLogistics.backpackDelayDetail,
      quickbuy: this.quickbuy,
    }));
    const slotLogistics = (lane: ItemSlotLogisticsModel['lane'], index: number) =>
      itemLogistics.slots.find((slot) => slot.lane === lane && slot.index === index);
    const orbPriority = buildOrbPriorityModel(hero.heroDef?.abilities ?? [], hero.abilities);
    const orbPriorityBySlot = new Map(orbPriority.entries.map((entry) => [entry.slot, entry]));
    const abilityHotkeys = abilityKeyLabels(controlSettings);
    const abilityHtml = (hero.heroDef?.abilities ?? []).map((_, i) =>
      this.abilitySlot(world, hero, i, ux, orbPriorityBySlot.get(i), abilityHotkeys[i] ?? DEFAULT_ABILITY_HOTKEYS[i] ?? '?'),
    ).join('');
    const itemHtml = hero.inventory.map((inst, i) => this.itemSlot(world, hero, inst, i, ux, slotLogistics('inventory', i))).join('');
    const tpHtml = this.itemSlot(world, hero, hero.tpSlot, 6, ux, slotLogistics('tp', 0)); // 专属回城卷轴槽
    const bagHtml = hero.backpack.map((inst, j) => this.backpackSlot(inst, j, slotLogistics('backpack', j))).join(''); // 背包栏(3 格)

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
            ${dead ? `<div style="color:#ef5350;font-size:14px;padding:6px 0 3px">阵亡 - ${respawnIn}s</div>${this.deathRecap(world, hero)}${this.buybackRow(world, hero)}` : `${this.meter(hero.hp, hero.calc.maxHp, palette.health.fg, palette.health.bg, '生命', resourceStatusBroadcastLabel({ hp: hero.hp, maxHp: hero.calc.maxHp, mp: hero.mp, maxMp: hero.calc.maxMp }))}${this.meter(hero.mp, hero.calc.maxMp, palette.mana.fg, palette.mana.bg, '法力', resourceStatusBroadcastLabel({ hp: hero.hp, maxHp: hero.calc.maxHp, mp: hero.mp, maxMp: hero.calc.maxMp }))}${this.xpBar(xpModel)}`}
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
            ${dead ? '' : this.modifierBar(world, hero)}
          </div>
        </div>
        <div style="display:grid;grid-template-rows:auto 1fr;gap:6px;min-width:0;align-items:end;">
          <div style="align-self:start;justify-self:center;width:min(246px,100%);">
            ${this.fountainStatusHtml(fountainStatus)}
            ${this.courierStatusHtml(courierSummary)}
            ${this.courierControlHtml(courierControls)}
            ${selectionSummary.visible ? this.selectionSummaryHtml(selectionSummary) : ''}
            ${this.combatCommandHintHtml(combatCommandHint)}
            ${commandHtml}
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:end;gap:3px;min-width:0;">
            ${this.orbPriorityHtml(orbPriority)}
            <div style="display:flex;align-items:end;justify-content:center;gap:5px;min-width:0;">
            ${abilityHtml}
            ${this.statBonusSlot(hero)}
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:stretch;justify-content:end;min-width:0;">
          ${this.itemLogisticsHtml(itemLogistics)}
          <div style="display:flex;gap:6px;align-items:flex-end;justify-content:end;">
            <div style="align-self:flex-end">${tpHtml}</div>
            <div style="display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,64px);gap:5px;align-content:end;justify-content:end;">
              ${itemHtml}
            </div>
            <div title="背包栏" style="display:flex;flex-direction:column;gap:4px;align-self:flex-end;">
              ${bagHtml}
            </div>
          </div>
        </div>
      </div>`;
  }

  private commandCard(world: World, hero: Unit, ux: UxFeedback | undefined, settings: ControlSettings): string {
    const selectedCommandableCount = (ux?.commandableSelectedIds ?? [])
      .map((id) => world.getUnit(id))
      .filter((unit): unit is Unit => !!unit && isCommandableByPlayer(unit, hero.team, hero.id))
      .length;
    const fallbackHeroSelected = (!ux || !ux.selectedUnitId) && hero.alive ? 1 : 0;
    const controlledCommandableCount = [...world.units.values()]
      .filter((unit) => isCommandableByPlayer(unit, hero.team, hero.id))
      .length;
    const courierAlive = [...world.units.values()].some((unit) => unit.kind === 'courier' && unit.team === hero.team && unit.alive);
    const glyphReadyIn = Math.max(0, Math.ceil((world.glyphReadyAt?.[hero.team] ?? 0) - world.time));
    const buttons = buildCommandCard(settings, {
      selectedCommandableCount: selectedCommandableCount || fallbackHeroSelected,
      controlledCommandableCount,
      courierAlive,
      glyphReadyIn,
    });
    return `<div title="Command card" style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;">${buttons.map((button) => this.commandButton(button)).join('')}</div>`;
  }

  private combatCommandHint(world: World, hero: Unit, ux: UxFeedback | undefined, settings: ControlSettings): CombatCommandHintModel {
    const selected = ux?.selectedUnitId ? world.getUnit(ux.selectedUnitId) : undefined;
    const unit = selected && selected.team === hero.team && selected.alive ? selected : hero;
    const target = unit.attackTargetId ? world.getUnit(unit.attackTargetId) : undefined;
    return buildCombatCommandHintModel({
      selectedName: unit.name,
      order: unit.order,
      attackTargetName: target?.name ?? '',
      autoAttack: unit.kind === 'hero' ? unit.autoAttack : settings.autoAttack,
    });
  }

  private courierSummary(world: World, hero: Unit, ux?: UxFeedback): CourierHudModel {
    const couriers = [...world.units.values()].filter((unit) => unit.kind === 'courier' && unit.team === hero.team);
    const courier = couriers.find((unit) => unit.alive) ?? couriers[couriers.length - 1];
    const fountain = [...world.units.values()].find((unit) => unit.kind === 'building' && unit.team === hero.team && unit.buildingKind === 'fountain');
    const atFountain = !!(courier && fountain && this.distSq(courier, fountain) <= 360 * 360);
    const stashItems = hero.stash.filter((item) => item !== null).length;
    const etaSeconds = this.courierEtaSeconds(courier, stashItems > 0 ? hero : fountain);

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
        etaSeconds,
      } : undefined,
    });
  }

  private itemLogistics(world: World, hero: Unit): ItemLogisticsModel {
    const courier = [...world.units.values()].find((unit) => unit.kind === 'courier' && unit.team === hero.team);
    const fountain = [...world.units.values()].find((unit) => unit.kind === 'building' && unit.team === hero.team && unit.buildingKind === 'fountain');
    const stashItems = hero.stash.filter((item) => item !== null).length;
    const courierInput: CourierLogisticsInput | undefined = courier ? {
      alive: courier.alive,
      task: courier.alive ? courierTask(courier.order?.type, stashItems) : 'dead',
      etaSeconds: this.courierEtaSeconds(courier, stashItems > 0 ? hero : fountain),
      cargo: [null, null, null, null, null, null],
    } : undefined;
    const quickbuyKey = this.quickbuy?.itemKey ?? null;
    return buildItemLogisticsModel({
      inventory: hero.inventory.map((item) => this.itemLogisticsInput(item, world.time, true)),
      backpack: hero.backpack.map((item) => this.itemLogisticsInput(item, world.time, false)),
      stash: hero.stash.map((item) => this.itemLogisticsInput(item, world.time, false)),
      tpSlot: this.itemLogisticsInput(hero.tpSlot, world.time, false),
      courier: courierInput,
      quickbuyKey,
      selectedRecipeKey: quickbuyKey,
    });
  }

  private itemLogisticsInput(item: ItemInstance | null, now: number, inventoryLane: boolean): ItemLogisticsItemInput | null {
    if (!item) return null;
    const backpackRemaining = item.backpackReadyUntil === undefined ? 0 : Math.max(0, item.backpackReadyUntil - now);
    return {
      itemKey: item.itemKey,
      charges: item.charges,
      backpackDelayRemaining: inventoryLane ? backpackRemaining : 0,
    };
  }

  private courierEtaSeconds(courier: Unit | undefined, target: Unit | undefined): number | undefined {
    if (!courier || !target || !courier.alive || courier.order?.type !== 'move') return undefined;
    const distance = Math.hypot(courier.pos.x - target.pos.x, courier.pos.y - target.pos.y);
    return courier.calc.moveSpeed > 0 ? distance / courier.calc.moveSpeed : undefined;
  }

  private distSq(a: Unit, b: Unit): number {
    const dx = a.pos.x - b.pos.x;
    const dy = a.pos.y - b.pos.y;
    return dx * dx + dy * dy;
  }

  private fountainStatus(world: World, hero: Unit): FountainStatusModel {
    let alliedDistance = Infinity;
    let enemyDistance = Infinity;
    for (const unit of world.units.values()) {
      if (unit.kind !== 'building' || unit.buildingKind !== 'fountain') continue;
      const d = Math.hypot(hero.pos.x - unit.pos.x, hero.pos.y - unit.pos.y);
      if (unit.team === hero.team) alliedDistance = Math.min(alliedDistance, d);
      else enemyDistance = Math.min(enemyDistance, d);
    }
    return buildFountainStatusModel({
      alive: hero.alive,
      hp: hero.hp,
      maxHp: hero.calc.maxHp,
      mp: hero.mp,
      maxMp: hero.calc.maxMp,
      stashItems: hero.stash.filter((item) => item !== null).length,
      alliedFountainDistance: alliedDistance,
      alliedAuraRadius: FOUNTAIN_AURA_RADIUS,
      enemyFountainDistance: enemyDistance,
      enemyAttackRange: FOUNTAIN_STATS.range,
    });
  }

  private fountainStatusHtml(model: FountainStatusModel): string {
    if (!model.visible) return '';
    const palette: Record<FountainStatusModel['tone'], { border: string; bg: string; fg: string }> = {
      ready: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' },
      busy: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' },
      danger: { border: '#8a3434', bg: '#260d0d', fg: '#ff8f8f' },
      muted: { border: '#3b3d35', bg: '#11130f', fg: '#9a9277' },
    };
    const p = palette[model.tone];
    return `<div data-fountain-status="${model.label}" title="${escapeAttr(`${model.detail} - ${model.actionHint}`)}" style="height:18px;margin-bottom:3px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:5px;padding:0 5px;box-sizing:border-box;">
      <b style="font-size:9px;white-space:nowrap;">${model.label}</b>
      <span style="font-size:9px;color:#cfc7a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${model.detail}</span>
      <span style="font-size:8px;color:${p.fg};white-space:nowrap;">${model.actionHint}</span>
    </div>`;
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
    return `<div data-courier-action="${model.primaryAction}" title="${model.detail} - ${model.actionLabel}" style="height:21px;margin-bottom:3px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:5px;padding:0 5px;box-sizing:border-box;cursor:pointer;${selected}">
      <b style="font-size:9px;letter-spacing:0;white-space:nowrap;">${model.label}</b>
      <span style="font-size:9px;color:#cfc7a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${model.detail}</span>
      <b style="font-size:8px;color:${p.fg};border:1px solid ${p.border};border-radius:2px;background:#0003;padding:0 3px;line-height:13px;white-space:nowrap;">${model.actionLabel}</b>
      <span style="min-width:32px;text-align:right;color:${p.hp};font-size:9px;font-weight:800;">${model.hpPercent}%</span>
    </div>`;
  }

  private courierControlHtml(model: CourierControlModel): string {
    if (!model.visible) return '';
    return `<div data-courier-controls title="${escapeAttr(model.summary)}" style="height:18px;margin-bottom:3px;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;">
      ${model.actions.map((action) => this.courierControlButton(action)).join('')}
    </div>`;
  }

  private courierControlButton(action: CourierControlAction): string {
    const palette: Record<CourierControlAction['tone'], { border: string; bg: string; fg: string }> = {
      ready: { border: '#4b6a37', bg: '#13200f', fg: '#9cff74' },
      active: { border: '#d9b44a', bg: '#251f0c', fg: '#ffe08a' },
      danger: { border: '#8a3434', bg: '#260d0d', fg: '#ff8f8f' },
      disabled: { border: '#34372f', bg: '#11130f', fg: '#777b70' },
    };
    const p = palette[action.tone];
    const dataAction = action.enabled ? `data-courier-action="${action.key}"` : '';
    const pending = action.pendingSimApi ? ' · pending sim' : '';
    return `<button ${dataAction} title="${escapeAttr(`${action.label}: ${action.reason}${pending}`)}" style="min-width:0;height:18px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};font-size:8px;font-weight:800;line-height:14px;padding:0 2px;cursor:${action.enabled ? 'pointer' : 'not-allowed'};opacity:${action.enabled ? 1 : 0.52};overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
      ${action.hotkey}
    </button>`;
  }

  private commandButton(button: CommandCardButton): string {
    const dataCommand = button.enabled ? `data-command-card="${button.action}"` : '';
    return `<div title="${escapeAttr(button.tooltip)}" ${dataCommand} style="height:24px;border:1px solid #425331;border-radius:3px;background:#11180d;color:#d8d0ae;display:grid;grid-template-columns:1fr auto;align-items:center;gap:3px;padding:0 4px;box-sizing:border-box;opacity:${button.enabled ? 1 : 0.45};cursor:${button.enabled ? 'pointer' : 'not-allowed'};">
      <span style="font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${button.label}</span>
      <span style="min-width:20px;text-align:center;border:1px solid #6a5a2a;border-radius:2px;background:#211b0d;color:#ffd76a;font-size:9px;font-weight:800;line-height:14px;">${button.hotkey}</span>
    </div>`;
  }

  private selectionSummary(world: World, hero: Unit, ux: UxFeedback | undefined, settings: ControlSettings): SelectionSummary {
    const commandableUnits = (ux?.commandableSelectedIds ?? [])
      .map((id) => world.getUnit(id))
      .filter((unit): unit is Unit => !!unit && unit.alive);
    const primary = ux?.selectedUnitId ? world.getUnit(ux.selectedUnitId) : undefined;
    return buildSelectionSummary({
      primaryName: primary?.name ?? hero.name,
      cycleHotkey: settings.keyBinds.cycleSubgroup,
      commandableUnits,
    });
  }

  private selectionSummaryHtml(summary: SelectionSummary): string {
    return `<div title="${summary.detail}" style="height:18px;margin-bottom:3px;border:1px solid #4b6a37;border-radius:3px;background:#13200f;color:#9cff74;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 5px;box-sizing:border-box;">
      <b style="font-size:10px;white-space:nowrap;">${summary.title}</b>
      <span style="font-size:9px;color:#cfe8bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${summary.detail}</span>
    </div>`;
  }

  private combatCommandHintHtml(model: CombatCommandHintModel): string {
    if (!model.visible) return '';
    const palette: Record<CombatCommandHintModel['tone'], { border: string; bg: string; fg: string }> = {
      muted: { border: '#3b3d35', bg: '#11130f', fg: '#9a9277' },
      ready: { border: '#4b6a37', bg: '#13200f', fg: '#9cff74' },
      busy: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' },
      danger: { border: '#8a3434', bg: '#260d0d', fg: '#ff8f8f' },
    };
    const p = palette[model.tone];
    return `<div data-combat-command="${model.label}" title="${escapeAttr(`${model.detail} - ${model.actionHint}`)}" style="height:18px;margin-bottom:3px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:5px;padding:0 5px;box-sizing:border-box;">
      <b style="font-size:9px;white-space:nowrap;">${model.label}</b>
      <span style="font-size:9px;color:#cfc7a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${model.detail}</span>
      <span style="font-size:8px;color:${p.fg};white-space:nowrap;">${model.actionHint}</span>
    </div>`;
  }

  private renderTopbar(world: World, hero: Unit | undefined, speed: GameSpeedHudModel): void {
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
    const clockBroadcast = gameClockBroadcastLabel({ time: t, isNight: world.isNight });
    const glyphBroadcast = glyphStatusBroadcastLabel({ readyIn: gLeft });
    const buybackBroadcast = hero ? buybackStatusBroadcastLabel({
      alive: hero.alive,
      gold,
      cost: buybackCost(hero.level),
      cooldownRemaining: (hero.heroMeta?.buybackCooldownUntil ?? 0) - world.time,
    }) : '';
    // 扫描(V 键揭示区域)冷却指示(读 world.scanReadyAt[队])
    const scReadyAt = hero ? (world.scanReadyAt?.[hero.team] ?? 0) : 0;
    const scLeft = Math.max(0, Math.ceil(scReadyAt - t));
    const scan = scLeft <= 0 ? '就绪' : `${Math.floor(scLeft / 60)}:${(scLeft % 60).toString().padStart(2, '0')}`;
    // 前哨归属(◆ 己方绿/敌方红;占领→团队周期经验。读 world.outposts)
    const opMyTeam = hero?.team ?? 0;
    const opMine = world.outposts.filter((o) => o.team === opMyTeam).length;
    const opEnemy = world.outposts.filter((o) => o.team !== opMyTeam && o.team !== 2).length;
    // 深渊领主(Boss/Roshan)重生计时:最受争夺的目标计时(读 world.bossId/bossRespawnAt)
    const bossActive = world.bossId !== 0 || world.bossRespawnAt !== Infinity;
    const bossAlive = !!world.getUnit(world.bossId)?.alive;
    const bLeft = Math.max(0, Math.ceil(world.bossRespawnAt - t));
    const bossTxt = bossAlive ? '在世' : world.bossRespawnAt === Infinity ? '?' : `${Math.floor(bLeft / 60)}:${(bLeft % 60).toString().padStart(2, '0')}`;
    const runeBroadcast = runeStatusBroadcastLabel({
      activeRunes: world.runes.map((activeRune) => ({ type: activeRune.type })),
      readyIn: rLeft,
    });
    const bossBroadcast = bossStatusBroadcastLabel({
      active: bossActive,
      alive: bossAlive,
      respawnIn: bLeft,
    });
    const mapMechanics = hero ? this.mapMechanics(world, hero) : undefined;
    this.topbar.innerHTML =
      `<span style="color:#8fd17a;font-weight:700">${dawnKills}</span>` +
      `<span style="color:#8a9">晨曦</span>` +
      `<span>${world.isNight ? '夜晚' : '白昼'}</span>` +
      `<span data-status-broadcast="${escapeAttr(clockBroadcast)}" title="Alt+点击广播当前时间" style="color:#cfd8a0;cursor:help">${sign}${mm}:${ss}</span>` +
      this.speedChip(speed) +
      `<span data-status-broadcast="${escapeAttr(runeBroadcast)}" title="下一波神符刷新 · Alt+点击广播" style="color:#5fd0d0;cursor:help">⟳${rune}</span>` +
      `<span data-status-broadcast="${escapeAttr(glyphBroadcast)}" title="守护符文 G(强化己方建筑) · Alt+点击广播" style="color:${gLeft <= 0 ? '#8fd17a' : '#9a9277'};cursor:help">🛡${glyph}</span>` +
      `<span title="扫描 V(揭示光标处区域,查敌/反 gank)" style="color:${scLeft <= 0 ? '#5fd0d0' : '#9a9277'}">📡${scan}</span>` +
      (world.outposts.length ? `<span title="前哨(占领→团队周期经验)">◆<span style="color:#8fd17a">${opMine}</span><span style="color:#6b7280">/</span><span style="color:#ef9a9a">${opEnemy}</span></span>` : '') +
      (bossActive ? `<span data-status-broadcast="${escapeAttr(bossBroadcast)}" title="深渊领主(Boss)重生计时 · Alt+点击广播" style="color:${bossAlive ? '#8fd17a' : '#d9a44a'};cursor:help">☠${bossTxt}</span>` : '') +
      (mapMechanics ? this.mapMechanicsHtml(mapMechanics) : '') +
      `<span data-status-broadcast="${escapeAttr(buybackBroadcast)}" title="金币/买活状态 · Alt+点击广播" style="color:#ffd54f;cursor:help">${gold}</span>` +
      this.quickbuyChip() +
      `<span style="color:#a89">永夜</span>` +
      `<span style="color:#ef9a9a;font-weight:700">${nightKills}</span>`;
  }

  private mapMechanics(world: World, hero: Unit): MapMechanicsModel {
    const aliveNeutrals = [...world.units.values()].filter((unit) => unit.kind === 'neutral' && unit.alive);
    const aliveCampIds = new Set(aliveNeutrals.map((unit) => unit.campId).filter((id): id is number => id !== undefined));
    return buildMapMechanicsModel({
      time: world.time,
      totalCamps: world.map.camps.length,
      aliveCamps: aliveCampIds.size,
      aliveNeutrals: aliveNeutrals.length,
      activeRunes: world.runes.map((rune) => ({ type: rune.type, pos: { ...rune.pos } })),
      heroHeight: world.map.heightAt(hero.pos),
      nearTreeWall: this.nearTreeWall(world, hero),
      insideForestPocket: this.insideForestPocket(world, hero),
      evasion: hero.calc.evasion,
      trueStrike: hero.calc.trueStrike,
      uphillMissChance: UPHILL_MISS_CHANCE,
      nearestCamp: this.nearestCamp(world, hero, aliveCampIds),
      nearestRune: this.nearestRune(world, hero),
      nearestHighGround: this.nearestHighGround(world, hero),
      nearestForestPocket: this.nearestForestPocket(world, hero),
    });
  }

  private mapMechanicsHtml(model: MapMechanicsModel): string {
    return model.chips.map((chip) => this.mapMechanicsChip(chip)).join('');
  }

  private mapMechanicsChip(chip: MapMechanicsChip): string {
    const tone: Record<MapMechanicsChip['tone'], { color: string; border: string; bg: string }> = {
      neutral: { color: '#c9c1a1', border: '#4a4f39', bg: '#10140d' },
      info: { color: '#8defff', border: '#2f6c76', bg: '#0b1c20' },
      highground: { color: '#ffe08a', border: '#7a6230', bg: '#211b0d' },
      forest: { color: '#a8e07a', border: '#3f6f2a', bg: '#0d1a0b' },
      warning: { color: '#ffcf7a', border: '#7a4d28', bg: '#21120b' },
      ready: { color: '#9cff74', border: '#4b6a37', bg: '#13200f' },
    };
    const p = tone[chip.tone];
    return `<span title="${escapeAttr(chip.title)}" style="display:inline-flex;align-items:center;gap:2px;height:18px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.color};padding:0 4px;font-size:10px;font-weight:800;white-space:nowrap;">
      <span style="opacity:.72">${chip.label}</span><b>${chip.value}</b>
    </span>`;
  }

  private renderMapMechanicsRadar(model: MapMechanicsModel | undefined): void {
    if (!model || model.radar.length === 0) {
      this.mapMechanicsRadar.style.display = 'none';
      this.mapMechanicsRadar.innerHTML = '';
      return;
    }
    this.mapMechanicsRadar.style.display = 'flex';
    this.mapMechanicsRadar.innerHTML =
      `<span style="flex:none;color:#879070;font-size:9px;font-weight:900;letter-spacing:0;">MAP</span>` +
      model.radar.map((entry) => this.mapMechanicsRadarEntry(entry)).join('');
  }

  private mapMechanicsRadarEntry(entry: MapMechanicsRadarEntry): string {
    const tone: Record<MapMechanicsRadarEntry['tone'], { color: string; border: string; bg: string }> = {
      neutral: { color: '#c9c1a1', border: '#4a4f39', bg: '#10140d' },
      info: { color: '#8defff', border: '#2f6c76', bg: '#0b1c20' },
      highground: { color: '#ffe08a', border: '#7a6230', bg: '#211b0d' },
      forest: { color: '#a8e07a', border: '#3f6f2a', bg: '#0d1a0b' },
      warning: { color: '#ffcf7a', border: '#7a4d28', bg: '#21120b' },
      ready: { color: '#9cff74', border: '#4b6a37', bg: '#13200f' },
    };
    const p = tone[entry.tone];
    return `<span title="${escapeAttr(entry.title)}" style="display:inline-flex;align-items:center;gap:4px;min-width:0;height:22px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.color};padding:0 6px;font-size:10px;font-weight:800;white-space:nowrap;">
      <span style="opacity:.72">${entry.label}</span><b style="overflow:hidden;text-overflow:ellipsis;">${entry.value}</b>
    </span>`;
  }

  private renderTutorialCoach(model: TutorialCoachModel | undefined): void {
    if (!model?.visible) {
      this.tutorialCoach.style.display = 'none';
      this.tutorialCoach.innerHTML = '';
      return;
    }
    const tone = tutorialCoachTone(model.tone);
    this.tutorialCoach.style.display = 'flex';
    this.tutorialCoach.style.borderColor = tone.border;
    this.tutorialCoach.innerHTML = `<div title="${escapeAttr(`${model.detail} - ${model.action}`)}" style="display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:start;color:${tone.fg};">
      <span style="height:18px;line-height:18px;border:1px solid ${tone.border};border-radius:3px;background:${tone.bg};padding:0 5px;font-size:9px;font-weight:900;letter-spacing:0;color:${tone.fg};">COACH</span>
      <span style="min-width:0;display:flex;flex-direction:column;gap:2px;">
        <b style="font-size:11px;line-height:14px;color:${tone.fg};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(model.label)}</b>
        <span style="font-size:10px;line-height:13px;color:#d8d0ae;">${escapeHtml(model.detail)}</span>
        <span style="font-size:9px;line-height:12px;color:${tone.action};font-weight:800;">${escapeHtml(model.action)}</span>
      </span>
    </div>`;
  }

  private nearTreeWall(world: World, hero: Unit): boolean {
    const { cx, cy } = world.map.cellOf(hero.pos);
    const radiusCells = 10;
    for (let dy = -radiusCells; dy <= radiusCells; dy++) {
      for (let dx = -radiusCells; dx <= radiusCells; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!world.map.inBounds(x, y)) continue;
        if (world.map.trees.has(world.map.cellIndex(x, y))) return true;
      }
    }
    return false;
  }

  private nearestCamp(world: World, hero: Unit, aliveCampIds: Set<number>) {
    let best: { tier: string; distance: number; alive: boolean } | undefined;
    for (const camp of world.map.camps) {
      const distance = worldDistance(hero.pos, camp.pos);
      if (!best || distance < best.distance) best = { tier: camp.tier, distance, alive: aliveCampIds.has(camp.id) };
    }
    return best;
  }

  private nearestRune(world: World, hero: Unit) {
    let best: { distance: number; activeType?: (typeof world.runes)[number]['type'] } | undefined;
    for (const rune of world.runes) {
      const distance = worldDistance(hero.pos, rune.pos);
      if (!best || distance < best.distance) best = { distance, activeType: rune.type };
    }
    if (best) return best;
    for (const spot of world.map.runeSpots) {
      const distance = worldDistance(hero.pos, spot);
      if (!best || distance < best.distance) best = { distance };
    }
    return best;
  }

  private nearestHighGround(world: World, hero: Unit) {
    if (world.map.heightAt(hero.pos) >= 2) return { distance: 0, current: true };
    const nearest = this.nearestTerrainDistance(world, hero, (cx, cy) =>
      world.map.isWalkableCell(cx, cy) && world.map.height[world.map.cellIndex(cx, cy)] >= 2,
    );
    return nearest ? { distance: nearest.distance, current: Boolean(nearest.current) } : undefined;
  }

  private nearestForestPocket(world: World, hero: Unit) {
    let best: { distance: number; inside: boolean } | undefined;
    for (const pocket of world.map.forestPockets) {
      const distance = worldDistance(hero.pos, pocket.pos);
      const inside = distance <= pocket.r;
      if (!best || distance < best.distance) best = { distance, inside };
    }
    return best;
  }

  private insideForestPocket(world: World, hero: Unit): boolean {
    return world.map.forestPockets.some((pocket) => worldDistance(hero.pos, pocket.pos) <= pocket.r);
  }

  private nearestTerrainDistance(
    world: World,
    hero: Unit,
    accepts: (cx: number, cy: number) => boolean,
  ): { distance: number; current?: boolean } | undefined {
    const { cx, cy } = world.map.cellOf(hero.pos);
    let best: number | undefined;
    for (let dy = -34; dy <= 34; dy++) {
      for (let dx = -34; dx <= 34; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!world.map.inBounds(x, y) || !accepts(x, y)) continue;
        const distance = worldDistance(hero.pos, world.map.cellCenter(x, y));
        if (best === undefined || distance < best) best = distance;
      }
    }
    return best === undefined ? undefined : { distance: best, current: best < world.map.CELL * 0.75 };
  }

  private treeWithinCells(world: World, cx: number, cy: number, radius: number): boolean {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!world.map.inBounds(x, y)) continue;
        if (world.map.trees.has(world.map.cellIndex(x, y))) return true;
      }
    }
    return false;
  }

  private speedChip(model: GameSpeedHudModel): string {
    if (!model.visible) return '';
    const palette: Record<GameSpeedHudModel['tone'], { color: string; border: string; bg: string }> = {
      normal: { color: '#cfd8a0', border: '#5a5f3a', bg: '#15180e' },
      slow: { color: '#8fd0ff', border: '#3f6f8f', bg: '#0d1a22' },
      fast: { color: '#ffd76a', border: '#8a6a24', bg: '#211805' },
      paused: { color: '#ff8f8f', border: '#8a3434', bg: '#260d0d' },
    };
    const p = palette[model.tone];
    return `<span data-game-speed="${model.label}" title="${model.title}" style="display:inline-flex;align-items:center;height:18px;border:1px solid ${p.border};border-radius:4px;background:${p.bg};color:${p.color};font-size:11px;font-weight:800;padding:0 6px;white-space:nowrap;">${model.label}</span>`;
  }

  /** 顶栏 quickbuy 提醒:目标装备 + 还差多少金 / 可购买(离店仍可见,DotA 核心 QoL)。 */
  private quickbuyChip(): string {
    const q = this.quickbuy;
    if (!q || !q.active) return '';
    const color = q.ready ? '#8fd17a' : '#ffb74d';
    const status = q.ready ? '可购买' : `还需 ${q.deficit}`;
    const queue = q.queueSize && q.queueSize > 1 ? ` x${q.queueSize}` : '';
    const label = q.queueLabel || q.label;
    return `<span title="快速购买队列(Shift 替换,Ctrl+Shift 追加): ${escapeAttr(label)}" style="display:inline-flex;align-items:center;gap:4px;border:1px solid ${color};border-radius:4px;padding:0 6px;color:${color};font-size:12px">⭐ ${q.label}${queue} · ${status}</span>`;
  }

  /** 敌方英雄顶栏:常驻威胁评估。等级/复活公开常显;血蓝仅在玩家视野内显示(不透雾)。 */
  /** 双方英雄顶栏:友军(左,血蓝常显)+ 敌方(右,迷雾门控)。DotA 式常驻总览。 */
  private renderHeroBars(world: World, hero: Unit | undefined, alt = false): void {
    if (!hero) { this.heroBar.innerHTML = ''; return; }
    const toInput = (u: Unit, ally: boolean) => ({
      id: u.id, name: u.name, glyph: u.heroDef?.glyph ?? '⚔',
      color: u.heroDef?.color ?? (u.team === hero.team ? '#8fd17a' : '#ef9a9a'),
      level: u.level, alive: u.alive, visible: isVisibleTo(world, hero.team, u),
      ally,
      hp: u.hp, maxHp: u.calc.maxHp, mp: u.mp, maxMp: u.calc.maxMp, respawnAt: u.heroMeta?.respawnAt ?? world.time,
      tpScrolls: ally ? this.heroTpScrolls(u) : undefined,
      ultimate: ally ? this.heroUltimateStatus(world, u) : undefined,
      buyback: ally && u.heroMeta ? {
        gold: u.heroMeta.gold,
        cost: buybackCost(u.level),
        cooldownRemaining: (u.heroMeta.buybackCooldownUntil ?? 0) - world.time,
      } : undefined,
    });
    const allies = [...world.units.values()].filter((u) => u.isHero() && u.team === hero.team);
    const enemies = [...world.units.values()].filter((u) => u.isHero() && u.team !== hero.team);
    const allyChips = buildEnemyHeroBar(allies.map((u) => toInput(u, true)), world.time); // 同队 visible 恒真 → 血蓝常显
    const enemyChips = buildEnemyHeroBar(enemies.map((u) => toInput(u, false)), world.time);
    if (allyChips.length === 0 && enemyChips.length === 0) { this.heroBar.innerHTML = ''; return; }
    const selfId = hero.id;
    const group = (chips: ReturnType<typeof buildEnemyHeroBar>) =>
      `<div style="display:flex;gap:6px;align-items:flex-start">${chips.map((c) => this.heroChipHtml(c, c.id === selfId, alt)).join('')}</div>`;
    const sep = '<div style="align-self:center;color:#6b6550;font-size:11px;font-weight:700">VS</div>';
    this.heroBar.innerHTML = group(allyChips) + sep + group(enemyChips);
  }

  /** 单个英雄 chip:字形 + 等级 + 血蓝条 /(雾中)迷雾 /(死亡)复活倒计时;自己描金边。 */
  private heroChipHtml(c: ReturnType<typeof buildEnemyHeroBar>[number], isSelf: boolean, alt = false): string {
    const miniBar = (frac: number, color: string) =>
      `<div style="height:4px;background:#0a0b0a;border-radius:1px;margin-top:1px;overflow:hidden"><div style="height:100%;width:${Math.round(frac * 100)}%;background:${color}"></div></div>`;
    // 按住 Alt:可见英雄显精确血/蓝数值(DotA 击杀计算);否则显血蓝条
    const bars = alt
      ? `<div style="font-size:8px;text-align:center;line-height:11px;margin-top:1px"><span style="color:#6fdc6f;font-weight:700">${c.hp}</span> <span style="color:#5aa2ff">${c.mp}</span></div>`
      : miniBar(c.hpFrac, '#4caf50') + miniBar(c.mpFrac, '#42a5f5');
    const body = c.showBars
      ? bars
      : !c.alive
        ? `<div style="font-size:9px;color:#ef5350;text-align:center;font-weight:700;margin-top:2px">复活 ${c.respawnIn}s</div>`
        : `<div style="font-size:9px;color:#6b6550;text-align:center;margin-top:2px">迷雾</div>`;
    const ring = isSelf ? 'box-shadow:0 0 0 1px #ffd54f inset;' : '';
    return `<div data-hero-id="${c.id}" data-status-broadcast="${escapeAttr(c.statusBroadcast)}" title="${c.name}${isSelf ? '(你)' : ''} — 点击居中;Alt+点击广播状态" style="width:58px;border:1px solid ${c.color};background:#0c0f08d8;border-radius:4px;padding:2px 3px;opacity:${c.alive ? 1 : 0.55};${ring}pointer-events:auto;cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center;line-height:13px">
        <span style="color:${c.color};font-size:11px">${c.glyph}</span>
        <span style="color:#1a1d12;background:#cfd8a0;border-radius:2px;padding:0 3px;font-size:9px;font-weight:700">${c.level}</span>
      </div>
      ${body}
    </div>`;
  }

  private renderChatWheel(): void {
    const model = buildChatWheelModel({
      preset: this.chatWheelPreset,
      customLabels: this.chatWheelCustomLabels,
    });
    const toggle = `<button data-chat-wheel-toggle="1" title="打开聊天轮盘" style="height:24px;padding:0 8px;border:1px solid #3a5d66;border-radius:4px;background:#0f181c;color:#98d9ef;font-size:10px;font-weight:900;letter-spacing:0;cursor:pointer;">CHAT</button>`;
    if (!this.chatWheelOpen || !model.visible) {
      this.chatWheel.innerHTML = toggle;
      return;
    }
    const calls = model.calls.map((call) => this.chatWheelCallHtml(call)).join('');
    this.chatWheel.innerHTML = `${toggle}<div aria-label="chat wheel" style="width:178px;display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:5px;border:1px solid #33402a;border-radius:5px;background:#0c1008ee;box-shadow:0 8px 22px #0008;">${calls}</div>`;
  }

  private renderSpectatorTimeline(): void {
    if (!this.spectatorControls.visible && this.spectatorTimelineEntries.length === 0 && this.spectatorJumpHistoryEntries.length === 0) {
      this.spectatorTimeline.style.display = 'none';
      this.spectatorTimeline.innerHTML = '';
      return;
    }
    this.spectatorTimeline.style.display = 'flex';
    const controls = this.spectatorControls.visible ? this.spectatorControlsHtml(this.spectatorControls) : '';
    const rows = this.spectatorTimelineEntries.slice(0, 8).map((entry) => this.spectatorTimelineRow(entry)).join('');
    const events = this.spectatorTimelineEntries.length > 0 ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;color:#cfc7a5;font-size:9px;font-weight:900;letter-spacing:0;">
      <span>EVENTS</span><span>${this.spectatorTimelineEntries.length}</span>
    </div>${rows}` : '';
    const jumpRows = this.spectatorJumpHistoryEntries.slice(0, 4).map((entry) => this.spectatorTimelineRow(entry, 'jump')).join('');
    const jumps = this.spectatorJumpHistoryEntries.length > 0 ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;color:#aab8d8;font-size:9px;font-weight:900;letter-spacing:0;margin-top:${events ? 4 : 0}px;">
      <span>JUMPS</span><span>${this.spectatorJumpHistoryEntries.length}</span>
    </div>${jumpRows}` : '';
    this.spectatorTimeline.innerHTML = `${controls}${events}${jumps}`;
  }

  private renderTeamCommunicationLog(): void {
    if (this.teamCommunicationEntries.length === 0) {
      this.teamCommunicationLog.style.display = 'none';
      this.teamCommunicationLog.innerHTML = '';
      return;
    }
    this.teamCommunicationLog.style.display = 'flex';
    const rows = this.teamCommunicationEntries.slice(0, 5).map((entry) => this.teamCommunicationRow(entry)).join('');
    this.teamCommunicationLog.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;color:#cfc7a5;font-size:9px;font-weight:900;letter-spacing:0;">
      <span>TEAM</span><span>${this.teamCommunicationEntries.length}</span>
    </div>${rows}`;
  }

  private teamCommunicationRow(entry: TeamCommunicationEntry): string {
    const tone = teamCommunicationTone(entry.tone);
    return `<div title="${escapeAttr(`${entry.timeLabel} ${entry.source}: ${entry.label}`)}" style="height:20px;min-width:0;display:grid;grid-template-columns:31px 44px 1fr;align-items:center;gap:4px;padding:0 4px;border:1px solid ${tone.border};border-radius:3px;background:${tone.bg};color:${tone.fg};font-size:10px;font-weight:800;box-sizing:border-box;">
      <span style="font-variant-numeric:tabular-nums;color:#cfc7a5;font-size:8px;">${entry.timeLabel}</span>
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${tone.source};font-size:9px;">${escapeHtml(entry.source)}</span>
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(entry.label)}</span>
    </div>`;
  }

  private spectatorControlsHtml(model: SpectatorControlsModel): string {
    const buttons = model.actions.map((action) => this.spectatorControlButton(action)).join('');
    return `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:${this.spectatorTimelineEntries.length ? 4 : 0}px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;color:#cfc7a5;font-size:9px;font-weight:900;letter-spacing:0;">
        <span>WATCH</span><span style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(model.summary)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">${buttons}</div>
    </div>`;
  }

  private spectatorControlButton(action: SpectatorControlAction): string {
    const tone = spectatorControlTone(action.tone);
    const disabled = action.enabled ? '' : 'disabled';
    const data = action.enabled ? `data-spectator-control="${action.id}"` : '';
    const title = action.reason ? `${action.detail} - ${action.reason}` : action.detail;
    return `<button ${data} ${disabled} title="${escapeAttr(title)}" style="height:23px;min-width:0;border:1px solid ${tone.border};border-radius:3px;background:${tone.bg};color:${tone.fg};font-size:9px;font-weight:900;cursor:${action.enabled ? 'pointer' : 'not-allowed'};opacity:${action.enabled ? 1 : 0.5};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(action.label)}</button>`;
  }

  private spectatorTimelineRow(entry: SpectatorTimelineEntry, source: 'event' | 'jump' = 'event'): string {
    const tone = spectatorTimelineTone(entry.tone);
    const prefix = source === 'jump' ? '↩ ' : '';
    return `<button data-spectator-timeline-id="${escapeAttr(entry.id)}" title="${escapeAttr(`${entry.timeLabel} ${entry.detail}`)}" style="height:26px;min-width:0;display:grid;grid-template-columns:34px 1fr;align-items:center;gap:5px;padding:0 5px;border:1px solid ${tone.border};border-radius:3px;background:${tone.bg};color:${tone.fg};font-size:10px;font-weight:800;text-align:left;cursor:pointer;box-sizing:border-box;">
      <span style="font-variant-numeric:tabular-nums;color:#cfc7a5;font-size:9px;">${entry.timeLabel}</span>
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${prefix}${escapeHtml(entry.label)}</span>
    </button>`;
  }

  private chatWheelCallHtml(call: ChatWheelCall): string {
    const label = chatWheelBroadcastLabel(call);
    const tone = chatWheelTone(call.id);
    return `<button data-chat-wheel-call="${escapeAttr(label)}" title="${escapeAttr(`${call.hotkey}. ${call.detail}`)}" style="min-width:0;height:22px;display:flex;align-items:center;justify-content:space-between;gap:4px;padding:0 5px;border:1px solid ${tone.border};border-radius:3px;background:${tone.bg};color:${tone.fg};font-size:10px;font-weight:800;cursor:pointer;box-sizing:border-box;">
      <span style="flex:none;color:#cfc7a5;font-size:9px;">${call.hotkey}</span>
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(call.label)}</span>
    </button>`;
  }

  private heroTpScrolls(hero: Unit): number {
    return hero.tpSlot?.itemKey === 'tp' ? Math.max(1, Math.floor(hero.tpSlot.charges || 1)) : 0;
  }

  private heroUltimateStatus(world: World, hero: Unit): { name: string; learned: boolean; ready: boolean; cooldownRemaining?: number } | undefined {
    const index = hero.heroDef?.abilities.findIndex((ability) => ability.ultimate) ?? -1;
    if (index < 0 || !hero.heroDef) return undefined;
    const def = hero.heroDef.abilities[index];
    const inst = hero.abilities[index];
    const learned = !!inst && inst.level > 0;
    if (!learned) return { name: def.name, learned: false, ready: false };
    const cooldownRemaining = Math.max(0, inst.cooldownUntil - world.time);
    const ready = cooldownRemaining <= 0 && abilityReady(world, hero, index);
    return {
      name: def.name,
      learned,
      ready,
      cooldownRemaining: ready ? undefined : cooldownRemaining,
    };
  }

  /** 实时受伤来源提示:战斗中显示「谁正在打你 + 伤害量」(复用死亡回顾的来源聚合,但实时)。 */
  private renderCombatFeed(): void {
    const entries = this.incomingDamage;
    if (entries.length === 0) { if (this.combatFeed.innerHTML) this.combatFeed.innerHTML = ''; return; }
    const typeColor: Record<'physical' | 'magical' | 'pure', string> = {
      physical: '#e07a4a', magical: '#8a7dff', pure: '#e8e8e8',
    };
    const max = Math.max(1, ...entries.map((e) => e.total));
    const rows = entries.map((e) => {
      const widthPct = (e.total / max) * 100;
      const segs = (['physical', 'magical', 'pure'] as const)
        .filter((t) => e.byType[t] > 0)
        .map((t) => `<span style="display:inline-block;height:100%;width:${(e.byType[t] / e.total) * 100}%;background:${typeColor[t]}"></span>`)
        .join('');
      const name = e.sourceColor
        ? `<span style="color:${e.sourceColor};font-weight:700">${e.sourceName}</span>`
        : `<span style="color:#c2b9a0">${e.sourceName}</span>`;
      return `<div style="display:flex;align-items:center;gap:5px;font-size:10px">
        <span style="flex:0 0 52px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
        <span style="flex:1;height:6px;background:#0a0b0a99;border-radius:2px;overflow:hidden;display:flex"><span style="display:flex;width:${widthPct}%;height:100%">${segs}</span></span>
        <span style="flex:0 0 34px;text-align:right;color:#ff8a6a;font-weight:700">${Math.round(e.total)}</span>
      </div>`;
    }).join('');
    this.combatFeed.innerHTML = `<div style="background:#0c0f08c8;border:1px solid #5a3a2a;border-left:3px solid #e0673a;border-radius:4px;padding:3px 6px">
      <div style="font-size:9px;color:#e0813a;margin-bottom:1px;font-weight:700">⚠ 正在受到伤害</div>${rows}
    </div>`;
  }

  private renderThreatEdges(): void {
    if (this.threatIndicators.length === 0) {
      if (this.threatEdges.innerHTML) this.threatEdges.innerHTML = '';
      return;
    }
    this.threatEdges.innerHTML = this.threatIndicators.map((indicator) => this.threatEdgeHtml(indicator)).join('');
  }

  private threatEdgeHtml(indicator: ThreatEdgeIndicator): string {
    const color = threatColor(indicator);
    const opacity = Math.max(0, Math.min(0.72, 0.18 + indicator.intensity * 0.54));
    const glow = Math.round(26 + indicator.intensity * 58);
    const edgeStyle = threatEdgeStyle(indicator.edge);
    const rotation = indicator.edge === 'left' ? 'rotate(-90deg)' : indicator.edge === 'right' ? 'rotate(90deg)' : 'none';
    return `<div data-threat-edge="${indicator.edge}" title="${escapeAttr(indicator.label)}" style="position:absolute;${edgeStyle};opacity:${opacity.toFixed(3)};background:${color};box-shadow:0 0 ${glow}px ${color};border-radius:3px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
      <span style="font-size:10px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;transform:${rotation};">${escapeHtml(indicator.sourceName)}</span>
    </div>`;
  }

  /** 死亡回放:显示最后击杀来源(被谁击杀)。 */
  private deathRecap(world: World, hero: Unit): string {
    const killer = hero.lastAttackerId ? world.getUnit(hero.lastAttackerId) : undefined;
    const who = !killer ? ''
      : killer.isHero() ? killer.name
      : killer.kind === 'tower' ? '防御塔'
      : killer.kind === 'building' ? '建筑'
      : killer.kind === 'boss' ? '深渊领主'
      : killer.kind === 'neutral' ? '野怪' : '小兵';
    const color = killer?.isHero() ? (killer.heroDef?.color ?? '#ef5350') : '#b0a890';
    const header = killer
      ? `<div style="font-size:11px;color:#9a9277;margin-bottom:2px">被 <span style="color:${color};font-weight:700">${who}</span> 击杀</div>`
      : '';
    return header + this.deathAssistSummary() + this.deathRecapBreakdown() + this.deathControlTimeline();
  }

  private deathAssistSummary(): string {
    const summary = buildDeathAssistSummary(this.deathAssistSources, 3);
    if (!summary) return '';
    const chips = summary.visible.map((p) => {
      const color = p.color ?? '#d6c28a';
      return `<span style="display:inline-flex;align-items:center;height:15px;padding:0 5px;border:1px solid ${color};border-radius:2px;background:${color}1f;color:${color};font-size:9px;font-weight:800">${p.name}</span>`;
    }).join('');
    const overflow = summary.overflow > 0
      ? `<span style="display:inline-flex;align-items:center;height:15px;padding:0 5px;border:1px solid #8f8468;border-radius:2px;background:#8f84681f;color:#d6c28a;font-size:9px;font-weight:800">+${summary.overflow}</span>`
      : '';
    return `<div title="${summary.title}" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:1px 0 4px">
      <span style="font-size:10px;color:#7d7560;font-weight:700">协助</span>${chips}${overflow}
    </div>`;
  }

  /** 致命前控制时间线:被谁眩晕/缠绕/沉默/缴械,按顺序 + 时长(理解被连控致死)。 */
  private deathControlTimeline(): string {
    const entries = this.deathControlEntries;
    if (!entries.length) return '';
    const label: Record<ControlKind, { tag: string; color: string }> = {
      stun: { tag: '晕', color: '#ffca28' },
      root: { tag: '缚', color: '#66bb6a' },
      silence: { tag: '默', color: '#ab47bc' },
      disarm: { tag: '缴', color: '#ef9a9a' },
      mute: { tag: '禁', color: '#8d6e63' },
      lift: { tag: '升空', color: '#26c6da' },
    };
    const chips = entries.map((c) => {
      const l = label[c.control];
      const src = c.sourceColor ? `<span style="color:${c.sourceColor}">${c.sourceName}</span>` : c.sourceName;
      return `<span style="display:inline-flex;align-items:center;gap:2px;padding:0 4px;border:1px solid ${l.color};border-radius:2px;background:${l.color}1f;color:${l.color};font-size:9px;font-weight:700">${l.tag} ${c.duration.toFixed(1)}s</span><span style="font-size:9px;color:#9a9277"> ${src}</span>`;
    }).join('<span style="color:#5a5444;font-size:9px"> › </span>');
    const lockdown = this.deathControlLockdown > 0
      ? `<span style="color:#ffca28;font-weight:700"> 共被控 ${this.deathControlLockdown.toFixed(1)}s</span>`
      : '';
    return `<div style="margin:1px 0 4px">
      <div style="font-size:10px;color:#7d7560;margin-bottom:1px">控制链${lockdown}</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center">${chips}</div>
    </div>`;
  }

  /** 致命前 ~10s 伤害来源拆解:每来源一条(名字 + 总伤 + 物理/魔法/纯粹分段条)。 */
  private deathRecapBreakdown(): string {
    const entries = this.deathRecapEntries;
    if (!entries.length) return '';
    const max = Math.max(1, ...entries.map((e) => e.total));
    const typeColor: Record<'physical' | 'magical' | 'pure', string> = {
      physical: '#e07a4a', // 物理
      magical: '#8a7dff', // 魔法
      pure: '#e8e8e8', // 纯粹
    };
    const rows = entries.map((e) => {
      const widthPct = (e.total / max) * 100;
      const segs = (['physical', 'magical', 'pure'] as const)
        .filter((t) => e.byType[t] > 0)
        .map((t) => `<span style="display:inline-block;height:100%;width:${(e.byType[t] / e.total) * 100}%;background:${typeColor[t]}"></span>`)
        .join('');
      const name = e.sourceColor
        ? `<span style="color:${e.sourceColor};font-weight:700">${e.sourceName}</span>`
        : `<span style="color:#c2b9a0">${e.sourceName}</span>`;
      const context = e.context?.action === 'center'
        ? `<button data-death-recap-context="${escapeAttr(e.groupKey)}" title="定位到最后可见来源并标记" style="height:16px;border:1px solid #d9b44a;border-radius:2px;background:#1d190c;color:#ffd76a;font-size:9px;font-weight:800;padding:0 4px;cursor:pointer;pointer-events:auto;">定位</button>`
        : e.context?.action === 'hidden'
          ? `<span title="来源在迷雾中,不显示位置" style="height:16px;line-height:16px;border:1px solid #5c5649;border-radius:2px;background:#15130f;color:#8f8978;font-size:9px;font-weight:800;padding:0 4px;">迷雾</span>`
          : '';
      return `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:10px">
        <span style="flex:0 0 64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
        <span style="flex:1;height:8px;background:#0a0b0a;border-radius:2px;overflow:hidden;display:flex"><span style="display:flex;width:${widthPct}%;height:100%">${segs}</span></span>
        <span style="flex:0 0 38px;text-align:right;color:#e6ddc4;font-weight:700">${Math.round(e.total)}</span>
        ${context}
      </div>`;
    }).join('');
    return `<div style="margin:3px 0 4px">
      <div style="font-size:10px;color:#7d7560;margin-bottom:1px">致命前伤害来源</div>
      ${rows}
    </div>`;
  }

  /** 死亡时买活行:可买活则显示按钮(费用),冷却中显示倒计时,金不足显示所需。 */
  private buybackRow(world: World, hero: Unit): string {
    const cost = buybackCost(hero.level);
    const cd = Math.ceil((hero.heroMeta?.buybackCooldownUntil ?? 0) - world.time);
    const status = buybackStatusBroadcastLabel({
      alive: hero.alive,
      gold: hero.heroMeta?.gold ?? 0,
      cost,
      cooldownRemaining: cd,
    });
    if (cd > 0) return `<div data-status-broadcast="${escapeAttr(status)}" title="Alt+点击广播买活状态" style="font-size:11px;color:#9a9277">买活冷却 ${cd}s</div>`;
    if (canBuyback(world, hero)) {
      return `<div data-buyback="1" data-status-broadcast="${escapeAttr(status)}" title="立即复活(B) · Alt+点击广播买活状态" style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid #6fcf5a;border-radius:3px;background:#6fcf5a22;color:#9fe87a;font-size:12px;font-weight:700;cursor:pointer">买活 (B) · ${cost}金</div>`;
    }
    return `<div data-status-broadcast="${escapeAttr(status)}" title="Alt+点击广播买活状态" style="font-size:11px;color:#a8895a">买活需 ${cost}金(余 ${hero.heroMeta?.gold ?? 0})</div>`;
  }

  /** Dota-like 状态栏:最长控制条 + 紧凑 modifier token。 */
  private modifierBar(world: World, hero: Unit): string {
    const disable = buildDisableBarModel({ modifiers: hero.modifiers, now: world.time });
    const tokens = buildModifierIconTokens({ modifiers: hero.modifiers, now: world.time, max: 10 });
    if (!tokens.length && !disable.visible) return '';
    return `<div style="display:flex;flex-direction:column;gap:3px;margin-top:4px;max-width:100%">
      ${this.disableBarHtml(disable)}
      ${this.modifierTokensHtml(tokens)}
    </div>`;
  }

  private disableBarHtml(model: DisableBarModel): string {
    if (!model.visible) return '';
    return `<div title="${model.detail}" style="height:16px;border:1px solid ${model.color};border-radius:3px;background:#090b0d;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px #0008;">
      <div style="position:absolute;inset:0 ${100 - model.percent}% 0 0;background:linear-gradient(90deg,${model.color}55,${model.color});"></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;gap:5px;padding:0 5px;color:#fff;font-size:10px;font-weight:800;text-shadow:0 1px 1px #000;box-sizing:border-box;">
        <span style="white-space:nowrap">${model.label}</span>
        <span style="font-variant-numeric:tabular-nums;color:${model.color};white-space:nowrap">${modifierTokenTime(model.remaining)}s</span>
      </div>
    </div>`;
  }

  private modifierTokensHtml(tokens: ModifierIconToken[]): string {
    if (!tokens.length) return '';
    const html = tokens.map((token) =>
      `<span title="${token.tooltip}" style="display:inline-flex;align-items:center;justify-content:center;gap:2px;height:17px;min-width:25px;padding:0 4px;border:1px solid ${token.color};border-radius:3px;background:${token.color}22;color:${token.color};font-size:9px;font-weight:800;box-sizing:border-box;">
        <b style="font-size:10px;line-height:1">${token.label}</b><span style="font-variant-numeric:tabular-nums;color:#f1ead0">${modifierTokenTime(token.remaining)}</span>
      </span>`,
    ).join('');
    return `<div style="display:flex;flex-wrap:wrap;gap:3px;max-width:100%">${html}</div>`;
  }

  private meter(value: number, max: number, top: string, bottom: string, label = '', statusBroadcast?: string): string {
    const safeMax = Math.max(1, max);
    const frac = Math.max(0, Math.min(1, value / safeMax));
    // 加高加粗(血/蓝是第一信息),数值带阴影更易读;label 在左端标注 生命/法力
    const data = statusBroadcast ? `data-status-broadcast="${escapeAttr(statusBroadcast)}" title="Alt+点击广播资源状态"` : '';
    return `<div ${data} style="background:#070807;border:1px solid #2a3220;height:21px;margin:3px 0;position:relative;border-radius:3px;overflow:hidden;${statusBroadcast ? 'cursor:help;' : ''}">
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

  private abilitySlot(world: World, hero: Unit, i: number, ux?: UxFeedback, orbPriority?: OrbPriorityEntry, hotkey = DEFAULT_ABILITY_HOTKEYS[i] ?? '?'): string {
    const def = hero.heroDef?.abilities[i];
    const inst = hero.abilities[i];
    if (!def || !inst) return '';
    const lvl = inst.level;
    const manaIdx = Math.max(0, lvl - 1);
    const cdTotal = def.cooldown?.[manaIdx] ?? 0;
    const cooldown = buildCooldownOverlayModel({ now: world.time, cooldownUntil: inst.cooldownUntil, totalCooldown: cdTotal });
    const mana = lvl > 0 ? abilityManaCost(hero, def, lvl) : (def.manaCost?.[0] ?? 0);
    const passive = def.targetMode === 'passive';
    const learnable = canLearn(hero, i);
    const ready = abilityReady(world, hero, i);
    const family = fxStyle(def.key || def.name);
    // 阿哈利姆神杖:持杖且该技能有升级时,洋红高亮 + ✦ 徽标
    const aghs = !!(def.scepter || def.scepterPassive);
    const scepterOn = aghs && hasScepter(hero);
    const shardOn = !!def.shard && hasShard(hero);
    const badges = buildAbilitySlotBadges(def, {
      learned: lvl > 0,
      scepterOn,
      shardOn,
      autocastOn: inst.autocastOn,
      toggleOn: inst.toggleOn,
    });
    const border = scepterOn ? '#d56bff' : shardOn ? '#5fd0d0' : learnable ? '#ffd54f' : lvl > 0 ? (ready || passive ? '#7fae4a' : '#5a6a3a') : '#2c3520';
    const bg = lvl > 0 ? (ready || passive ? '#2a3a18' : '#1d2412') : '#0d100a';
    const flash = ux?.hudFlashFor(`ability-${i}`, world.time);
    const flashShadow = flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' : '';
    const pips = Array.from({ length: def.maxLevel }, (_, k) =>
      `<span style="width:6px;height:4px;border-radius:1px;background:${k < lvl ? '#ffd54f' : '#3a4428'}"></span>`).join('');
    const title = buildAbilitySlotTitle(def, {
      level: lvl,
      passive,
      learnable,
      autocastOn: lvl > 0 && def.tags.includes('autocast') ? inst.autocastOn === true : undefined,
      toggleOn: lvl > 0 && def.tags.includes('toggle') ? inst.toggleOn === true : undefined,
      cooldownRemaining: Math.max(0, inst.cooldownUntil - world.time),
      manaCost: lvl > 0 ? mana : 0,
      currentMana: hero.mp,
      scepterDesc: aghs && def.scepter?.desc ? def.scepter.desc : undefined,
      scepterAvailable: aghs && !def.scepter?.desc,
      shardDesc: def.shard?.desc,
    });
    const status = abilityStatusBroadcastLabel({
      name: def.name,
      hotkey,
      learned: lvl > 0,
      passive,
      cooldownRemaining: Math.max(0, inst.cooldownUntil - world.time),
      manaCost: lvl > 0 ? mana : 0,
      currentMana: hero.mp,
      autocastOn: lvl > 0 && def.tags.includes('autocast') ? inst.autocastOn === true : undefined,
      toggleOn: lvl > 0 && def.tags.includes('toggle') ? inst.toggleOn === true : undefined,
    });
    const toggleable = lvl > 0 && (def.tags.includes('autocast') || def.tags.includes('toggle'));
    return `<div ${learnable ? `data-learn="${i}" ` : ''}${toggleable ? `data-ability-toggle="${i}" ` : ''}data-status-broadcast="${escapeAttr(status)}" title="${escapeAttr(title)}"
      style="position:relative;width:66px;height:66px;border:1.5px solid ${border};border-radius:4px;background:${bg};${learnable ? 'cursor:pointer;' : ''}
      display:flex;flex-direction:column;align-items:center;justify-content:center;${flashShadow}${lvl === 0 && !learnable ? 'opacity:.55;' : ''}">
      <span style="position:absolute;top:0;left:0;right:0;height:3px;border-radius:4px 4px 0 0;background:${family.color};box-shadow:0 0 6px ${family.glow}"></span>
      <span style="position:absolute;top:2px;left:4px;font-size:10px;color:#cfd8a0;font-weight:700">${hotkey}</span>
      ${this.abilityBadges(badges)}
      ${this.orbPrioritySlotBadge(orbPriority)}
      <div style="opacity:${lvl > 0 || learnable ? 1 : 0.45}">${abilityIconSvg(def)}</div>
      <div style="display:flex;gap:2px;margin-top:5px">${pips}</div>
      ${mana > 0 && lvl > 0 ? `<span style="position:absolute;bottom:2px;right:4px;font-size:9px;color:#5aa2ff">${mana}</span>` : ''}
      ${this.cooldownOverlay(cooldown, 18)}
      ${learnable ? `<span data-learn="${i}" style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);background:#ffd54f;color:#1a1a0a;font-size:12px;font-weight:800;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 8px #ffd54f">+</span>` : ''}
    </div>`;
  }

  private orbPriorityHtml(model: OrbPriorityModel): string {
    if (!model.visible) return '';
    const conflict = model.entries.some((entry) => entry.state === 'conflict');
    const p = conflict
      ? { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' }
      : { border: '#3f6f7d', bg: '#0d1a1f', fg: '#9edfff' };
    return `<div title="${escapeAttr(model.title)}" style="height:18px;max-width:292px;display:flex;align-items:center;gap:5px;border:1px solid ${p.border};border-radius:3px;background:${p.bg};color:${p.fg};padding:0 6px;box-sizing:border-box;font-size:9px;font-weight:900;white-space:nowrap;overflow:hidden;">
      <span style="flex:none;opacity:.78;">ORB</span>
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(model.summary.replace(/^ORB\s+/, ''))}</span>
    </div>`;
  }

  private orbPrioritySlotBadge(entry?: OrbPriorityEntry): string {
    if (!entry) return '';
    const tone: Record<OrbPriorityEntry['state'], { border: string; bg: string; fg: string }> = {
      primary: { border: '#5f8d43', bg: '#12210f', fg: '#9cff74' },
      conflict: { border: '#7b6a36', bg: '#211b0d', fg: '#ffd76a' },
      off: { border: '#5f3832', bg: '#1c1010', fg: '#ffb0a4' },
    };
    const p = tone[entry.state];
    return `<span title="${escapeAttr(entry.title)}" style="position:absolute;left:4px;bottom:14px;max-width:58px;height:12px;line-height:11px;border:1px solid ${p.border};border-radius:2px;background:${p.bg};color:${p.fg};font-size:7px;font-weight:900;padding:0 2px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${entry.label}</span>`;
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

  private itemSlot(
    world: World,
    hero: Unit,
    inst: ItemInstance | null,
    i: number,
    ux?: UxFeedback,
    logistics?: ItemSlotLogisticsModel,
  ): string {
    const flash = ux?.hudFlashFor(`item-${i}`, world.time);
    const isTp = i === 6; // 专属回城卷轴槽(第 7 格),热键 T
    const label = isTp ? 'T' : String(i + 1);
    const emptyBorder = isTp ? '#3a4a6a' : '#2c3520'; // TP 槽空时偏蓝,区分普通格
    const flashShadow =
      flash?.kind === 'reject' ? 'box-shadow:0 0 0 2px #ff3040 inset,0 0 10px #ff3040;' :
      flash?.kind === 'confirm' ? 'box-shadow:0 0 0 2px #d9b44a inset,0 0 10px #d9b44a;' :
      '';
    if (!inst) {
      const status = itemStatusBroadcastLabel({ hotkey: label, empty: true, cooldownRemaining: 0, hasActive: false });
      const title = buildEmptyItemSlotTitle({ hotkey: label, isTpSlot: isTp });
      return `<div data-status-broadcast="${escapeAttr(status)}" title="${escapeAttr(title)}" style="position:relative;width:64px;height:64px;border:1px solid ${flash?.kind === 'reject' ? '#ff3040' : emptyBorder};border-radius:4px;background:#0d100a;${flashShadow}
        font-size:10px;color:#555;display:flex;align-items:center;justify-content:center">
        <span style="position:absolute;top:2px;left:4px;color:${isTp ? '#6f8fbf' : '#777'}">${label}</span>
        ${isTp ? '<span style="font-size:9px;color:#3a4a6a">TP</span>' : ''}
      </div>`;
    }
    const def = itemDef(inst.itemKey);
    const cooldown = buildCooldownOverlayModel({ now: world.time, cooldownUntil: inst.cooldownUntil, totalCooldown: def.active?.cooldown ?? 0 });
    // 中立物品:琥珀边框 + 角标 ◈,与购买物品区分(DotA 中立物品视觉独特)
    const border = flash?.kind === 'reject' ? '#ff3040' : flash?.kind === 'confirm' ? '#d9b44a' : def.neutral ? '#e0813a' : '#5a6a3a';
    const logisticsStyle = this.itemLogisticsSlotStyle(logistics);
    const canBag = i < 6; // 主物品栏可点击移入背包栏(TP 槽除外)
    const act = def.active;
    const tip = buildItemSlotTitle({
      name: def.name,
      description: def.description,
      hotkey: label,
      active: act ? { manaCost: act.manaCost, cooldown: act.cooldown, castRange: act.castRange } : null,
      cooldownRemaining: Math.max(0, inst.cooldownUntil - world.time),
      backpackDelayRemaining: logistics?.backpackDelayRemaining,
      currentMana: hero.mp,
      charges: inst.charges,
      canBackpack: canBag,
    });
    const status = itemStatusBroadcastLabel({
      hotkey: label,
      name: def.name,
      hasActive: !!act,
      cooldownRemaining: Math.max(0, inst.cooldownUntil - world.time),
      backpackDelayRemaining: logistics?.backpackDelayRemaining,
      manaCost: act?.manaCost ?? 0,
      currentMana: hero.mp,
      charges: inst.charges,
    });
    return `<div ${canBag ? `data-bag="${i}" ` : ''}data-status-broadcast="${escapeAttr(status)}" title="${escapeAttr(logistics?.title ? `${tip}\n${logistics.title}` : tip)}" style="position:relative;width:64px;height:64px;border:1px solid ${logisticsStyle.border ?? border};border-radius:4px;
      background:${cooldown.active ? '#1a1a1a' : '#222b18'};font-size:11px;color:#cfd8a0;display:flex;flex-direction:column;cursor:${canBag ? 'pointer' : 'default'};
      align-items:center;justify-content:center;overflow:hidden;${cooldown.active ? 'opacity:.5;' : ''}${flashShadow}${logisticsStyle.shadow}">
      <span style="position:absolute;top:2px;left:4px;color:#d9b44a">${label}</span>
      ${def.neutral ? '<span title="中立物品" style="position:absolute;top:1px;right:3px;font-size:10px;color:#e0813a;font-weight:800;text-shadow:0 0 4px #e0813a">◈</span>' : ''}
      ${this.itemLogisticsBadges(logistics)}
      ${this.itemIcon(def.category)}
      ${inst.charges > 0 ? `<span style="position:absolute;bottom:1px;right:3px;font-size:10px;color:#ffd54f;font-weight:700">${inst.charges}</span>` : ''}
      ${this.cooldownOverlay(cooldown, 16)}
    </div>`;
  }

  /** 背包栏槽(后备栏,不提供加成;点击物品移入主物品栏,移入后 6 秒就绪)。 */
  private backpackSlot(inst: ItemInstance | null, j: number, logistics?: ItemSlotLogisticsModel): string {
    if (!inst) {
      return `<div title="${escapeAttr(buildEmptyBackpackSlotTitle())}" style="width:44px;height:44px;border:1px dashed #3a3320;border-radius:3px;background:#0c0e08;"></div>`;
    }
    const def = itemDef(inst.itemKey);
    const tip = buildBackpackItemSlotTitle({ name: def.name, description: def.description, charges: inst.charges });
    const logisticsStyle = this.itemLogisticsSlotStyle(logistics);
    return `<div data-bagout="${j}" title="${escapeAttr(logistics?.title ? `${tip}\n${logistics.title}` : tip)}" style="position:relative;width:44px;height:44px;border:1px solid ${logisticsStyle.border ?? '#6a5a3a'};border-radius:3px;background:#1c1a12;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.78;${logisticsStyle.shadow}">
      ${this.itemLogisticsBadges(logistics)}
      ${this.itemIcon(def.category)}
      ${inst.charges > 0 ? `<span style="position:absolute;bottom:0;right:2px;font-size:9px;color:#caa84a;font-weight:700">${inst.charges}</span>` : ''}
    </div>`;
  }

  private itemLogisticsHtml(model: ItemLogisticsModel): string {
    const action = model.primaryAction.visible ? model.primaryAction : null;
    const emphasis = model.combineDetail || model.backpackDelayDetail || model.quickbuyDetail || action?.label || model.summary;
    const title = [action?.detail, model.summary].filter(Boolean).join('\n');
    const tone = model.canCombineNow
      ? { border: '#d9b44a', bg: '#2a230f', fg: '#ffe08a' }
      : model.quickbuyDetail
        ? { border: '#6f8fbf', bg: '#101827', fg: '#bcd6ff' }
        : action?.tone === 'ready'
          ? { border: '#4b7c42', bg: '#101a0d', fg: '#aee88b' }
          : action?.tone === 'busy'
            ? { border: '#7a6230', bg: '#211b0d', fg: '#ffe08a' }
        : { border: '#3a4428', bg: '#10130b', fg: '#cfc7a5' };
    return `<div data-item-logistics title="${escapeAttr(title)}" style="height:18px;border:1px solid ${tone.border};border-radius:3px;background:${tone.bg};color:${tone.fg};display:flex;align-items:center;gap:5px;padding:0 6px;box-sizing:border-box;font-size:9px;white-space:nowrap;overflow:hidden;">
      <b style="color:${tone.fg};font-size:9px;flex:none;">ITEMS</b>
      <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(emphasis)}</span>
    </div>`;
  }

  private itemLogisticsSlotStyle(logistics?: ItemSlotLogisticsModel): { border?: string; shadow: string } {
    if (logistics?.highlights.backpackDelay) {
      return { border: '#e0a84a', shadow: 'box-shadow:0 0 0 1px #e0a84a inset,0 0 10px #e0a84a66;' };
    }
    if (logistics?.highlights.combineReady) {
      return { border: '#d9b44a', shadow: 'box-shadow:0 0 0 1px #d9b44a inset,0 0 10px #d9b44a66;' };
    }
    if (logistics?.highlights.quickbuyComponent) {
      return { border: '#6f8fbf', shadow: 'box-shadow:0 0 0 1px #6f8fbf inset,0 0 8px #6f8fbf55;' };
    }
    return { shadow: '' };
  }

  private itemLogisticsBadges(logistics?: ItemSlotLogisticsModel): string {
    if (!logistics) return '';
    const badges = [
      logistics.highlights.backpackDelay
        ? { label: `${logistics.backpackDelayRemaining}s`, color: '#ffe0a0', border: '#e0a84a', title: 'Backpack ready delay' }
        : null,
      logistics.highlights.combineReady
        ? { label: 'C', color: '#ffe08a', border: '#d9b44a', title: 'Ready to combine' }
        : null,
      logistics.highlights.quickbuyComponent
        ? { label: 'Q', color: '#bcd6ff', border: '#6f8fbf', title: 'Quickbuy component' }
        : null,
    ].filter((badge): badge is { label: string; color: string; border: string; title: string } => !!badge);
    if (badges.length === 0) return '';
    return `<span style="position:absolute;top:1px;right:2px;z-index:2;display:flex;gap:2px;align-items:center;max-width:52px;overflow:hidden;justify-content:flex-end;">
      ${badges.map((badge) => `<span title="${badge.title}" style="min-width:11px;height:11px;line-height:11px;text-align:center;border:1px solid ${badge.border};border-radius:2px;background:#050806cc;color:${badge.color};font-size:${badge.label.length > 2 ? 6 : 7}px;font-weight:900;">${badge.label}</span>`).join('')}
    </span>`;
  }

  private cooldownOverlay(model: CooldownOverlayModel, fontSize: number): string {
    if (!model.active) return '';
    const ring = model.tone === 'readying'
      ? 'box-shadow:0 0 0 1px rgba(255,213,79,.45) inset,0 0 8px rgba(255,213,79,.35);'
      : '';
    return `<span data-cooldown-tone="${model.tone}" style="position:absolute;inset:0;border-radius:4px;background:conic-gradient(rgba(0,0,0,0.66) ${model.sweepDegrees}deg, rgba(0,0,0,0.12) 0);display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000;${ring}">${model.label}</span>`;
  }

  private abilityBadges(badges: AbilitySlotBadge[]): string {
    if (!badges.length) return '';
    const spans = badges.map((badge) => {
      const tone = abilityBadgeTone(badge.tone);
      return `<span data-ability-badge="${badge.key}" title="${badge.title}" style="height:11px;line-height:11px;padding:0 2px;border-radius:2px;background:${tone.bg};border:1px solid ${tone.border};color:${tone.color};font-size:${badge.label.length > 1 ? 6 : 8}px;font-weight:800;text-shadow:0 1px 1px #000">${badge.label}</span>`;
    }).join('');
    return `<span style="position:absolute;top:2px;right:3px;display:flex;gap:2px;align-items:center;max-width:44px;overflow:hidden;justify-content:flex-end">${spans}</span>`;
  }
}

function abilityBadgeTone(tone: AbilitySlotBadgeTone): { bg: string; border: string; color: string } {
  switch (tone) {
    case 'autocastOn': return { bg: '#233615', border: '#9fdf5f', color: '#e2ffc2' };
    case 'autocastOff': return { bg: '#251b14', border: '#8f6a42', color: '#d6b887' };
    case 'toggleOn': return { bg: '#18322c', border: '#54d6b7', color: '#c9fff2' };
    case 'toggleOff': return { bg: '#24262b', border: '#69717d', color: '#c8d0dc' };
    case 'orb': return { bg: '#1a2f32', border: '#63d0d8', color: '#b8fbff' };
    case 'ultimate': return { bg: '#302312', border: '#d9a441', color: '#ffd76a' };
    case 'scepter': return { bg: '#2b1836', border: '#d56bff', color: '#f0c5ff' };
    case 'shard': return { bg: '#1d2638', border: '#7aa7ff', color: '#c9dcff' };
    case 'passive':
    default:
      return { bg: '#182230', border: '#7ea0c8', color: '#c9ddf2' };
  }
}

function chatWheelTone(id: string): { bg: string; border: string; fg: string } {
  if (id === 'retreat' || id === 'careful' || id === 'missing') return { bg: '#1c1010', border: '#5f3832', fg: '#ffb0a4' };
  if (id === 'attack' || id === 'group') return { bg: '#12210f', border: '#5f8d43', fg: '#a7e87a' };
  if (id === 'ward') return { bg: '#0d1a1f', border: '#3f6f7d', fg: '#9edfff' };
  return { bg: '#211b0d', border: '#7b6a36', fg: '#ffd76a' };
}

function spectatorTimelineTone(tone: SpectatorTimelineEntry['tone']): { bg: string; border: string; fg: string } {
  switch (tone) {
    case 'kill': return { bg: '#1f1010', border: '#6b3838', fg: '#ffb0a4' };
    case 'structure': return { bg: '#211b0d', border: '#7b6a36', fg: '#ffd76a' };
    case 'courier': return { bg: '#101a21', border: '#3d6778', fg: '#a6e6ff' };
    case 'objective': return { bg: '#141325', border: '#574a8a', fg: '#d8c7ff' };
    case 'system':
    default:
      return { bg: '#11130f', border: '#3b3d35', fg: '#d8d0ae' };
  }
}

function spectatorControlTone(tone: SpectatorControlAction['tone']): { bg: string; border: string; fg: string } {
  switch (tone) {
    case 'active': return { bg: '#10201a', border: '#3f7b5f', fg: '#9fe8c0' };
    case 'danger': return { bg: '#260d0d', border: '#8a3434', fg: '#ffaaa0' };
    case 'disabled': return { bg: '#11130f', border: '#3b3d35', fg: '#8f8978' };
    case 'normal':
    default:
      return { bg: '#11180d', border: '#425331', fg: '#d8d0ae' };
  }
}

function tutorialCoachTone(tone: TutorialCoachModel['tone']): { bg: string; border: string; fg: string; action: string } {
  switch (tone) {
    case 'objective': return { bg: '#12210f', border: '#5f8d43', fg: '#a7e87a', action: '#d6ffb8' };
    case 'combat': return { bg: '#21120b', border: '#7a4d28', fg: '#ffcf7a', action: '#ffe0a0' };
    case 'logistics': return { bg: '#101827', border: '#5c78a8', fg: '#bcd6ff', action: '#d6e6ff' };
    case 'warning': return { bg: '#211b0d', border: '#7b6a36', fg: '#ffe08a', action: '#fff1b8' };
    case 'map':
    default:
      return { bg: '#0d1a0b', border: '#3f6f2a', fg: '#a8e07a', action: '#c7f0a8' };
  }
}

function teamCommunicationTone(tone: TeamCommunicationEntry['tone']): { bg: string; border: string; fg: string; source: string } {
  switch (tone) {
    case 'warning': return { bg: '#1d100c', border: '#7a3b2b', fg: '#ffb09a', source: '#ffd0c4' };
    case 'objective': return { bg: '#141325', border: '#574a8a', fg: '#d8c7ff', source: '#bca9ff' };
    case 'chat': return { bg: '#10201a', border: '#3f7b5f', fg: '#a6e8c2', source: '#8fd0ff' };
    case 'status':
    default:
      return { bg: '#11180d', border: '#425331', fg: '#d8d0ae', source: '#cfc7a5' };
  }
}

function escapeAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function worldDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function threatColor(indicator: ThreatEdgeIndicator): string {
  if (indicator.sourceColor) return indicator.sourceColor;
  switch (indicator.dominantType) {
    case 'magical': return '#8a7dff';
    case 'pure': return '#e8e8e8';
    case 'physical':
    default:
      return '#e0673a';
  }
}

function threatEdgeStyle(edge: ThreatEdge): string {
  switch (edge) {
    case 'top': return 'top:8px;left:30%;right:30%;height:8px;';
    case 'bottom': return 'bottom:184px;left:30%;right:30%;height:8px;';
    case 'left': return 'left:6px;top:22%;bottom:26%;width:8px;';
    case 'right': return 'right:6px;top:22%;bottom:26%;width:8px;';
  }
}

function courierTask(orderType: string | undefined, stashItems: number): CourierLogisticsInput['task'] {
  if (orderType === 'move') return stashItems > 0 ? 'delivering' : 'returning';
  if (orderType === 'hold' || orderType === 'stop') return 'idle';
  return 'idle';
}
