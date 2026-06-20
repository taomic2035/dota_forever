import type { AbilityDef } from '../data/heroes/types';
import { availabilityCurrentLine, buildAbilityAvailability } from './availabilityModel';

/**
 * 技能悬停 tooltip 文本(原生 title,跨 HUD 每帧重建可靠)。
 * 在名称/描述之外补 DotA tooltip 核心数值:当前等级的 法力 / 冷却 / 施法距离 / 范围。
 * 未学(lvl 0)预览 1 级数值并标注「1级」。
 */
export function buildAbilityTooltip(def: AbilityDef, lvl: number): string {
  const head = `${def.name}${def.ultimate ? ' (大招)' : ''}`;
  const idx = Math.max(0, (lvl > 0 ? lvl : 1) - 1);
  const at = (arr: number[] | undefined): number | undefined =>
    arr && arr.length ? arr[Math.min(arr.length - 1, idx)] : undefined;

  const parts: string[] = [];
  const mana = at(def.manaCost);
  if (mana) parts.push(`法力 ${mana}`);
  const cd = at(def.cooldown);
  if (cd) parts.push(`冷却 ${cd}s`);
  const usesRange = def.targetMode !== 'none' && def.targetMode !== 'passive';
  const range = at(def.castRange);
  if (range && usesRange) parts.push(`施法距离 ${range}`);
  const aoe = at(def.aoeRadius);
  if (aoe) parts.push(`范围 ${aoe}`);

  const statLine = parts.length ? `\n${parts.join(' · ')}${lvl > 0 ? '' : '(1级)'}` : '';
  const desc = def.description ? `\n${def.description}` : '';
  return `${head}${statLine}${desc}`;
}

export interface AbilitySlotTitleInput {
  level: number;
  passive?: boolean;
  learnable?: boolean;
  autocastOn?: boolean;
  toggleOn?: boolean;
  cooldownRemaining?: number;
  manaCost?: number;
  currentMana?: number;
  scepterDesc?: string;
  scepterAvailable?: boolean;
  shardDesc?: string;
}

export function buildAbilitySlotTitle(def: AbilityDef, input: AbilitySlotTitleInput): string {
  const lines = [buildAbilityTooltip(def, input.level)];
  const learned = input.level > 0;
  const tags = def.tags ?? [];
  if (learned && tags.includes('autocast')) {
    lines.push(`AUTO ${input.autocastOn === true ? 'ON' : 'OFF'}`);
    lines.push('QWER/右键切换自动施放');
  } else if (learned && tags.includes('toggle')) {
    lines.push(input.toggleOn === true ? 'ON' : 'OFF');
    lines.push('QWER/右键切换开关状态');
  } else if (learned) {
    const current = abilityCurrentStateLine(input);
    if (current) lines.push(current);
  }
  if (input.learnable) lines.push('点击学习(+)');
  if (input.scepterDesc) lines.push(input.scepterDesc);
  else if (input.scepterAvailable) lines.push('神杖:增强升级');
  if (input.shardDesc) lines.push(input.shardDesc);
  return lines.join('\n');
}

function abilityCurrentStateLine(input: AbilitySlotTitleInput): string | null {
  return availabilityCurrentLine(buildAbilityAvailability({
    learned: input.level > 0,
    passive: input.passive === true,
    cooldownRemaining: input.cooldownRemaining ?? 0,
    manaCost: input.manaCost ?? 0,
    currentMana: input.currentMana ?? Number.POSITIVE_INFINITY,
  }));
}
