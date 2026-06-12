/**
 * 特效视觉风格映射(纯逻辑,无 DOM):特效名 → 元素配色 + 运动原型。
 * 全部约 280 种技能/物品特效共用本表,由 fx.ts 据此程序化绘制。
 * 几何形态(环/光束/区域/点)由事件载荷(pos2/radius/duration)决定;
 * 本模块只负责"什么颜色"与"点状特效如何运动"。
 */

export type FxMotion = 'burst' | 'rise' | 'fall' | 'flash' | 'crack';
export type FxFamily =
  | 'poison'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'holy'
  | 'shadow'
  | 'blood'
  | 'nature'
  | 'earth'
  | 'arcane'
  | 'neutral';

export interface FxStyle {
  /** 主色(描边/填充) */
  color: string;
  /** 柔光 rgba */
  glow: string;
  /** 点状特效的运动方式 */
  motion: FxMotion;
  /** 元素家族,供 HUD/弹道/图标统一取色 */
  family: FxFamily;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseRgb(s: string): Rgb {
  if (s[0] === '#') {
    return {
      r: parseInt(s.slice(1, 3), 16),
      g: parseInt(s.slice(3, 5), 16),
      b: parseInt(s.slice(5, 7), 16),
    };
  }
  const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return { r: 220, g: 220, b: 220 };
}

/** 元素分类 → 主色。顺序即优先级(先匹配先得)。 */
const ELEMENT_TABLE: Array<{ keys: string[]; color: string; family: FxFamily }> = [
  // 毒/自然腐蚀(绿)——置于影系之前,nethertoxin 等取绿
  { keys: ['venom', 'poison', 'tox', 'miasma', 'plague', 'nox', 'goo', 'viper', 'corros'], color: '#5fd83a', family: 'poison' },
  // 火(橙红)
  { keys: ['fire', 'flame', 'flam', 'burn', 'scorch', 'pyre', 'ignite', 'meteor', 'ember', 'lava', 'firefly', 'icarus', 'sun', 'solar', 'phoenix', 'macro'], color: '#ff6a2a', family: 'fire' },
  // 霜/冰(青)
  { keys: ['frost', 'ice', 'cold', 'freez', 'glaci', 'snow', 'blizz', 'avalan', 'winter', 'chill', 'cryo'], color: '#52d4ff', family: 'frost' },
  // 雷电(黄)。避免裸 'arc'(会误吞 arcane);'light' 仅在此处用于 lightning
  { keys: ['lightning', 'thunder', 'static', 'storm', 'spark', 'overload', 'shock', 'volt', 'tempest', 'rollingthunder'], color: '#ffe23a', family: 'lightning' },
  // 圣/月/光(金白)
  { keys: ['holy', 'lumen', 'moon', 'lunar', 'celest', 'divine', 'guardian', 'purif', 'beam', 'illumin', 'eclipse', 'starf', 'starb', 'star', 'god', 'angel', 'rebuke'], color: '#ffd86b', family: 'holy' },
  // 影/虚空/死亡/灵魂(紫)
  { keys: ['shadow', 'dark', 'nether', 'void', 'death', 'grave', 'necro', 'soul', 'wraith', 'demon', 'doom', 'curse', 'hex', 'fiend', 'reaper', 'vendetta', 'phantasm', 'phantom', 'terror', 'nightmar', 'culling', 'black', 'eclipse'], color: '#b46cff', family: 'shadow' },
  // 血(深红)
  { keys: ['blood', 'sangu', 'rupture', 'sap', 'drain', 'siphon', 'leech', 'lifebreak'], color: '#e6324b', family: 'blood' },
  // 自然/林木(叶绿)
  { keys: ['nature', 'seed', 'sprout', 'overgrow', 'bramble', 'forest', 'wild', 'tree', 'living', 'attendant', 'spirits', 'wolf'], color: '#7ed957', family: 'nature' },
  // 地/岩/沙(土黄)
  { keys: ['quake', 'fissure', 'stone', 'boulder', 'sand', 'rock', 'earth', 'echoslam', 'avalan', 'epicenter', 'split', 'burrow', 'stomp', 'pulver', 'titan', 'anchor'], color: '#d6a85a', family: 'earth' },
  // 奥术/秘法(蓝)
  { keys: ['arcane', 'mana', 'mystic', 'ether', 'astral', 'magic', 'rift', 'flux', 'pulse', 'energy', 'psi', 'kinetic', 'vortex'], color: '#5aa2ff', family: 'arcane' },
];

const RISE_KEYS = ['heal', 'mek', 'attendant', 'bloodlust', 'enrage', 'rage', 'trueform', 'windrun', 'warcry', 'buff', 'empower', 'enchant', 'rally', 'inner', 'shield', 'armor', 'guard', 'repel', 'bkb', 'overcharge', 'chakra', 'surge', 'sprint', 'haste', 'trance', 'shroud', 'carapace', 'fortify', 'guise', 'phaseshift', 'aegis', 'reincarn', 'living', 'purify', 'restore', 'shieldcrash', 'replen', 'embrace', 'fortress'];
const FALL_KEYS = ['doom', 'hex', 'silence', 'curse', 'decrepify', 'enfeeble', 'cripple', 'manaburn', 'manavoid', 'fade', 'shackle', 'stasis', 'sleep', 'nightmare', 'demonicpurge', 'ancientseal', 'fatesedict', 'diabolicedict', 'smokescreen', 'glimpse', 'soulbind', 'prison', 'kineticfield', 'gleipnir'];
const FLASH_KEYS = ['blink', 'shadowstep', 'phaseshift', 'recall', 'relocate', 'tp_', 'shukuchi', 'shadowdance', 'stormstep', 'netherstrike', 'blinkstrike', 'leap', 'icarusdive', 'pounce', 'skewer', 'swap', 'timelapse', 'waveform', 'phaseboots', 'guise', 'permainvis', 'vendetta', 'shadowrealm'];
const CRACK_KEYS = ['echoslam', 'fissure', 'quake', 'avalan', 'boulder', 'stomp', 'epicenter', 'split', 'burrow', 'pulver', 'crush', 'ravage', 'shockwave', 'earthshock', 'titan', 'anchor', 'walruspunch', 'wave', 'sonicwave', 'shieldcrash', 'starbreaker'];

function matchAny(name: string, keys: string[]): boolean {
  for (const k of keys) if (name.includes(k)) return true;
  return false;
}

function elementOf(name: string): { color: string; family: FxFamily } {
  for (const e of ELEMENT_TABLE) if (matchAny(name, e.keys)) return { color: e.color, family: e.family };
  return { color: '#cfe8ff', family: 'neutral' }; // 兜底:淡蓝白
}

function motionOf(name: string): FxMotion {
  // 优先级:闪现 > 裂地 > 上升增益 > 下沉减益 > 爆发
  if (matchAny(name, FLASH_KEYS)) return 'flash';
  if (matchAny(name, CRACK_KEYS)) return 'crack';
  if (matchAny(name, RISE_KEYS)) return 'rise';
  if (matchAny(name, FALL_KEYS)) return 'fall';
  return 'burst';
}

function glowOf(color: string, alpha = 0.45): string {
  const { r, g, b } = parseRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

const CACHE = new Map<string, FxStyle>();

export function fxStyle(name: string): FxStyle {
  const cached = CACHE.get(name);
  if (cached) return cached;
  const n = name.toLowerCase();
  const element = elementOf(n);
  const style: FxStyle = {
    color: element.color,
    glow: glowOf(element.color),
    motion: motionOf(n),
    family: element.family,
  };
  CACHE.set(name, style);
  return style;
}
