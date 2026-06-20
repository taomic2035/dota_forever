import type { Vec2 } from '../core/vec2';
import type { SelectionSnapshot } from '../engine/selection';
import type { CastStatus } from '../engine/castValidity';
import type { TargetPreviewModel, TargetPreviewShape } from '../engine/targetPreviewModel';

export type WorldPulseKind =
  | 'move'
  | 'attack'
  | 'attackmove'
  | 'queued'
  | 'reject'
  | 'stop'
  | 'hold'
  | 'ping'
  | 'dangerPing'
  | 'retreatPing';
export type TargetingMode = 'point' | 'unit' | 'line' | 'area';
export type HudFlashKind = 'confirm' | 'reject' | 'learn' | 'cooldown';
export type CursorIntentKind = 'move' | 'attackmove' | 'cast' | 'item';
export type CursorTargetHint = 'enemy' | 'ally' | 'allyOrSelf' | 'self' | 'ground' | 'any' | 'attack';
export type CommandMessageKind = 'reject' | 'alert' | 'info';

export interface WorldPulse {
  kind: WorldPulseKind;
  pos: Vec2;
  time: number;
  targetId?: number;
}

export interface TargetingState {
  abilityIndex: number;
  source?: 'ability' | 'item';
  itemSlot?: number;
  mode: TargetingMode;
  origin: Vec2;
  range: number;
  cursor?: Vec2;
  /** 兼容旧字段:status==='invalid' 时为 false。新代码优先用 status。 */
  valid?: boolean;
  /** 施法预览三态:ready 就绪 / walk 走近施法 / invalid 非法。 */
  status?: CastStatus;
  radius?: number;
  width?: number;
}

export interface TargetPreviewContext {
  abilityIndex: number;
  itemSlot?: number;
}

export interface SelectionBox {
  start: Vec2;
  end: Vec2;
}

interface HudFlash {
  key: string;
  kind: HudFlashKind;
  time: number;
}

export interface CursorIntent {
  kind: CursorIntentKind;
  label: string;
  time: number;
  ttl?: number;
  color?: string;
  targetHint?: CursorTargetHint;
}

export interface CommandMessage {
  kind: CommandMessageKind;
  label: string;
  time: number;
  ttl?: number;
  color?: string;
}

const WORLD_PULSE_LIFE = 0.55;
const HUD_FLASH_LIFE = 0.45;
const COMMAND_MESSAGE_LIFE = 0.85;

export class UxFeedback {
  private pulses: WorldPulse[] = [];
  private hudFlashes: HudFlash[] = [];
  private cursorIntent: CursorIntent | null = null;
  private commandMessage: CommandMessage | null = null;
  targeting: TargetingState | null = null;
  targetPreview: TargetPreviewModel | null = null;
  cursorPosition: Vec2 | null = null;
  selectionBox: SelectionBox | null = null;
  /** 当前主选单位 id(0 = 无)。保留兼容旧 HUD/渲染入口。 */
  selectedUnitId = 0;
  /** 当前选择集。包含可命令单位或 inspect-only 单位。 */
  selectedUnitIds: number[] = [];
  /** 当前可接收命令的选择集。敌方/不可控友军不会进入这里。 */
  commandableSelectedIds: number[] = [];
  /** 当前仅查看单位 id(0 = 无)。 */
  inspectUnitId = 0;
  /** 鼠标悬停的单位 id(0 = 无)。敌/友/中立轮廓高亮,提供右键预期(pre-click)反馈。 */
  hoverUnitId = 0;
  /** 按住 Alt 的信息层开关:显示防御塔攻击范围等战术信息(纯渲染)。 */
  altInfo = false;

  addWorldPulse(pulse: WorldPulse): void {
    this.pulses.push(pulse);
    if (this.pulses.length > 32) this.pulses.splice(0, this.pulses.length - 32);
  }

  worldPulsesAt(now: number): WorldPulse[] {
    this.pulses = this.pulses.filter((p) => now - p.time <= WORLD_PULSE_LIFE);
    return this.pulses;
  }

  setTargeting(state: TargetingState): void {
    this.targeting = state;
    this.targetPreview = null;
  }

  setTargetPreview(context: TargetPreviewContext, preview: TargetPreviewModel): void {
    this.targetPreview = preview;
    this.targeting = targetingStateFromPreview(context, preview);
  }

  clearTargeting(): void {
    this.targeting = null;
    this.targetPreview = null;
  }

  setCursorPosition(pos: Vec2): void {
    this.cursorPosition = { x: pos.x, y: pos.y };
  }

  selectUnit(id: number): void {
    this.selectedUnitId = id;
    this.selectedUnitIds = id ? [id] : [];
    this.commandableSelectedIds = [];
    this.inspectUnitId = 0;
  }

  clearSelection(): void {
    this.selectedUnitId = 0;
    this.selectedUnitIds = [];
    this.commandableSelectedIds = [];
    this.inspectUnitId = 0;
  }

  setSelectionSnapshot(snapshot: SelectionSnapshot): void {
    this.selectedUnitId = snapshot.primaryId;
    this.selectedUnitIds = [...snapshot.selectedIds];
    this.commandableSelectedIds = [...snapshot.commandableIds];
    this.inspectUnitId = snapshot.inspectId;
  }

  setSelectionBox(start: Vec2, end: Vec2): void {
    this.selectionBox = { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
  }

  clearSelectionBox(): void {
    this.selectionBox = null;
  }

  setCursorIntent(intent: CursorIntent): void {
    this.cursorIntent = { ...intent };
  }

  clearCursorIntent(): void {
    this.cursorIntent = null;
  }

  cursorIntentAt(now: number): CursorIntent | null {
    if (!this.cursorIntent) return null;
    if (this.cursorIntent.ttl !== undefined && now - this.cursorIntent.time > this.cursorIntent.ttl) {
      this.cursorIntent = null;
      return null;
    }
    return this.cursorIntent;
  }

  setCommandMessage(message: CommandMessage): void {
    this.commandMessage = { ...message };
  }

  clearCommandMessage(): void {
    this.commandMessage = null;
  }

  commandMessageAt(now: number): CommandMessage | null {
    if (!this.commandMessage) return null;
    const ttl = this.commandMessage.ttl ?? COMMAND_MESSAGE_LIFE;
    if (now - this.commandMessage.time > ttl) {
      this.commandMessage = null;
      return null;
    }
    return this.commandMessage;
  }

  flashHudSlot(key: string, kind: HudFlashKind, time: number): void {
    this.hudFlashes.push({ key, kind, time });
    if (this.hudFlashes.length > 24) this.hudFlashes.splice(0, this.hudFlashes.length - 24);
  }

  hudFlashFor(key: string, now: number): HudFlash | null {
    this.hudFlashes = this.hudFlashes.filter((f) => now - f.time <= HUD_FLASH_LIFE);
    for (let i = this.hudFlashes.length - 1; i >= 0; i--) {
      const flash = this.hudFlashes[i];
      if (flash.key === key) return flash;
    }
    return null;
  }
}

function targetingStateFromPreview(context: TargetPreviewContext, preview: TargetPreviewModel): TargetingState {
  return {
    abilityIndex: context.abilityIndex,
    source: preview.source,
    itemSlot: context.itemSlot,
    mode: targetingModeFromShape(preview.shape),
    origin: preview.origin,
    cursor: preview.aim,
    range: preview.rangeRing.radius,
    radius: preview.targetReticle.visible ? preview.targetReticle.radius : undefined,
    width: preview.line.visible ? preview.line.width : undefined,
    valid: preview.status !== 'invalid',
    status: preview.status,
  };
}

function targetingModeFromShape(shape: TargetPreviewShape): TargetingMode {
  if (shape.kind === 'area') return 'area';
  if (shape.kind === 'unit') return 'unit';
  if (shape.kind === 'line' || shape.kind === 'cone' || shape.kind === 'vector') return 'line';
  return 'point';
}
