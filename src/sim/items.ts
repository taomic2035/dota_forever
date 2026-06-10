/** 物品系统 —— M4 实装,此处先定骨架类型。 */

export interface ItemInstance {
  itemKey: string;
  charges: number;
  cooldownUntil: number;
}
