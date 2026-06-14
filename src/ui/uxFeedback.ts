import type { Vec2 } from '../core/vec2';

export type WorldPulseKind = 'move' | 'attack' | 'attackmove' | 'queued' | 'reject' | 'stop' | 'hold' | 'ping';
export type TargetingMode = 'point' | 'unit' | 'line' | 'area';
export type HudFlashKind = 'confirm' | 'reject' | 'learn' | 'cooldown';
export type CursorIntentKind = 'attackmove' | 'cast' | 'item';
export type CursorTargetHint = 'enemy' | 'ally' | 'allyOrSelf' | 'self' | 'ground' | 'any' | 'attack';
export type CommandMessageKind = 'reject';

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
  valid?: boolean;
  radius?: number;
  width?: number;
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
  cursorPosition: Vec2 | null = null;
  /** 左键选中的单位 id(0 = 无)。纯信息查看,不改变指令目标——右键/技能始终作用于受控英雄。 */
  selectedUnitId = 0;

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
  }

  clearTargeting(): void {
    this.targeting = null;
  }

  setCursorPosition(pos: Vec2): void {
    this.cursorPosition = { x: pos.x, y: pos.y };
  }

  selectUnit(id: number): void {
    this.selectedUnitId = id;
  }

  clearSelection(): void {
    this.selectedUnitId = 0;
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
