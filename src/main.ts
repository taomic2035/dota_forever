/** 入口:主菜单 或 对局(由 URL 参数决定)。 */
import { GameMap, Team } from './sim/map';
import type { World } from './sim/world';
import { createWorld } from './sim/setup';
import { spawnHero, tryBuyback } from './sim/hero';
import { installBotAI } from './sim/ai/bots';
import { HEROES, heroByKey } from './data/heroes';
import type { Unit } from './sim/unit';
import { shuffledHeroPool } from './sim/draft';
import { activateGlyph } from './sim/glyph';
import { pickUnitAt, PICK_RADIUS } from './sim/pick';
import { isVisibleTo } from './sim/vision';
import { Camera } from './render/camera';
import { Renderer } from './render/renderer';
import { Renderer3D } from './render3d/renderer3d';
import { MiniMap } from './render/minimap';
import { GameLoop } from './engine/loop';
import { InputManager, type CastInputOptions } from './engine/input';
import { Hud } from './ui/hud';
import { KillFeed } from './ui/killfeed';
import { Announce } from './ui/announce';
import { ShopPanel } from './ui/shop';
import { EndScreen } from './ui/endscreen';
import { Scoreboard } from './ui/scoreboard';
import { InspectPanel } from './ui/inspectPanel';
import { showMenu, createPauseMenu } from './ui/menu';
import { showOnboarding } from './ui/onboarding';
import { showHero3DPreview } from './ui/hero3dPreview';
import { showResource3DPreview } from './ui/resource3dPreview';
import { useItem, itemUseReason, itemInSlot, moveToBackpack, moveFromBackpack, makeItem } from './sim/items';
import { learnAbility, learnStatBonus, abilityCastReason } from './sim/abilities';
import { itemDef } from './data/items';
import { AudioDirector } from './audio/director';
import { UxFeedback } from './ui/uxFeedback';
import { CommandCursor } from './ui/commandCursor';
import {
  DEFAULT_CONTROL_SETTINGS,
  normalizeControlSettings,
  parseCameraPanSpeed,
  parseCastInputMode,
  type ControlSettings,
} from './engine/controlSettings';
import {
  findFilteredTarget,
  targetFilterRejectReason,
  type TargetKindFilter,
  type TargetTeamFilter,
} from './engine/targetFilters';
import { resolveSelfCastTarget, targetTeamAllowsSelfCast } from './engine/selfCast';
import { cursorTargetHintFor } from './ui/cursorTargetHint';

const params = new URLSearchParams(location.search);
const app = document.getElementById('app')!;
app.addEventListener('contextmenu', (e) => e.preventDefault());
const CONTROL_SETTINGS_KEY = 'dotaForever.controlSettings.v1';

const modeParam = params.get('mode');
if (modeParam === 'hero3d-preview') {
  showHero3DPreview(app);
} else if (modeParam === 'resource3d-preview') {
  showResource3DPreview(app);
} else if (!modeParam) {
  showMenu(app);
} else {
  startGame(modeParam as 'play' | 'spectate');
}

function loadControlSettings(params: URLSearchParams): ControlSettings {
  let stored: unknown = DEFAULT_CONTROL_SETTINGS;
  try {
    const raw = localStorage.getItem(CONTROL_SETTINGS_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = DEFAULT_CONTROL_SETTINGS;
  }
  const base = normalizeControlSettings(stored);
  const abilityCasts = base.abilityCasts.slice();
  const itemCasts = base.itemCasts.slice();
  ['abilityQ', 'abilityW', 'abilityE', 'abilityR'].forEach((key, index) => {
    applyCastOverrideParam(abilityCasts, index, params.get(key));
  });
  ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'].forEach((key, index) => {
    applyCastOverrideParam(itemCasts, index, params.get(key));
  });
  return normalizeControlSettings({
    ...base,
    abilityCast: parseCastInputMode(params.get('abilityCast')) ?? base.abilityCast,
    itemCast: parseCastInputMode(params.get('itemCast')) ?? base.itemCast,
    abilityCasts,
    itemCasts,
    cameraEdgePan: parseBooleanParam(params.get('edgePan')) ?? base.cameraEdgePan,
    cameraPanSpeed: parseCameraPanSpeed(params.get('cameraSpeed')) ?? base.cameraPanSpeed,
  });
}

function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'on') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'off') return false;
  return undefined;
}

function applyCastOverrideParam(
  overrides: ControlSettings['abilityCasts'],
  index: number,
  value: string | null,
): void {
  if (value === null) return;
  if (value.toLowerCase() === 'auto') {
    overrides[index] = undefined;
    return;
  }
  const mode = parseCastInputMode(value);
  if (mode) overrides[index] = mode;
}

function saveControlSettings(settings: ControlSettings): void {
  try {
    localStorage.setItem(CONTROL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in embedded or privacy-restricted contexts.
  }
}

function startGame(mode: 'play' | 'spectate'): void {
  // 默认种子取一次熵源后即固定;外显出来,以便复现一局(?seed=<值>)。
  const seed = Number(params.get('seed') ?? Math.floor(Math.random() * 1e9));
  console.info(`[dota-forever] seed=${seed} (replay with ?seed=${seed})`);
  const speedRaw = Number(params.get('speed') ?? 1);
  const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? speedRaw : 1; // 防 ?speed=NaN/负数 冻结模拟
  const heroKey = params.get('hero') ?? 'rein';

  const map = new GameMap();
  const world: World = createWorld(map, { seed, creeps: true });

  // 阵容:每队 5 人(玩家占晨曦一个位置,其余为 bot)。
  // bot 英雄按对局种子随机抽取、全程不重复(DotA 一局英雄唯一,不镜像),覆盖全 112 阵容;
  // 用独立 Rng 实例洗牌(不触碰 world.rng,保持 sim 随机流确定性),?seed 可复现同一阵容。
  let hero: Unit | undefined;
  if (mode === 'play') {
    hero = spawnHero(world, heroByKey(heroKey) ?? HEROES[0], Team.Dawn);
    hero.tpSlot = makeItem('tp'); // 起始回城卷轴(玩家便利,对症「无法回城」)
  }
  const draft = shuffledHeroPool(HEROES, seed, hero?.heroDef?.key);
  let picked = 0;
  for (const team of [Team.Dawn, Team.Night]) {
    const botCount = team === Team.Dawn && hero ? 4 : 5;
    for (let i = 0; i < botCount; i++) {
      spawnHero(world, draft[picked++], team);
    }
  }
  installBotAI(world, (id) => hero?.id === id);

  const camera = new Camera();
  camera.centerOn(hero?.pos ?? { x: 7520, y: 7520 });
  const use3d = params.get('renderer') === '3d';
  const renderer3d = use3d ? new Renderer3D(app, world, camera) : null;
  const renderer = renderer3d
    ? (renderer3d as unknown as Renderer)
    : new Renderer(app, world, camera);
  renderer.viewerTeam = mode === 'play' ? Team.Dawn : null;
  const hud = new Hud(app);
  hud.onLearn = (i) => { if (hero?.alive) learnAbility(world, hero, i); };
  hud.onLearnStat = () => { if (hero?.alive) learnStatBonus(hero); };
  hud.onBuyback = () => { if (hero && !hero.alive) tryBuyback(world, hero); };
  hud.onSell = (s) => { if (hero?.alive) shop.sellSlot(world, hero, s); }; // 右键库存物品出售(50% 返还,商店范围内)
  hud.onMoveToBackpack = (s) => { if (hero?.alive) moveToBackpack(world, hero, s); };
  hud.onMoveFromBackpack = (s) => { if (hero?.alive) moveFromBackpack(world, hero, s); };
  const killfeed = new KillFeed(app);
  const announce = new Announce(app); // 公屏播报:一血/连杀里程碑
  const shop = new ShopPanel(app);
  const endScreen = new EndScreen(app);
  const scoreboard = new Scoreboard(app);
  const ux = new UxFeedback();
  if (hero) ux.selectUnit(hero.id); // 开局默认选中受控英雄(选中环 + 默认信息)
  const inspectPanel = new InspectPanel(app);
  const commandCursor = new CommandCursor(app);
  // 小地图:2D/3D 均启用(MiniMap 投影世界坐标,与渲染器无关;补审计「3D 无小地图」缺口)
  const minimap = new MiniMap(app, renderer.terrain, camera, (wx, wy) => {
    ux.addWorldPulse({ kind: 'ping', pos: { x: wx, y: wy }, time: world.time });
  }, (wx, wy) => {
    if (!hero?.alive) return;
    const pos = map.nearestWalkable({ x: wx, y: wy });
    hero.issueOrder({ type: 'move', pos });
    ux.addWorldPulse({ kind: 'move', pos, time: world.time });
  });
  const audio = new AudioDirector();
  let controlSettings = loadControlSettings(params);
  let input: InputManager | null = null;
  const setControlSettings = (settings: ControlSettings) => {
    controlSettings = normalizeControlSettings(settings);
    saveControlSettings(controlSettings);
    input?.setControlSettings(controlSettings);
  };
  const pauseMenu = createPauseMenu(app, () => { loop.paused = !loop.paused; }, {
    getSettings: () => controlSettings,
    onChange: setControlSettings,
    getVolume: () => audio.volume,
    setVolume: (v) => audio.setVolume(v),
  });

  type RejectReason =
    | 'dead'
    | 'not-learned'
    | 'passive'
    | 'cooldown'
    | 'no-mana'
    | 'silenced'
    | 'empty-slot'
    | 'no-active'
    | 'no-charges'
    | 'invalid-target'
    | 'wrong-team'
    | 'wrong-target-type'
    | 'blocked';
  const rejectLabel: Record<RejectReason, string> = {
    dead: '英雄已死亡',
    'not-learned': '未学习',
    passive: '被动技能',
    cooldown: '冷却中',
    'no-mana': '法力不足',
    silenced: '被沉默',
    'empty-slot': '空槽位',
    'no-active': '无主动效果',
    'no-charges': '无充能',
    'invalid-target': '无效目标',
    'wrong-team': '目标阵营错误',
    'wrong-target-type': '目标类型错误',
    blocked: '无法使用',
  };
  const showReject = (reason: RejectReason, pos: { x: number; y: number }, hudKey?: string) => {
    if (hudKey) ux.flashHudSlot(hudKey, 'reject', world.time);
    ux.setCommandMessage({ kind: 'reject', label: rejectLabel[reason], time: world.time, color: '#ff3040' });
    ux.addWorldPulse({ kind: 'reject', pos, time: world.time });
    audio.reject(); // 听觉拒绝反馈(自带限频),避免战斗特效淹没文字提示
  };
  const orderPulseKind = (kind: 'move' | 'attack' | 'attackmove' | 'ping', options?: CastInputOptions) =>
    options?.queued ? 'queued' : kind;
  const issueHeroOrder = (
    order: Parameters<Unit['issueOrder']>[0],
    pulse: { kind: 'move' | 'attack' | 'attackmove' | 'ping'; pos: { x: number; y: number }; targetId?: number },
    options?: CastInputOptions,
    unit: Unit | undefined = hero, // 移动/攻击可路由到选中的己方可控单位(召唤物/信使);技能/物品仍用 hero
  ) => {
    if (!unit) return;
    if (options?.queued) unit.queueOrder(order);
    else unit.issueOrder(order);
    ux.addWorldPulse({ kind: orderPulseKind(pulse.kind, options), pos: pulse.pos, targetId: pulse.targetId, time: world.time });
    // 指令确认音(移动/攻击);cast 用 'ping',其施法音由 cast_done 事件给出,此处不重复
    if (pulse.kind !== 'ping') audio.command(pulse.kind === 'attack');
  };
  // 多单位操控:选中"己方可控单位"(英雄/其召唤物/信使)时,移动/攻击/停/守路由到它;否则回落英雄(常规游玩零改变)。
  const isControllable = (u: Unit | undefined): u is Unit =>
    !!u && u.alive && u.team === hero?.team && (u.id === hero?.id || u.summonOwnerId === hero?.id || u.kind === 'courier');
  const commandUnit = (): Unit | undefined => {
    const sel = ux.selectedUnitId ? world.getUnit(ux.selectedUnitId) : undefined;
    return isControllable(sel) ? sel : hero;
  };

  // 拒绝原因由 sim 单一裁决(见 sim/abilities.abilityCastReason),UX 仅做文案映射,杜绝漂移。
  const castRejectReason = (i: number): RejectReason | null =>
    hero ? abilityCastReason(world, hero, i) : 'dead';

  const castInfo = (i: number) => {
    if (castRejectReason(i)) return null;
    if (!hero) return null;
    const def = hero.heroDef?.abilities[i];
    const inst = hero.abilities[i];
    if (!def || !inst) return null;
    const range = def.castRange?.[Math.max(0, inst.level - 1)] ?? 700;
    return { def, inst, range };
  };

  const targetAt = (
    p: { x: number; y: number },
    filter?: TargetTeamFilter,
    kindFilter?: TargetKindFilter,
  ) => {
    if (!hero) return undefined;
    return findFilteredTarget(
      (pos, radius, pred) => world.queryRadius(pos, radius, pred),
      hero,
      p,
      90,
      filter,
      kindFilter,
    );
  };

  const hoverUnitAt = (p: { x: number; y: number }) => {
    const targets = world.queryRadius(p, 90, (unit) => unit.alive);
    targets.sort((a, b) => {
      const adx = a.pos.x - p.x;
      const ady = a.pos.y - p.y;
      const bdx = b.pos.x - p.x;
      const bdy = b.pos.y - p.y;
      return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
    });
    return targets[0];
  };

  const targetFilterReject = (
    p: { x: number; y: number },
    filter?: TargetTeamFilter,
    kindFilter?: TargetKindFilter,
  ): RejectReason => {
    if (!hero) return 'invalid-target';
    const candidate = hoverUnitAt(p);
    if (!candidate) return 'invalid-target';
    const reason = targetFilterRejectReason(hero, candidate, filter, kindFilter);
    if (reason === 'team') return 'wrong-team';
    if (reason === 'kind') return 'wrong-target-type';
    return 'invalid-target';
  };

  const selfTarget = (
    filter?: TargetTeamFilter,
    kindFilter?: TargetKindFilter,
  ) => (hero ? resolveSelfCastTarget(hero, filter, kindFilter) : undefined);

  const selfCastReject = (
    filter?: TargetTeamFilter,
    kindFilter?: TargetKindFilter,
  ): RejectReason => {
    if (!hero) return 'invalid-target';
    return targetTeamAllowsSelfCast(filter) && !selfTarget(filter, kindFilter)
      ? 'wrong-target-type'
      : 'wrong-team';
  };

  const previewCast = (i: number, p: { x: number; y: number }) => {
    const info = castInfo(i);
    if (!hero || !info) return false;
    const mode = info.def.targetMode === 'unit' ? 'unit' : 'area';
    const target = mode === 'unit' ? targetAt(p, info.def.targetTeam, info.def.targetKind) : null;
    const valid = mode === 'unit' ? !!target : true;
    ux.setTargeting({
      abilityIndex: i,
      mode,
      origin: hero.pos,
      cursor: p,
      range: info.range,
      radius: mode === 'area' ? 220 : undefined,
      valid,
    });
    return valid;
  };

  const itemInfo = (slot: number) => {
    if (itemRejectReason(slot)) return null;
    if (!hero) return null;
    const inst = itemInSlot(hero, slot);
    if (!inst) return null;
    const def = itemDef(inst.itemKey);
    const active = def.active;
    if (!active) return null;
    return { inst, def, active, range: active.castRange ?? 700 };
  };

  function itemRejectReason(slot: number): RejectReason | null {
    return hero ? itemUseReason(world, hero, slot) : 'dead';
  }

  const itemUseFailureReason = (slot: number): RejectReason => {
    const reason = itemRejectReason(slot);
    if (reason) return reason;
    const inst = hero ? itemInSlot(hero, slot) : null;
    if (inst) {
      const def = itemDef(inst.itemKey);
      if (def.rechargeable && inst.charges <= 0) return 'no-charges';
    }
    return 'blocked';
  };

  const previewItem = (slot: number, p: { x: number; y: number }) => {
    const info = itemInfo(slot);
    if (!hero || !info) return false;
    const mode = info.active.targetMode === 'unit' ? 'unit' : 'area';
    const target = mode === 'unit' ? targetAt(p, info.active.targetTeam, info.active.targetKind) : null;
    const valid = mode === 'unit' ? !!target : true;
    ux.setTargeting({
      abilityIndex: -1,
      source: 'item',
      itemSlot: slot,
      mode,
      origin: hero.pos,
      cursor: p,
      range: info.range,
      radius: mode === 'area' ? 180 : undefined,
      valid,
    });
    return valid;
  };

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b' && hero && !hero.alive) tryBuyback(world, hero);
    if (e.key === 'Escape' && !ux.targeting) pauseMenu.toggle();
  });

  input = new InputManager(renderer.canvas, camera, {
    onRightClick(p, options?: CastInputOptions) {
      if (!hero?.alive) return;
      ux.clearCursorIntent();
      const u = commandUnit(); // 选中己方召唤物/信使时指令归它,否则英雄
      // 统一容差 PICK_RADIUS(与左键/悬停一致,使悬停红圈准确预测右键目标)+ 迷雾门控(不可攻击雾中看不见的敌人)+ 取最近敌方
      const cands = world.queryRadius(p, PICK_RADIUS, (uu) => uu.alive && uu.team !== hero!.team && !uu.invulnerable && isVisibleTo(world, hero!.team, uu));
      cands.sort((a, b) => ((a.pos.x - p.x) ** 2 + (a.pos.y - p.y) ** 2) - ((b.pos.x - p.x) ** 2 + (b.pos.y - p.y) ** 2));
      const target = cands[0];
      if (target) {
        issueHeroOrder(
          { type: 'attack', targetId: target.id },
          { kind: 'attack', pos: target.pos, targetId: target.id },
          options, u,
        );
      } else {
        const pos = map.nearestWalkable(p);
        issueHeroOrder({ type: 'move', pos }, { kind: 'move', pos }, options, u);
      }
    },
    onLeftClick(p) {
      ux.clearCursorIntent();
      // 左键查看:选中点击处最近的可见单位(英雄优先);点空地则回到受控英雄,永不丢失自己。
      const picked = pickUnitAt(world, hero?.team ?? null, p, PICK_RADIUS);
      if (picked) ux.selectUnit(picked.id);
      else if (hero) ux.selectUnit(hero.id);
      else ux.clearSelection();
    },
    onAttackMove(p, options?: CastInputOptions) {
      if (!hero?.alive) return;
      const u = commandUnit();
      const denyTarget = world.queryRadius(p, 60, (uu) => uu.team === hero!.team && uu.kind === 'creep' && uu.hp / uu.calc.maxHp < 0.5)[0];
      if (denyTarget) {
        issueHeroOrder(
          { type: 'attack', targetId: denyTarget.id },
          { kind: 'attack', pos: denyTarget.pos, targetId: denyTarget.id },
          options, u,
        );
      } else {
        const pos = map.nearestWalkable(p);
        issueHeroOrder({ type: 'attackmove', pos }, { kind: 'attackmove', pos }, options, u);
      }
    },
    onPrepareCast(i, p, options?: CastInputOptions) {
      const info = castInfo(i);
      if (!hero || !info) {
        if (hero) showReject(castRejectReason(i) ?? 'blocked', hero.pos, `ability-${i}`);
        return false;
      }
      ux.clearCommandMessage();
      if (info.def.targetMode === 'none') {
        issueHeroOrder({ type: 'cast', abilityIndex: i }, { kind: 'ping', pos: hero.pos }, options);
        ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
        ux.clearTargeting();
        return false;
      }
      if (options?.selfCast && info.def.targetMode === 'unit') return true;
      previewCast(i, p);
      return true;
    },
    onPreviewCast(i, p) {
      previewCast(i, p);
    },
    onCastKey(i, p, options?: CastInputOptions) {
      const info = castInfo(i);
      if (!hero || !info) {
        if (hero) showReject(castRejectReason(i) ?? 'blocked', hero.pos, `ability-${i}`);
        return false;
      }
      if (info.def.targetMode === 'point') {
        const pos = map.nearestWalkable(p);
        issueHeroOrder({ type: 'cast', abilityIndex: i, pos }, { kind: 'ping', pos }, options);
        ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
        ux.clearCommandMessage();
        ux.clearTargeting();
        return true;
      }
      if (info.def.targetMode === 'unit') {
        const target = options?.selfCast
          ? selfTarget(info.def.targetTeam, info.def.targetKind)
          : targetAt(p, info.def.targetTeam, info.def.targetKind);
        if (target) {
          issueHeroOrder(
            { type: 'cast', abilityIndex: i, targetId: target.id },
            { kind: 'ping', pos: target.pos, targetId: target.id },
            options,
          );
          ux.flashHudSlot(`ability-${i}`, 'confirm', world.time);
          ux.clearCommandMessage();
          ux.clearTargeting();
          return true;
        }
        if (options?.selfCast) {
          ux.clearTargeting();
          showReject(selfCastReject(info.def.targetTeam, info.def.targetKind), hero.pos, `ability-${i}`);
          return false;
        }
        previewCast(i, p);
        showReject(targetFilterReject(p, info.def.targetTeam, info.def.targetKind), p, `ability-${i}`);
        return false;
      }
      return true;
    },
    onPrepareItem(slot, p, options?: CastInputOptions) {
      const info = itemInfo(slot);
      if (!hero || !info) {
        if (hero) showReject(itemRejectReason(slot) ?? 'blocked', hero.pos, `item-${slot}`);
        return false;
      }
      ux.clearCommandMessage();
      if (info.active.targetMode === 'none') {
        const ok = useItem(world, hero, slot);
        ux.flashHudSlot(`item-${slot}`, ok ? 'confirm' : 'reject', world.time);
        if (ok) {
          ux.clearCommandMessage();
          ux.addWorldPulse({ kind: 'ping', pos: hero.pos, time: world.time });
          audio.itemUse();
        } else {
          showReject(itemUseFailureReason(slot), hero.pos, `item-${slot}`);
        }
        ux.clearTargeting();
        return false;
      }
      if (options?.selfCast && info.active.targetMode === 'unit') return true;
      previewItem(slot, p);
      return true;
    },
    onPreviewItem(slot, p) {
      previewItem(slot, p);
    },
    onItemKey(slot, p, options?: CastInputOptions) {
      const info = itemInfo(slot);
      if (!hero || !info) {
        if (hero) showReject(itemRejectReason(slot) ?? 'blocked', hero.pos, `item-${slot}`);
        return false;
      }
      if (info.active.targetMode === 'point') {
        const pos = map.nearestWalkable(p);
        const ok = useItem(world, hero, slot, pos);
        ux.flashHudSlot(`item-${slot}`, ok ? 'confirm' : 'reject', world.time);
        if (ok) {
          ux.clearCommandMessage();
          ux.addWorldPulse({ kind: 'ping', pos, time: world.time });
          ux.clearTargeting();
          audio.itemUse();
        } else {
          previewItem(slot, p);
          showReject(itemUseFailureReason(slot), pos, `item-${slot}`);
        }
        return ok;
      }
      if (info.active.targetMode === 'unit') {
        const target = options?.selfCast
          ? selfTarget(info.active.targetTeam, info.active.targetKind)
          : targetAt(p, info.active.targetTeam, info.active.targetKind);
        if (target) {
          const ok = useItem(world, hero, slot, undefined, target);
          ux.flashHudSlot(`item-${slot}`, ok ? 'confirm' : 'reject', world.time);
          if (ok) {
            ux.clearCommandMessage();
            ux.addWorldPulse({ kind: 'ping', pos: target.pos, targetId: target.id, time: world.time });
            ux.clearTargeting();
            audio.itemUse();
          } else {
            previewItem(slot, p);
            showReject(itemUseFailureReason(slot), target.pos, `item-${slot}`);
          }
          return ok;
        }
        if (options?.selfCast) {
          ux.clearTargeting();
          showReject(selfCastReject(info.active.targetTeam, info.active.targetKind), hero.pos, `item-${slot}`);
          return false;
        }
        previewItem(slot, p);
        showReject(targetFilterReject(p, info.active.targetTeam, info.active.targetKind), p, `item-${slot}`);
        return false;
      }
      return true;
    },
    onStop() {
      const u = commandUnit();
      if (u) { ux.addWorldPulse({ kind: 'stop', pos: u.pos, time: world.time }); audio.command(false); }
      u?.issueOrder({ type: 'stop' });
    },
    onHold() {
      const u = commandUnit();
      if (u) { ux.addWorldPulse({ kind: 'hold', pos: u.pos, time: world.time }); audio.command(false); }
      u?.issueOrder({ type: 'hold' });
    },
    onCenterHero() { if (hero) { camera.centerOn(hero.pos); camera.follow = true; } }, // 居中并重新锁定跟随
    onTogglePause() { loop.paused = !loop.paused; },
    onToggleScoreboard(s) { scoreboard.setVisible(s, world); },
    onToggleShop() { shop.toggle(); },
    onGlyph() { // 防御符文:己方建筑短时免疫;反馈激活/冷却(此前静默)
      if (!hero) return;
      if (activateGlyph(world, hero.team)) audio.command(false);
      else { ux.setCommandMessage({ kind: 'reject', label: '守护冷却中', time: world.time, color: '#ff3040' }); audio.reject(); }
    },

    onPointerMove(screen, worldPt) {
      ux.setCursorPosition(screen);
      // 悬停高亮:点取最近可见单位(排除自己),供渲染器画敌红/友绿轮廓 = 右键预期反馈
      const hov = pickUnitAt(world, hero?.team ?? null, worldPt, PICK_RADIUS);
      ux.hoverUnitId = hov && hov.id !== hero?.id ? hov.id : 0;
    },
    canSelfCast(i) {
      const info = castInfo(i);
      return !!hero && !!info && info.def.targetMode === 'unit';
    },
    canSelfItem(slot) {
      const info = itemInfo(slot);
      return !!hero && !!info && info.active.targetMode === 'unit';
    },
    onPendingAttackMove(active, options?: CastInputOptions) {
      if (active) {
        ux.setCursorIntent({
          kind: 'attackmove',
          label: options?.queued ? 'QUEUE A-MOVE' : 'A-MOVE',
          time: world.time,
          color: options?.queued ? '#8dff7a' : '#ffd45a',
          targetHint: 'attack',
        });
      } else {
        ux.clearTargeting();
        ux.clearCursorIntent();
      }
    },
    onPendingCast(i, options?: CastInputOptions) {
      if (i === null || !hero) {
        ux.clearTargeting();
        ux.clearCursorIntent();
      } else {
        const hotkey = ['Q', 'W', 'E', 'R'][i] ?? '?';
        const def = hero.heroDef?.abilities[i];
        ux.setCursorIntent({
          kind: 'cast',
          label: `${options?.queued ? 'QUEUE ' : ''}CAST ${hotkey}`,
          time: world.time,
          color: options?.queued ? '#8dff7a' : '#5aa2ff',
          targetHint: cursorTargetHintFor(def?.targetMode, def?.targetTeam),
        });
      }
    },
    onPendingItem(slot, options?: CastInputOptions) {
      if (slot === null || !hero) {
        ux.clearTargeting();
        ux.clearCursorIntent();
      } else {
        const info = itemInfo(slot);
        ux.setCursorIntent({
          kind: 'item',
          label: `${options?.queued ? 'QUEUE ' : ''}ITEM ${slot + 1}`,
          time: world.time,
          color: options?.queued ? '#8dff7a' : '#d9b44a',
          targetHint: cursorTargetHintFor(info?.active.targetMode, info?.active.targetTeam),
        });
      }
    },
  }, controlSettings, renderer3d ? (p) => renderer3d.screenToWorld(p.x, p.y) : undefined);

  const buildingAlertAt = new Map<number, number>(); // 建筑被攻击警报的每建筑限频(world.time)
  const loop = new GameLoop({
    step() {
      world.step();
      renderer.fx.consume(world, renderer.viewerTeam);
      killfeed.consume(world);
      audio.consume(world, hero);
      announce.consume(world, audio); // 公屏播报:一血/连杀里程碑(全局,含敌方预警)
      // 己方建筑被敌方英雄攻击 → 小地图 ping + 警报音(推塔/强杀预警;每建筑 6s 限频,小兵推塔不触发)
      if (hero) {
        for (const e of world.events) {
          if (e.kind !== 'unit_damaged') continue;
          const tgt = world.getUnit(e.unitId);
          if (!tgt?.isBuilding() || tgt.team !== hero.team) continue;
          const src = world.getUnit(e.sourceId);
          if (!src?.isHero() || src.team === hero.team) continue;
          if (world.time - (buildingAlertAt.get(tgt.id) ?? -Infinity) < 6) continue;
          buildingAlertAt.set(tgt.id, world.time);
          ux.addWorldPulse({ kind: 'ping', pos: tgt.pos, time: world.time });
          audio.alert();
        }
      }
    },
    render(alpha) {
      renderer.alpha = alpha;
      input!.update(16.7);
      ux.altInfo = input?.altDown ?? false; // 按住 Alt:信息层(塔攻击范围)
      if (camera.follow && hero) camera.centerOn(hero.pos); // 镜头跟随英雄(平移会暂停)
      // 选择校正:选中目标已死/进雾(且非受控英雄)→ 回到英雄,避免信息面板停留在失效目标
      if (ux.selectedUnitId && (!hero || ux.selectedUnitId !== hero.id)) {
        const sel = world.getUnit(ux.selectedUnitId);
        const visible = !!sel && sel.alive && (hero == null || isVisibleTo(world, hero.team, sel));
        if (!visible) ux.selectUnit(hero?.id ?? 0);
      }
      renderer.render(world, ux.selectedUnitId || hero?.id || -1, ux);
      hud.update(world, hero, ux);
      inspectPanel.update(world, hero, ux); // 选中非受控单位时显示其信息卡
      announce.update(); // 公屏播报淡出
      commandCursor.update(world.time, ux);
      shop.update(world, hero);
      minimap?.render(world, renderer.viewerTeam, ux);
      endScreen.check(world, mode === 'play' ? Team.Dawn : null);
    },
  });
  loop.speed = speed;
  loop.start();
  if (mode === 'play') showOnboarding(app); // 操作引导(可关闭)

  window.__game = { world, hero, camera, loop, renderer, ux, seed };
}

declare global {
  interface Window {
    __game: { world: World; hero: Unit | undefined; camera: Camera; loop: GameLoop; renderer: Renderer; ux: UxFeedback; seed: number };
  }
}
