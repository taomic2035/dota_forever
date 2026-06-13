export const RESOURCE3D_CATEGORIES = [
  'lane_units',
  'neutral_units',
  'buildings',
  'items',
  'spell_fx',
  'map_props',
] as const;

export const RESOURCE3D_TEXTURE_CHANNELS = [
  'albedo',
  'normal',
  'orm',
  'emissive',
] as const;

export type Resource3DCategory = typeof RESOURCE3D_CATEGORIES[number];
export type Resource3DTextureChannel = typeof RESOURCE3D_TEXTURE_CHANNELS[number];
export type Resource3DMotion = 'idle' | 'pulse' | 'spin' | 'float' | 'impact' | 'ambient';
export type Resource3DPartKind =
  | 'base'
  | 'body'
  | 'head'
  | 'weapon'
  | 'plate'
  | 'banner'
  | 'ring'
  | 'orb'
  | 'beam'
  | 'prop';

export interface Resource3DPartSpec {
  name: string;
  kind: Resource3DPartKind;
  color: string;
  emissive?: string;
  scale: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
}

export interface Resource3DAssetSpec {
  key: string;
  name: string;
  category: Resource3DCategory;
  role: string;
  silhouette: string;
  motif: string;
  scale: number;
  palette: [string, string, string, string];
  textureChannels: readonly Resource3DTextureChannel[];
  previewMotion: Resource3DMotion;
  parts: Resource3DPartSpec[];
}

interface ResourceSeed {
  key: string;
  name: string;
  category: Resource3DCategory;
  role: string;
  silhouette: string;
  motif: string;
  palette: [string, string, string, string];
  motion: Resource3DMotion;
  scale?: number;
}

const seeds: ResourceSeed[] = [
  // Lane units
  seed('dawn_melee_creep', '晨曦战士', 'lane_units', '近战兵', 'round-shield-spearman', 'sun-shield', ['#c99a3b', '#f4d36a', '#6f4a20', '#ffe58a'], 'idle'),
  seed('night_melee_creep', '永夜武士', 'lane_units', '近战兵', 'crescent-blade-minion', 'moon-blade', ['#5b4aa0', '#a58cff', '#241c46', '#bba0ff'], 'idle'),
  seed('dawn_ranged_creep', '晨曦法师', 'lane_units', '远程兵', 'staff-robed-caster', 'sun-bolt', ['#d8b56a', '#fff0a8', '#5d4a28', '#ffe56b'], 'pulse', 0.92),
  seed('night_ranged_creep', '永夜巫师', 'lane_units', '远程兵', 'hooded-orb-caster', 'night-orb', ['#4658a8', '#91a8ff', '#171f48', '#7fa4ff'], 'pulse', 0.92),
  seed('dawn_siege_cart', '晨曦投石车', 'lane_units', '攻城车', 'low-catapult', 'wood-wheel', ['#8d6a3d', '#d8b76c', '#4d351d', '#ffd06c'], 'idle', 1.1),
  seed('night_siege_cart', '永夜投石车', 'lane_units', '攻城车', 'spiked-catapult', 'iron-wheel', ['#4d425c', '#8c7ab5', '#241c2e', '#be9cff'], 'idle', 1.1),
  seed('dawn_super_guard', '超级晨曦卫士', 'lane_units', '超级兵', 'tall-gold-guard', 'super-sun', ['#d6a13b', '#fff08b', '#5c3b18', '#fff2a8'], 'ambient', 1.08),
  seed('night_super_guard', '超级永夜卫士', 'lane_units', '超级兵', 'tall-violet-guard', 'super-moon', ['#5140a8', '#c1a4ff', '#1b153f', '#d2b9ff'], 'ambient', 1.08),
  seed('lane_banner_carrier', '军旗信使', 'lane_units', '功能兵', 'banner-runner', 'battle-banner', ['#68715b', '#d7c27a', '#282e24', '#f0d782'], 'float', 0.95),
  seed('lane_scout_wisp', '巡线灵火', 'lane_units', '视野样板', 'small-floating-wisp', 'lane-wisp', ['#65c7b7', '#c9fff5', '#1c4843', '#8effec'], 'float', 0.76),

  // Neutral units
  seed('neutral_wolf', '嚎风狼', 'neutral_units', '小营地', 'lean-wolf', 'wind-fang', ['#7f7a68', '#c5bea3', '#333228', '#d7f4ff'], 'idle', 0.88),
  seed('neutral_alpha_wolf', '嚎风头狼', 'neutral_units', '小营地首领', 'alpha-wolf-mane', 'alpha-fang', ['#9a8b6a', '#f2d59b', '#453821', '#ffe1a0'], 'ambient'),
  seed('neutral_lizard', '石脊蜥蜴', 'neutral_units', '中营地', 'low-spined-lizard', 'stone-spine', ['#6e8a76', '#b5d3b9', '#27382f', '#9dffbd'], 'idle', 0.9),
  seed('neutral_lizard_elder', '石脊长者', 'neutral_units', '中营地首领', 'elder-spined-lizard', 'elder-stone', ['#839c82', '#d2deb6', '#314234', '#cfff92'], 'ambient', 1.05),
  seed('neutral_troll', '岩肤巨魔', 'neutral_units', '大营地', 'hulking-club-troll', 'rock-club', ['#927b66', '#d3b18e', '#3e3329', '#ffc184'], 'idle', 1.12),
  seed('neutral_troll_priest', '巨魔祭司', 'neutral_units', '大营地法系', 'totem-priest', 'bone-totem', ['#77604a', '#d7c59d', '#2c241c', '#d7f28a'], 'pulse', 0.96),
  seed('neutral_ancient_turtle', '远古玄龟', 'neutral_units', '远古', 'shell-ancient', 'ancient-shell', ['#4e7776', '#b7ded6', '#182f32', '#8ff6e7'], 'ambient', 1.2),
  seed('neutral_turtle_king', '远古龟王', 'neutral_units', '远古首领', 'crowned-shell-king', 'ancient-crown', ['#557f78', '#f1d28b', '#18332f', '#fff0a8'], 'ambient', 1.28),
  seed('neutral_harpy', '峭壁鹰身', 'neutral_units', '飞行样板', 'winged-harpy', 'sky-feather', ['#647ca8', '#c7dbff', '#222b40', '#a8cfff'], 'float', 0.88),
  seed('neutral_satyr', '林地萨特', 'neutral_units', '法系样板', 'horned-satyr', 'forest-horn', ['#6c8b55', '#c1e28f', '#24381d', '#aaff88'], 'pulse', 0.96),

  // Buildings
  seed('tower_t1_dawn', '晨曦一塔', 'buildings', '防御塔', 'slender-gold-tower', 'tower-sun', ['#b68b38', '#f5d16a', '#4b3418', '#ffe27d'], 'ambient', 1.16),
  seed('tower_t1_night', '永夜一塔', 'buildings', '防御塔', 'slender-violet-tower', 'tower-moon', ['#57458e', '#b49cff', '#1e1734', '#c9aaff'], 'ambient', 1.16),
  seed('tower_t3_dawn', '晨曦高地塔', 'buildings', '高地塔', 'fortified-gold-tower', 'fort-sun', ['#c69b40', '#ffe08a', '#4c3418', '#fff0a2'], 'ambient', 1.24),
  seed('tower_t3_night', '永夜高地塔', 'buildings', '高地塔', 'fortified-violet-tower', 'fort-moon', ['#5c4aa2', '#c6adff', '#20183b', '#d0b9ff'], 'ambient', 1.24),
  seed('rax_melee', '近战兵营', 'buildings', '兵营', 'wide-melee-barracks', 'melee-gate', ['#80664c', '#cba071', '#32271d', '#ffbe7c'], 'idle', 1.18),
  seed('rax_ranged', '远程兵营', 'buildings', '兵营', 'arched-ranged-barracks', 'ranged-gate', ['#735b7c', '#c9a6d8', '#2b2130', '#e5b3ff'], 'idle', 1.18),
  seed('ancient_dawn', '晨曦主基地', 'buildings', '主基地', 'large-sun-ancient', 'ancient-sun', ['#d0a244', '#fff2a8', '#513b17', '#fff0a8'], 'ambient', 1.42),
  seed('ancient_night', '永夜主基地', 'buildings', '主基地', 'large-moon-ancient', 'ancient-moon', ['#4b3d91', '#cdb9ff', '#181431', '#d8c2ff'], 'ambient', 1.42),
  seed('fountain', '圣坛泉水', 'buildings', '泉水', 'glowing-fountain', 'fountain-pool', ['#3f8f97', '#bffaff', '#17383c', '#9ff3ff'], 'pulse', 1.2),
  seed('secret_shop_stall', '秘藏宝铺', 'buildings', '商店', 'canopy-shop', 'secret-shop', ['#7f5640', '#d9bd7e', '#2d2018', '#ffd782'], 'ambient', 1.05),

  // Items
  seed('item_blink', '闪烁匕首', 'items', '位移核心', 'short-blue-dagger', 'blink-rift', ['#3f79c8', '#b6d9ff', '#152b4a', '#8ec8ff'], 'float', 0.78),
  seed('item_phase_boots', '相位战靴', 'items', '鞋类', 'paired-boots', 'phase-step', ['#6b5342', '#d9b07a', '#2f2218', '#ffbf6b'], 'pulse', 0.82),
  seed('item_magic_wand', '魔力短杖', 'items', '消耗/充能', 'small-wand-star', 'wand-star', ['#5a70b8', '#d9e5ff', '#172149', '#a8c7ff'], 'float', 0.72),
  seed('item_radiance', '辉耀圣器', 'items', '光环武器', 'sun-relic', 'radiance-sun', ['#d89b35', '#ffe87c', '#4a2f10', '#fff1a0'], 'spin', 0.9),
  seed('item_black_king', '黑皇权杖', 'items', '免控核心', 'black-gold-scepter', 'king-scepter', ['#222222', '#d5aa54', '#070707', '#ffd46b'], 'ambient', 0.9),
  seed('item_linken', '林肯法球', 'items', '防护核心', 'blue-shield-orb', 'linken-shell', ['#4d75aa', '#b8d8ff', '#17283e', '#9ed3ff'], 'pulse', 0.86),
  seed('item_sheepstick', '妖术权杖', 'items', '控制核心', 'crooked-hex-staff', 'hex-curl', ['#6c4fb0', '#d4bdff', '#241945', '#d6b3ff'], 'float', 0.9),
  seed('item_aegis', '不朽之盾', 'items', '肉山奖励', 'winged-shield', 'aegis-wings', ['#b48638', '#fff1a8', '#473014', '#fff4be'], 'ambient', 0.9),
  seed('item_rapier', '圣剑', 'items', '终极武器', 'long-gold-blade', 'rapier-light', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'float', 0.95),
  seed('item_ward_obs', '视域守卫', 'items', '视野道具', 'observer-eye', 'observer-eye', ['#4f8b6f', '#c6ffe2', '#18362a', '#9affc9'], 'pulse', 0.74),

  // Spell and projectile FX
  seed('fx_attack_arrow', '普通箭矢', 'spell_fx', '投射物', 'thin-arrow-trail', 'arrow-trail', ['#b48c55', '#ffe1a6', '#3b2a18', '#ffd18a'], 'float', 0.78),
  seed('fx_frost_bolt', '霜冻弹', 'spell_fx', '冰系投射物', 'ice-bolt', 'frost-bolt', ['#6bc8df', '#dcfbff', '#153d4c', '#a8f4ff'], 'impact', 0.82),
  seed('fx_thunder_arc', '雷霆弧', 'spell_fx', '雷系特效', 'zigzag-lightning', 'lightning-arc', ['#5678e8', '#dce7ff', '#17265a', '#8fb4ff'], 'pulse', 0.9),
  seed('fx_quake_ring', '裂地震环', 'spell_fx', '地面范围', 'ground-crack-ring', 'quake-ring', ['#8f6e4b', '#ffd491', '#342419', '#ffb35d'], 'impact', 1.05),
  seed('fx_heal_sun', '晨光治疗', 'spell_fx', '治疗特效', 'sun-heal-ring', 'heal-sun', ['#d8b34a', '#fff7bc', '#42300f', '#fff08a'], 'pulse', 0.92),
  seed('fx_shadow_puff', '暗影烟雾', 'spell_fx', '暗影特效', 'purple-smoke-puff', 'shadow-puff', ['#7e57c2', '#d8b8ff', '#24172f', '#b896ff'], 'ambient', 0.9),
  seed('fx_hook_chain', '钩链轨迹', 'spell_fx', '链钩特效', 'chain-segment-line', 'hook-chain', ['#8d7b68', '#d6c1a0', '#2e261f', '#91d66d'], 'float', 0.98),
  seed('fx_fire_orb', '火焰法球', 'spell_fx', '火系投射物', 'ember-orb', 'fire-orb', ['#c85632', '#ffb26a', '#3d160e', '#ff7a3d'], 'pulse', 0.9),
  seed('fx_poison_cloud', '毒雾', 'spell_fx', '持续区域', 'green-cloud', 'poison-cloud', ['#6f9f54', '#c4ef88', '#1d3418', '#91d66d'], 'ambient', 1),
  seed('fx_tp_gate', '传送门', 'spell_fx', '传送特效', 'portal-ring', 'tp-gate', ['#3a8ca2', '#c5fbff', '#12343d', '#8ff6ff'], 'spin', 1.02),

  // Map props
  seed('prop_tree_green', '常青树', 'map_props', '树木', 'conifer-tree', 'pine-needle', ['#315f3b', '#83c777', '#16301d', '#9cff82'], 'ambient', 1),
  seed('prop_tree_dead', '枯木', 'map_props', '树木', 'dead-tree', 'dead-bark', ['#5d4a38', '#a98b68', '#251b13', '#d09b6c'], 'idle', 0.95),
  seed('prop_river_stone', '河道石', 'map_props', '地形石', 'river-rock', 'river-stone', ['#4b6570', '#a5c7d4', '#1a2c31', '#8fdcff'], 'idle', 0.8),
  seed('prop_lane_torch', '路口火炬', 'map_props', '导航装饰', 'torch-post', 'torch-flame', ['#674527', '#d89a4d', '#24150c', '#ff9a3d'], 'pulse', 0.9),
  seed('prop_rune_spot', '神符台', 'map_props', '神符点', 'rune-circle', 'rune-spot', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'ambient', 1),
  seed('prop_outpost', '前哨碑', 'map_props', '地图机制', 'outpost-obelisk', 'outpost-eye', ['#6b5a43', '#d6bd80', '#2e2518', '#ffe08a'], 'ambient', 1.08),
  seed('prop_cliff_flag', '高地旗', 'map_props', '高地标识', 'cliff-banner', 'cliff-flag', ['#69533c', '#d6a96f', '#2d2015', '#ffc979'], 'float', 0.92),
  seed('prop_jungle_mushroom', '荧光蘑菇', 'map_props', '野区装饰', 'glow-mushroom', 'mushroom-glow', ['#6d4e8f', '#d4b8ff', '#231638', '#c49cff'], 'pulse', 0.82),
  seed('prop_shop_crate', '商店货箱', 'map_props', '商店装饰', 'stacked-crates', 'shop-crate', ['#7c5a3a', '#c99861', '#2f2115', '#ffd08a'], 'idle', 0.9),
  seed('prop_ward_cliff', '眼位石台', 'map_props', '视野点', 'ward-cliff-pad', 'ward-cliff', ['#4f6b58', '#a8d9a8', '#1e3124', '#9affb2'], 'ambient', 0.9),
];

function seed(
  key: string,
  name: string,
  category: Resource3DCategory,
  role: string,
  silhouette: string,
  motif: string,
  palette: [string, string, string, string],
  motion: Resource3DMotion,
  scale = 1,
): ResourceSeed {
  return { key, name, category, role, silhouette, motif, palette, motion, scale };
}

export const RESOURCE3D_SAMPLE_ASSETS: Resource3DAssetSpec[] = seeds.map((item, index) => ({
  key: item.key,
  name: item.name,
  category: item.category,
  role: item.role,
  silhouette: item.silhouette,
  motif: item.motif,
  scale: item.scale ?? 1,
  palette: item.palette,
  textureChannels: RESOURCE3D_TEXTURE_CHANNELS,
  previewMotion: item.motion,
  parts: makeParts(item, index),
}));

function makeParts(item: ResourceSeed, index: number): Resource3DPartSpec[] {
  const [primary, accent, dark, glow] = item.palette;
  const tall = item.category === 'buildings' ? 1.35 : item.category === 'map_props' ? 1.05 : 0.92;
  const wide = item.category === 'spell_fx' || item.category === 'items' ? 0.72 : 0.58;
  const rowVariance = (index % 3) * 0.05;
  const base: Resource3DPartSpec[] = [
    part('display base', 'base', dark, [0.72 + wide * 0.2, 0.08, 0.72 + wide * 0.2], [0, 0.04, 0]),
    part('main mass', bodyKind(item.category), primary, [0.52 + wide * 0.28, tall, 0.42 + wide * 0.18], [0, 0.62 + tall * 0.12, 0]),
    part('top read', topKind(item.category), accent, [0.42, 0.38 + rowVariance, 0.42], [0, 1.35 + tall * 0.24, 0], glow),
    part('left read accent', sideKind(item.category), accent, [0.12, 0.8, 0.12], [-0.55 - wide * 0.16, 0.86, -0.06], glow, [0.25, 0, 0.42]),
    part('right read accent', sideKind(item.category), accent, [0.12, 0.8, 0.12], [0.55 + wide * 0.16, 0.86, -0.06], glow, [0.25, 0, -0.42]),
    part('motif glow', 'orb', accent, [0.16, 0.16, 0.16], [0.34, 1.18, -0.36], glow),
  ];

  if (item.category === 'spell_fx') {
    base.push(part('spell ring', 'ring', accent, [0.95, 0.06, 0.95], [0, 0.16, 0], glow));
    base.push(part('spell beam', 'beam', glow, [0.22, 1.35, 0.22], [0, 0.92, 0], glow));
  } else if (item.category === 'buildings') {
    base.push(part('roof plate', 'plate', accent, [0.94, 0.12, 0.74], [0, 1.55, 0], glow));
    base.push(part('team banner', 'banner', dark, [0.56, 0.08, 0.8], [0, 0.9, 0.48], glow, [0.25, 0, 0]));
  } else if (item.category === 'items') {
    base.push(part('relic ring', 'ring', accent, [0.82, 0.05, 0.82], [0, 0.2, 0], glow));
    base.push(part('gem core', 'orb', accent, [0.24, 0.24, 0.24], [0, 1.06, -0.32], glow));
  } else if (item.category === 'map_props') {
    base.push(part('ground scatter', 'plate', dark, [0.78, 0.06, 0.44], [0, 0.18, 0.32]));
    base.push(part('ambient mote', 'orb', accent, [0.12, 0.12, 0.12], [-0.38, 1.12, -0.28], glow));
  } else {
    base.push(part('shoulder plate', 'plate', accent, [0.88, 0.12, 0.26], [0, 1.02, -0.16], glow));
    base.push(part('ground rune', 'ring', accent, [0.72, 0.05, 0.72], [0, 0.13, 0], glow));
  }
  return base;
}

function part(
  name: string,
  kind: Resource3DPartKind,
  color: string,
  scale: [number, number, number],
  position: [number, number, number],
  emissive?: string,
  rotation?: [number, number, number],
): Resource3DPartSpec {
  return { name, kind, color, scale, position, emissive, rotation };
}

function bodyKind(category: Resource3DCategory): Resource3DPartKind {
  if (category === 'spell_fx') return 'beam';
  if (category === 'items') return 'weapon';
  if (category === 'map_props') return 'prop';
  return 'body';
}

function topKind(category: Resource3DCategory): Resource3DPartKind {
  if (category === 'buildings') return 'plate';
  if (category === 'items' || category === 'spell_fx') return 'orb';
  if (category === 'map_props') return 'banner';
  return 'head';
}

function sideKind(category: Resource3DCategory): Resource3DPartKind {
  if (category === 'buildings' || category === 'map_props') return 'banner';
  if (category === 'items' || category === 'spell_fx') return 'beam';
  return 'weapon';
}
