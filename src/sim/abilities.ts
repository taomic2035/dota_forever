/** 技能系统 —— M3 实装,此处先定骨架类型。 */

export interface AbilityInstance {
  key: string;
  level: number;
  cooldownUntil: number;
}
