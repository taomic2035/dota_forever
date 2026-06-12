/** 英雄与技能的数据契约。全部英雄为本项目原创角色。 */
import type { Vec2 } from '../../core/vec2';
import type { World } from '../../sim/world';
import type { Unit } from '../../sim/unit';
import type { ModifierDef } from '../../sim/modifiers';
import type { TargetKindFilter, TargetTeamFilter } from '../../sim/targeting';

export type TargetMode = 'none' | 'point' | 'unit' | 'passive';

export type AbilityTag =
  | 'nuke' | 'stun' | 'slow' | 'heal' | 'escape' | 'buff' | 'aoe' | 'channel' | 'orb' | 'ultimate';

export interface AiCastSuggestion {
  score: number;
  pos?: Vec2;
  targetId?: number;
}

export interface AbilityDef {
  key: string;
  name: string;
  maxLevel: number;
  ultimate?: boolean;
  targetMode: TargetMode;
  targetTeam?: TargetTeamFilter;
  targetKind?: TargetKindFilter;
  /** 按技能等级索引(长度=maxLevel) */
  castRange?: number[];
  manaCost?: number[];
  cooldown?: number[];
  /** 施法前摇(秒) */
  castPoint?: number;
  tags: AbilityTag[];
  description: string;
  /** 主动技能效果 */
  onCast?(w: World, caster: Unit, lvl: number, pos?: Vec2, target?: Unit): void;
  /** 被动:返回常驻 modifier */
  passiveModifier?(lvl: number): ModifierDef;
  /** 法球:普攻命中附加效果 */
  orbOnHit?(w: World, attacker: Unit, target: Unit, lvl: number): void;
  /** 引导型 */
  channel?: {
    duration: (lvl: number) => number;
    tickInterval: number;
    onChannelTick(w: World, caster: Unit, lvl: number, pos?: Vec2): void;
  };
  /** AI 释放建议:返回 null 表示此刻不放 */
  aiScore?(w: World, caster: Unit, lvl: number): AiCastSuggestion | null;
}

export interface HeroDef {
  key: string;
  name: string;
  title: string;
  primary: 'str' | 'agi' | 'int';
  baseStr: number; gainStr: number;
  baseAgi: number; gainAgi: number;
  baseInt: number; gainInt: number;
  /** 白字攻击(主属性另加) */
  baseDamage: [number, number];
  baseArmor: number;
  baseMs: number;
  attackRange: number;
  projectileSpeed: number;
  bat: number;
  attackPoint: number;
  color: string;
  /** 单字图腾(渲染识别用) */
  glyph: string;
  abilities: AbilityDef[];
  /** AI 定位:carry 吃线,support 让线,ganker 游走 */
  aiRole: 'carry' | 'support' | 'ganker' | 'tank';
}
