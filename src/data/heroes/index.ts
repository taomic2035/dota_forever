/**
 * 英雄注册表。全部为本项目原创英雄(名称/称号/技能文案均为原创,
 * 技能机制为经典 MOBA 原型的重新组合)。
 * M2 先注册 4 名英雄的基础面板,技能在 M3 实装。
 */
import type { HeroDef } from './types';

/** 雷恩·铁壁 —— 力量先手坦克 */
export const REIN: HeroDef = {
  key: 'rein',
  name: '雷恩',
  title: '铁壁卫士',
  primary: 'str',
  baseStr: 23, gainStr: 2.7,
  baseAgi: 15, gainAgi: 1.6,
  baseInt: 14, gainInt: 1.5,
  baseDamage: [27, 33],
  baseArmor: 2,
  baseMs: 300,
  attackRange: 128,
  projectileSpeed: 0,
  bat: 1.7,
  attackPoint: 0.4,
  color: '#c8a23c',
  glyph: '盾',
  abilities: [],
  aiRole: 'tank',
};

/** 霜语者·莉雅 —— 智力法系辅助 */
export const LIYA: HeroDef = {
  key: 'liya',
  name: '莉雅',
  title: '霜语者',
  primary: 'int',
  baseStr: 16, gainStr: 1.7,
  baseAgi: 16, gainAgi: 1.6,
  baseInt: 25, gainInt: 2.9,
  baseDamage: [23, 29],
  baseArmor: 1,
  baseMs: 280,
  attackRange: 600,
  projectileSpeed: 900,
  bat: 1.7,
  attackPoint: 0.45,
  color: '#7ec8e3',
  glyph: '霜',
  abilities: [],
  aiRole: 'support',
};

/** 雷霆先知·佐拉 —— 智力爆发法师 */
export const ZOLA: HeroDef = {
  key: 'zola',
  name: '佐拉',
  title: '雷霆先知',
  primary: 'int',
  baseStr: 19, gainStr: 1.8,
  baseAgi: 14, gainAgi: 1.2,
  baseInt: 26, gainInt: 3.0,
  baseDamage: [21, 27],
  baseArmor: 2,
  baseMs: 295,
  attackRange: 550,
  projectileSpeed: 1100,
  bat: 1.7,
  attackPoint: 0.45,
  color: '#5b7fe8',
  glyph: '雷',
  abilities: [],
  aiRole: 'ganker',
};

/** 疾风射手·艾莉 —— 敏捷远程核心 */
export const AILI: HeroDef = {
  key: 'aili',
  name: '艾莉',
  title: '疾风射手',
  primary: 'agi',
  baseStr: 17, gainStr: 1.9,
  baseAgi: 26, gainAgi: 2.9,
  baseInt: 15, gainInt: 1.4,
  baseDamage: [24, 30],
  baseArmor: 1,
  baseMs: 300,
  attackRange: 625,
  projectileSpeed: 1250,
  bat: 1.7,
  attackPoint: 0.4,
  color: '#8fd17a',
  glyph: '风',
  abilities: [],
  aiRole: 'carry',
};

export const HEROES: HeroDef[] = [REIN, LIYA, ZOLA, AILI];

export function heroByKey(key: string): HeroDef | undefined {
  return HEROES.find((h) => h.key === key);
}
