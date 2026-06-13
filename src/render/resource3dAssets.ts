export const RESOURCE3D_CATEGORIES = [
  'lane_units',
  'neutral_units',
  'boss_objectives',
  'buildings',
  'shops_npcs',
  'couriers_summons',
  'items',
  'item_components',
  'consumables',
  'wards_traps',
  'spell_fx',
  'projectiles',
  'aoe_indicators',
  'environment_fx',
  'map_props',
  'runes_powerups',
  'pickups_drops',
  'status_effects',
  'ability_icons',
  'targeting_reticles',
  'combat_numbers',
  'health_mana_ui',
  'screen_overlays',
  'announcements',
  'shop_inventory_ui',
  'sound_cue_markers',
  'hero_roster_ui',
  'level_talent_ui',
  'death_recap_ui',
  'scoreboard_ui',
  'match_flow_ui',
  'cursor_commands',
  'system_notifications',
  'tutorial_guides',
  'ui_badges',
  'terrain_tiles',
  'minimap_markers',
  'team_banners',
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
export type Resource3DMaterialKind =
  | 'cloth'
  | 'leather'
  | 'wood'
  | 'stone'
  | 'metal'
  | 'crystal'
  | 'energy'
  | 'water'
  | 'foliage'
  | 'paper'
  | 'shadow';
export type Resource3DDetailKind =
  | 'plain'
  | 'trim'
  | 'rune'
  | 'edgeWear'
  | 'scalePattern'
  | 'leafVein'
  | 'circuit'
  | 'bannerGlyph'
  | 'liquidRipple'
  | 'sparkCore';
export type Resource3DTextureOverlay =
  | 'microGrain'
  | 'motifInk'
  | 'rimTrim'
  | 'edgeWear'
  | 'emissiveHotspots'
  | 'materialMask';
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
  material: Resource3DMaterialKind;
  detail: Resource3DDetailKind;
  scale: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
}

export interface Resource3DTextureSpec {
  detailLevel: number;
  overlays: Resource3DTextureOverlay[];
}

export type ResourceLaneRoleClass = 'melee' | 'ranged' | 'siege' | 'super' | 'utility' | 'scout';
export type ResourceLaneTeamRead = 'dawn' | 'night' | 'neutral';
export type ResourceWildTier = 'small' | 'medium' | 'large' | 'ancient' | 'special' | 'boss' | 'objective';
export type ResourceWildBiome = 'forest' | 'stone' | 'river' | 'sky' | 'demonic' | 'relic';
export type ResourceWildPackRole = 'fodder' | 'leader' | 'caster' | 'flying' | 'ancient' | 'boss-core' | 'objective-mechanic';
export type ResourceSupportRoleClass = 'courier' | 'summon' | 'ward' | 'trap' | 'illusion' | 'totem';
export type ResourceSupportPriorityBand = 'low' | 'medium';

export interface ResourceLaneReadabilitySpec {
  teamRead: ResourceLaneTeamRead;
  roleClass: ResourceLaneRoleClass;
  formationSlot: string;
  attackRead: string;
  silhouetteAnchors: string[];
}

export interface ResourceWildReadabilitySpec {
  tier: ResourceWildTier;
  biome: ResourceWildBiome;
  packRole: ResourceWildPackRole;
  threatRead: string;
  silhouetteAnchors: string[];
}

export interface ResourceSupportReadabilitySpec {
  roleClass: ResourceSupportRoleClass;
  ownerRead: string;
  interactionRead: string;
  expireCue: string;
  priorityBand: ResourceSupportPriorityBand;
  visualPriority: number;
  silhouetteAnchors: string[];
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
  texture: Resource3DTextureSpec;
  previewMotion: Resource3DMotion;
  laneReadability?: ResourceLaneReadabilitySpec;
  wildReadability?: ResourceWildReadabilitySpec;
  supportReadability?: ResourceSupportReadabilitySpec;
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

  // Bosses and map objectives
  seed('boss_pitlord_core', '深渊领主', 'boss_objectives', '史诗 Boss', 'hulking-pitlord-core', 'pitlord-horn', ['#4a2d34', '#c87856', '#130b0d', '#ff7750'], 'ambient', 1.42),
  seed('boss_pitlord_claw', '深渊巨爪', 'boss_objectives', 'Boss 部件', 'giant-claw-relic', 'pit-claw', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 1.05),
  seed('boss_pit_egg', '深渊卵囊', 'boss_objectives', '巢穴机制', 'glowing-egg-sac', 'pit-egg', ['#5f3f4a', '#d7a384', '#1a1013', '#ff9a6c'], 'pulse', 0.9),
  seed('boss_respawn_timer', '重生沙漏', 'boss_objectives', '计时物件', 'hourglass-obelisk', 'respawn-hourglass', ['#7a5a38', '#f0c982', '#2b1d10', '#ffd98a'], 'spin', 0.86),
  seed('objective_outpost_core', '前哨核心', 'boss_objectives', '地图目标', 'outpost-control-core', 'outpost-core', ['#526077', '#bed4ff', '#171f2f', '#9ec8ff'], 'ambient', 0.98),
  seed('objective_twin_gate', '双生门枢纽', 'boss_objectives', '传送目标', 'twin-gate-core', 'twin-gate', ['#3e8591', '#c7fbff', '#123339', '#8ff6ff'], 'spin', 1.02),
  seed('objective_lotus_pool', '莲华池', 'boss_objectives', '地图补给', 'lotus-pool', 'lotus-petal', ['#4a936c', '#d6ffd8', '#143522', '#9affb8'], 'pulse', 0.96),
  seed('objective_wisdom_shrine', '智慧神龛', 'boss_objectives', '经验目标', 'wisdom-shrine', 'wisdom-eye', ['#5750a8', '#d6c8ff', '#1c1742', '#bfa8ff'], 'ambient', 1),
  seed('objective_tormentor_prism', '棱镜守卫', 'boss_objectives', '中立目标', 'tormentor-prism', 'tormentor-prism', ['#7a4f86', '#e2c0ff', '#24132c', '#cf8fff'], 'impact', 1.04),
  seed('objective_ancient_relic', '远古圣物', 'boss_objectives', '胜利目标', 'ancient-relic-spire', 'ancient-relic', ['#b1863a', '#fff0a4', '#3e2a10', '#fff0a8'], 'ambient', 1.12),

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

  // Shops and NPCs
  seed('npc_base_shopkeeper', '基地商人', 'shops_npcs', '商店 NPC', 'round-shopkeeper', 'shopkeeper-coin', ['#7b563f', '#d8bd7d', '#2b1d14', '#ffd782'], 'ambient', 0.95),
  seed('npc_secret_keeper', '秘店守望者', 'shops_npcs', '秘店 NPC', 'hooded-secret-keeper', 'secret-eye', ['#5e4637', '#d9bd7e', '#211812', '#ffd782'], 'float', 0.96),
  seed('npc_sideshop_relic', '边店遗物架', 'shops_npcs', '货架样板', 'stacked-relic-shelf', 'relic-shelf', ['#72523a', '#cfa36d', '#281a10', '#ffc985'], 'idle', 0.9),
  seed('npc_courier_master', '信使管理员', 'shops_npcs', '功能 NPC', 'banner-courier-master', 'courier-badge', ['#596b53', '#d7ca8b', '#1f2a1b', '#f0d782'], 'ambient', 0.98),
  seed('npc_healer_acolyte', '泉水侍从', 'shops_npcs', '治疗 NPC', 'fountain-acolyte', 'healer-drop', ['#3f8f97', '#bffaff', '#17383c', '#9ff3ff'], 'pulse', 0.92),
  seed('npc_lane_trainer', '兵线教官', 'shops_npcs', '教学 NPC', 'shield-trainer', 'trainer-shield', ['#8f6d45', '#e8c584', '#302010', '#ffd98a'], 'idle', 0.94),
  seed('npc_neutral_trader', '野区行商', 'shops_npcs', '野区 NPC', 'pack-trader', 'trader-pack', ['#586b4c', '#c8dd88', '#1d2818', '#bdff88'], 'float', 0.9),
  seed('npc_rune_scribe', '神符铭刻师', 'shops_npcs', '机制 NPC', 'rune-scribe', 'scribe-rune', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'spin', 0.92),
  seed('npc_blacksmith', '铸器师', 'shops_npcs', '装备 NPC', 'forge-smith', 'forge-hammer', ['#7a4d38', '#e0a06b', '#28160e', '#ff9a4d'], 'impact', 0.96),
  seed('npc_map_spirit', '地图精灵', 'shops_npcs', '引导 NPC', 'floating-map-spirit', 'map-wisp', ['#4aa0a8', '#c4fbff', '#153a3f', '#8ff6ff'], 'float', 0.78),

  // Couriers and summons
  seed('courier_ground_basic', '地面信使', 'couriers_summons', '信使', 'small-pack-courier', 'courier-pack', ['#8a6b48', '#d9bd7e', '#2d2015', '#ffd782'], 'float', 0.74),
  seed('courier_flying_drake', '飞行龙信使', 'couriers_summons', '飞行信使', 'winged-drake-courier', 'drake-wing', ['#5676a8', '#c7dbff', '#1b273d', '#a8cfff'], 'float', 0.8),
  seed('summon_wolf_spirit', '狼魂召唤物', 'couriers_summons', '召唤物', 'spirit-wolf', 'spirit-fang', ['#6f7f80', '#c8f0ff', '#1f2c30', '#9defff'], 'ambient', 0.84),
  seed('summon_treant', '树人召唤物', 'couriers_summons', '召唤物', 'branch-treant', 'treant-branch', ['#4f7a42', '#bfe08c', '#173018', '#9cff82'], 'idle', 0.94),
  seed('summon_serpent_ward', '蛇棒召唤物', 'couriers_summons', '召唤守卫', 'serpent-ward-totem', 'serpent-ward', ['#6d4e8f', '#d4b8ff', '#231638', '#c49cff'], 'pulse', 0.82),
  seed('summon_forge_spirit', '熔炉精灵', 'couriers_summons', '召唤物', 'ember-forge-spirit', 'forge-spirit', ['#b64d32', '#ffb071', '#3a160e', '#ff7a3d'], 'pulse', 0.84),
  seed('summon_illusion_marker', '幻象标记', 'couriers_summons', '幻象', 'mirror-illusion-figure', 'illusion-mirror', ['#4aa0a8', '#c4fbff', '#153a3f', '#8ff6ff'], 'spin', 0.86),
  seed('summon_healing_totem', '治疗图腾', 'couriers_summons', '功能召唤物', 'healing-totem', 'heal-totem', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.86),
  seed('summon_scout_eye', '侦察眼灵', 'couriers_summons', '侦察召唤物', 'floating-scout-eye', 'scout-eye', ['#4f8b6f', '#c6ffe2', '#18362a', '#9affc9'], 'float', 0.74),
  seed('summon_golem_shard', '岩灵碎魔', 'couriers_summons', '大型召唤物', 'stone-golem-shard', 'golem-shard', ['#6a6a5c', '#beb99f', '#24241d', '#d8d0a0'], 'impact', 0.98),

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

  // Item components
  seed('component_branch', '铁树枝干', 'item_components', '基础组件', 'tiny-branch-charm', 'branch-leaf', ['#5f8a48', '#c9ef9a', '#1f3518', '#9cff82'], 'float', 0.64),
  seed('component_gauntlet', '力量手套', 'item_components', '属性组件', 'red-gauntlet', 'gauntlet-fist', ['#a74638', '#ffc0a8', '#37140f', '#ff7a58'], 'pulse', 0.72),
  seed('component_slippers', '敏捷便鞋', 'item_components', '属性组件', 'green-slipper-pair', 'slipper-wing', ['#438f55', '#c9ffbd', '#14351b', '#9cff82'], 'pulse', 0.7),
  seed('component_mantle', '智力斗篷', 'item_components', '属性组件', 'blue-mantle-fold', 'mantle-eye', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'float', 0.72),
  seed('component_blades', '攻击双刃', 'item_components', '武器组件', 'crossed-small-blades', 'component-blade', ['#8f7b5c', '#d9c198', '#2c2518', '#ffe0a0'], 'spin', 0.76),
  seed('component_chainmail', '锁子甲片', 'item_components', '护甲组件', 'mail-plate-stack', 'chainmail-link', ['#68717c', '#c4cbd4', '#1e2328', '#c8d8ff'], 'ambient', 0.78),
  seed('component_ring_health', '生命指环', 'item_components', '回复组件', 'red-health-ring', 'health-ring', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'spin', 0.72),
  seed('component_void_stone', '虚无宝石', 'item_components', '法力组件', 'violet-void-stone', 'void-stone', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.74),
  seed('component_recipe_scroll', '合成卷轴', 'item_components', '配方', 'rolled-recipe-scroll', 'recipe-scroll', ['#b18655', '#ffe0a0', '#3b2412', '#ffd08a'], 'float', 0.7),
  seed('component_mystic_staff', '秘法长杖', 'item_components', '高阶组件', 'thin-mystic-staff', 'mystic-star', ['#6750b8', '#d8c8ff', '#21184a', '#c2a8ff'], 'ambient', 0.82),

  // Consumables
  seed('consumable_tango', '吃树补给', 'consumables', '回复消耗品', 'leaf-bundle', 'tango-leaf', ['#4f8f4c', '#c9ef9a', '#173018', '#9cff82'], 'float', 0.68),
  seed('consumable_clarity', '清澈药水', 'consumables', '法力消耗品', 'blue-vial', 'clarity-vial', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'pulse', 0.7),
  seed('consumable_salve', '治疗药膏', 'consumables', '生命消耗品', 'red-salve-tube', 'salve-cross', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'pulse', 0.7),
  seed('consumable_mango', '魔芒果', 'consumables', '瞬时补给', 'gold-mango', 'mango-spark', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'float', 0.68),
  seed('consumable_dust', '显影之尘', 'consumables', '反隐消耗品', 'dust-pouch', 'dust-cloud', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.7),
  seed('consumable_smoke', '诡计之雾', 'consumables', '团队消耗品', 'smoke-flask', 'smoke-swirl', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'ambient', 0.72),
  seed('consumable_tome', '知识典籍', 'consumables', '经验消耗品', 'open-tome', 'tome-rune', ['#7a5a38', '#f0c982', '#2b1d10', '#ffd98a'], 'float', 0.72),
  seed('consumable_tp_scroll', '回城卷轴', 'consumables', '传送消耗品', 'tp-scroll-roll', 'tp-rune', ['#3a8ca2', '#c5fbff', '#12343d', '#8ff6ff'], 'spin', 0.74),
  seed('consumable_blood_grenade', '血榴弹', 'consumables', '进攻消耗品', 'red-grenade-orb', 'grenade-spark', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.72),
  seed('consumable_lotus', '莲华果实', 'consumables', '地图补给', 'lotus-fruit', 'lotus-petal', ['#4a936c', '#d6ffd8', '#143522', '#9affb8'], 'pulse', 0.7),

  // Wards and traps
  seed('ward_observer', '侦察守卫', 'wards_traps', '视野守卫', 'observer-eye-ward', 'observer-eye', ['#4f8b6f', '#c6ffe2', '#18362a', '#9affc9'], 'pulse', 0.74),
  seed('ward_sentry', '岗哨守卫', 'wards_traps', '反隐守卫', 'sentry-blue-ward', 'sentry-eye', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'pulse', 0.74),
  seed('ward_trap_stasis', '静滞陷阱', 'wards_traps', '控制陷阱', 'stasis-trap-totem', 'stasis-spark', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'impact', 0.78),
  seed('ward_trap_mine', '爆破地雷', 'wards_traps', '伤害陷阱', 'spiked-mine', 'mine-spark', ['#7a4d38', '#e0a06b', '#28160e', '#ff9a4d'], 'impact', 0.78),
  seed('ward_healing_ward', '治疗守卫', 'wards_traps', '功能守卫', 'healing-ward-stick', 'heal-cross', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.8),
  seed('ward_serpent', '蛇形守卫', 'wards_traps', '攻击守卫', 'serpent-ward-head', 'serpent-head', ['#6d4e8f', '#d4b8ff', '#231638', '#c49cff'], 'ambient', 0.82),
  seed('ward_fire_trap', '火焰陷阱', 'wards_traps', '区域陷阱', 'ember-trap-ring', 'fire-trap', ['#b64d32', '#ffb071', '#3a160e', '#ff7a3d'], 'pulse', 0.78),
  seed('ward_ice_trap', '冰霜陷阱', 'wards_traps', '区域陷阱', 'ice-trap-ring', 'ice-trap', ['#63b7c8', '#d8fbff', '#153a42', '#9ff3ff'], 'pulse', 0.78),
  seed('ward_reveal_lantern', '显影灯塔', 'wards_traps', '侦测装置', 'reveal-lantern', 'reveal-light', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'float', 0.78),
  seed('ward_smoke_beacon', '烟雾信标', 'wards_traps', '团队装置', 'smoke-beacon', 'smoke-beacon', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'ambient', 0.78),

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

  // Dedicated projectiles
  seed('projectile_basic_melee_arc', '近战挥砍弧', 'projectiles', '近战轨迹', 'crescent-slash-arc', 'slash-arc', ['#b48c55', '#ffe1a6', '#3b2a18', '#ffd18a'], 'impact', 0.76),
  seed('projectile_basic_arrow', '基础箭矢', 'projectiles', '远程弹道', 'slim-arrow-projectile', 'arrow-head', ['#8d6a3d', '#d8b76c', '#4d351d', '#ffd06c'], 'float', 0.78),
  seed('projectile_magic_missile', '魔法飞弹', 'projectiles', '锁定弹道', 'violet-missile-orb', 'magic-missile', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.82),
  seed('projectile_fireball', '火球弹道', 'projectiles', '火系弹道', 'ember-fireball-trail', 'fireball-tail', ['#c85632', '#ffb26a', '#3d160e', '#ff7a3d'], 'pulse', 0.84),
  seed('projectile_ice_lance', '冰矛弹道', 'projectiles', '冰系弹道', 'ice-lance-projectile', 'ice-lance', ['#6bc8df', '#dcfbff', '#153d4c', '#a8f4ff'], 'float', 0.82),
  seed('projectile_poison_spit', '毒液弹道', 'projectiles', '毒系弹道', 'green-spit-glob', 'poison-spit', ['#6f9f54', '#c4ef88', '#1d3418', '#91d66d'], 'impact', 0.8),
  seed('projectile_hook_head', '钩爪弹头', 'projectiles', '链钩弹道', 'hook-head-projectile', 'hook-head', ['#8d7b68', '#d6c1a0', '#2e261f', '#91d66d'], 'float', 0.86),
  seed('projectile_spear_throw', '投矛弹道', 'projectiles', '穿刺弹道', 'long-spear-projectile', 'spear-tip', ['#8f7b5c', '#d9c198', '#2c2518', '#ffe0a0'], 'float', 0.9),
  seed('projectile_star_shard', '星屑弹道', 'projectiles', '奥术弹道', 'star-shard-projectile', 'star-shard', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'spin', 0.78),
  seed('projectile_heal_wisp', '治疗灵光', 'projectiles', '友方弹道', 'heal-wisp-projectile', 'heal-wisp', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.76),

  // Area indicators and telegraphs
  seed('aoe_circle_small', '小型范围圈', 'aoe_indicators', '技能范围', 'small-target-ring', 'small-aoe-ring', ['#3a8ca2', '#c5fbff', '#12343d', '#8ff6ff'], 'pulse', 0.86),
  seed('aoe_circle_large', '大型范围圈', 'aoe_indicators', '技能范围', 'large-target-ring', 'large-aoe-ring', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'pulse', 1.02),
  seed('aoe_cone_front', '扇形预警', 'aoe_indicators', '方向范围', 'cone-warning', 'cone-telegraph', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.94),
  seed('aoe_line_dash', '直线冲刺线', 'aoe_indicators', '方向范围', 'dash-line-warning', 'dash-line', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'pulse', 0.98),
  seed('aoe_wall_barrier', '墙体范围', 'aoe_indicators', '阻挡范围', 'wall-barrier-preview', 'wall-preview', ['#63b7c8', '#d8fbff', '#153a42', '#9ff3ff'], 'ambient', 1.04),
  seed('aoe_ground_crack', '裂地预警', 'aoe_indicators', '延迟范围', 'ground-crack-preview', 'crack-warning', ['#8f6e4b', '#ffd491', '#342419', '#ffb35d'], 'impact', 1),
  seed('aoe_heal_field', '治疗区域', 'aoe_indicators', '友方范围', 'heal-field-ring', 'heal-field', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.98),
  seed('aoe_silence_field', '沉默区域', 'aoe_indicators', '控制范围', 'silence-field-ring', 'silence-field', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'ambient', 0.98),
  seed('aoe_boss_warning', 'Boss 重击预警', 'aoe_indicators', 'Boss 范围', 'boss-smash-warning', 'boss-warning', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 1.08),
  seed('aoe_tp_landing', '传送落点', 'aoe_indicators', '传送范围', 'tp-landing-ring', 'tp-landing', ['#3a8ca2', '#c5fbff', '#12343d', '#8ff6ff'], 'spin', 0.96),

  // Environmental effects
  seed('env_river_mist', '河道薄雾', 'environment_fx', '环境雾效', 'river-mist-wisp', 'river-mist', ['#306d7d', '#b8edf7', '#0f2a32', '#8defff'], 'ambient', 0.92),
  seed('env_jungle_firefly', '野区萤火', 'environment_fx', '环境粒子', 'firefly-cluster', 'firefly-dot', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.72),
  seed('env_tower_dust', '塔下尘烟', 'environment_fx', '破坏尘烟', 'dust-puff-stack', 'tower-dust', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'ambient', 0.86),
  seed('env_rain_spark', '雨滴火花', 'environment_fx', '天气特效', 'rain-spark-streaks', 'rain-spark', ['#5678e8', '#dce7ff', '#17265a', '#8fb4ff'], 'pulse', 0.8),
  seed('env_lava_bubble', '熔岩气泡', 'environment_fx', '地貌特效', 'lava-bubble', 'lava-bubble', ['#b64d32', '#ffb071', '#3a160e', '#ff7a3d'], 'pulse', 0.84),
  seed('env_fountain_spray', '泉水喷涌', 'environment_fx', '泉水特效', 'fountain-spray', 'fountain-spray', ['#3f8f97', '#bffaff', '#17383c', '#9ff3ff'], 'pulse', 0.9),
  seed('env_shop_glow', '商店暖光', 'environment_fx', '场景光效', 'shop-warm-glow', 'shop-glow', ['#7f5640', '#d9bd7e', '#2d2018', '#ffd782'], 'ambient', 0.88),
  seed('env_roshan_embers', '深渊余烬', 'environment_fx', 'Boss 场景', 'pit-ember-cloud', 'pit-embers', ['#4a2d34', '#c87856', '#130b0d', '#ff7750'], 'ambient', 0.9),
  seed('env_highground_wind', '高地风纹', 'environment_fx', '地势特效', 'wind-ribbon', 'highground-wind', ['#647ca8', '#c7dbff', '#222b40', '#a8cfff'], 'float', 0.86),
  seed('env_ancient_aura', '基地光环', 'environment_fx', '基地特效', 'ancient-aura-ring', 'ancient-aura', ['#d0a244', '#fff2a8', '#513b17', '#fff0a8'], 'ambient', 0.94),
  seed('env_sky_day_dome', '白昼天空幕', 'environment_fx', '天空背景', 'sky-dome-day', 'sky-cloud', ['#6aa7d8', '#e8f7ff', '#17314a', '#bdeaff'], 'ambient', 1),
  seed('env_sky_night_dome', '夜空星幕', 'environment_fx', '天空背景', 'sky-dome-night', 'sky-star', ['#24376a', '#aebdff', '#090f25', '#cbd6ff'], 'pulse', 1),
  seed('env_cloud_shadow', '云影掠过', 'environment_fx', '天空投影', 'cloud-shadow-ribbon', 'cloud-shadow', ['#5d6f78', '#d8ecf2', '#182329', '#c9f4ff'], 'float', 0.9),
  seed('env_sunshaft', '天光束', 'environment_fx', '天空光效', 'sunshaft-beam', 'sky-sunshaft', ['#d8b34a', '#fff7bc', '#42300f', '#fff08a'], 'pulse', 0.92),
  seed('env_pollen_wind', '花粉风', 'environment_fx', '植被粒子', 'flower-pollen-wind', 'pollen-flower', ['#b89b48', '#fff0a0', '#3a2b10', '#ffe78a'], 'float', 0.82),

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
  seed('prop_tree_broadleaf', '阔叶树', 'map_props', '树木', 'broadleaf-tree', 'broadleaf-canopy', ['#356b3f', '#94d684', '#17341d', '#aaff88'], 'ambient', 1.02),
  seed('prop_tree_pine_cluster', '松树丛', 'map_props', '树木组', 'pine-tree-cluster', 'pine-cluster', ['#28583a', '#83c777', '#11291b', '#9cff82'], 'ambient', 1.05),
  seed('prop_tree_stump', '树桩', 'map_props', '树木残件', 'cut-tree-stump', 'stump-ring', ['#6a4f34', '#bc8f62', '#24160c', '#d09b6c'], 'idle', 0.72),
  seed('prop_grass_tuft', '草丛', 'map_props', '草植被', 'grass-tuft-clump', 'grass-blade', ['#3f773c', '#a9dc7a', '#142d16', '#9cff82'], 'float', 0.72),
  seed('prop_reed_cluster', '河岸芦苇', 'map_props', '河道植被', 'river-reed-cluster', 'reed-grass', ['#4e7657', '#b8d990', '#1b301d', '#caff8a'], 'float', 0.78),
  seed('prop_flower_red_patch', '红花丛', 'map_props', '花植被', 'red-flower-patch', 'flower-red', ['#71483e', '#ffb0a0', '#241311', '#ff7a58'], 'pulse', 0.68),
  seed('prop_flower_blue_patch', '蓝花丛', 'map_props', '花植被', 'blue-flower-patch', 'flower-blue', ['#3f5f93', '#b8d4ff', '#101f36', '#9ed3ff'], 'pulse', 0.68),
  seed('prop_wood_fence', '木栅栏', 'map_props', '栅栏', 'wood-fence-segment', 'wood-fence', ['#6d4d32', '#c99861', '#25170d', '#ffd08a'], 'idle', 0.86),
  seed('prop_stone_fence', '石栅栏', 'map_props', '栅栏', 'stone-fence-segment', 'stone-fence', ['#5d6158', '#b7bea8', '#1e211c', '#d2d8bd'], 'idle', 0.9),
  seed('prop_highground_stairs', '高地台阶', 'map_props', '高地通道', 'highground-stairs-prop', 'stair-step', ['#6a5a43', '#c5a76b', '#2a2116', '#d9bd7e'], 'idle', 0.96),
  seed('prop_river_bridge', '河道小桥', 'map_props', '河道通行', 'river-bridge-prop', 'bridge-plank', ['#6b5138', '#cfa36d', '#25190f', '#ffc985'], 'idle', 1),

  // Runes and power-ups
  seed('rune_haste', '极速神符', 'runes_powerups', '神符', 'winged-speed-rune', 'haste-wings', ['#3f8fd2', '#c7ecff', '#12304a', '#8bd8ff'], 'spin', 0.82),
  seed('rune_double_damage', '双倍神符', 'runes_powerups', '神符', 'split-red-rune', 'double-blade', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'pulse', 0.84),
  seed('rune_regen', '恢复神符', 'runes_powerups', '神符', 'green-drop-rune', 'regen-drop', ['#3f9f6c', '#c8ffd7', '#12381f', '#8effa9'], 'pulse', 0.84),
  seed('rune_invis', '隐身神符', 'runes_powerups', '神符', 'smoke-eye-rune', 'invis-eye', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'float', 0.82),
  seed('rune_illusion', '幻象神符', 'runes_powerups', '神符', 'twin-mask-rune', 'illusion-mask', ['#4aa0a8', '#c4fbff', '#153a3f', '#8ff6ff'], 'spin', 0.84),
  seed('rune_bounty', '赏金神符', 'runes_powerups', '经济资源', 'coin-stack-rune', 'bounty-coin', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'ambient', 0.88),
  seed('rune_arcane', '奥术神符', 'runes_powerups', '法力资源', 'violet-arcane-rune', 'arcane-spiral', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'spin', 0.86),
  seed('rune_water', '水之神符', 'runes_powerups', '河道资源', 'water-drop-rune', 'water-ripple', ['#3d9fc4', '#c8f6ff', '#123746', '#8defff'], 'pulse', 0.82),
  seed('power_aegis_shard', '不朽碎片', 'runes_powerups', 'Boss 奖励', 'gold-shield-shard', 'aegis-shard', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'ambient', 0.9),
  seed('power_cheese', '圣酪补给', 'runes_powerups', 'Boss 补给', 'round-cheese-charm', 'cheese-charm', ['#d1a94f', '#fff1a0', '#4b3413', '#ffe78a'], 'float', 0.8),

  // Pickups and drops
  seed('drop_gold_coin', '金币掉落', 'pickups_drops', '经济掉落', 'single-gold-coin', 'gold-coin', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'spin', 0.66),
  seed('drop_gold_bag', '钱袋掉落', 'pickups_drops', '经济掉落', 'gold-bag-pickup', 'gold-bag', ['#8f6d45', '#e8c584', '#302010', '#ffd98a'], 'float', 0.72),
  seed('drop_xp_orb', '经验光球', 'pickups_drops', '经验掉落', 'blue-xp-orb', 'xp-orb', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'pulse', 0.68),
  seed('drop_soul_shard', '灵魂碎片', 'pickups_drops', '能量掉落', 'violet-soul-shard', 'soul-shard', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'float', 0.7),
  seed('drop_health_orb', '生命光球', 'pickups_drops', '恢复掉落', 'red-health-orb', 'health-orb', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'pulse', 0.68),
  seed('drop_mana_orb', '法力光球', 'pickups_drops', '恢复掉落', 'cyan-mana-orb', 'mana-orb', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'pulse', 0.68),
  seed('drop_neutral_token', '中立凭证', 'pickups_drops', '野怪掉落', 'neutral-token', 'neutral-token', ['#6c8b55', '#c1e28f', '#24381d', '#aaff88'], 'spin', 0.7),
  seed('drop_recipe_scrap', '配方残页', 'pickups_drops', '合成掉落', 'recipe-scrap', 'recipe-scrap', ['#b18655', '#ffe0a0', '#3b2412', '#ffd08a'], 'float', 0.68),
  seed('drop_boss_trophy', 'Boss 战利品', 'pickups_drops', 'Boss 掉落', 'boss-trophy-core', 'boss-trophy', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'ambient', 0.82),
  seed('drop_lotus_petals', '莲华花瓣', 'pickups_drops', '地图掉落', 'lotus-petal-drop', 'lotus-petal', ['#4a936c', '#d6ffd8', '#143522', '#9affb8'], 'float', 0.68),

  // Status effects
  seed('status_stunned', '眩晕', 'status_effects', '控制状态', 'broken-star-stun', 'stun-star', ['#c69b38', '#fff0a0', '#442f10', '#ffe36b'], 'impact', 0.8),
  seed('status_silenced', '沉默', 'status_effects', '控制状态', 'sealed-mouth-mark', 'silence-seal', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'pulse', 0.78),
  seed('status_rooted', '缠绕', 'status_effects', '控制状态', 'root-vine-knot', 'root-vine', ['#4e8a42', '#bfe6a0', '#173318', '#9cff82'], 'ambient', 0.8),
  seed('status_disarmed', '缴械', 'status_effects', '限制状态', 'crossed-broken-blades', 'disarm-cross', ['#8f6d58', '#e4b99a', '#2f2018', '#ffc095'], 'impact', 0.8),
  seed('status_spell_immune', '魔免', 'status_effects', '防护状态', 'gold-bubble-shield', 'spell-immune', ['#bd8c35', '#fff0a8', '#3e2c10', '#ffe56b'], 'pulse', 0.86),
  seed('status_invisible', '隐身', 'status_effects', '潜行状态', 'transparent-eye-mist', 'invis-mist', ['#5d4fa3', '#c7bbff', '#1f1938', '#b896ff'], 'float', 0.78),
  seed('status_hasted', '加速', 'status_effects', '增益状态', 'speed-chevron-mark', 'haste-chevron', ['#3d8fd0', '#c2e9ff', '#12324a', '#8bd8ff'], 'spin', 0.8),
  seed('status_slowed', '减速', 'status_effects', '减益状态', 'ice-chain-mark', 'slow-chain', ['#63b7c8', '#d8fbff', '#153a42', '#9ff3ff'], 'pulse', 0.8),
  seed('status_poisoned', '中毒', 'status_effects', '持续伤害', 'green-drop-skull', 'poison-drop', ['#6f9f54', '#c4ef88', '#1d3418', '#91d66d'], 'ambient', 0.8),
  seed('status_burning', '燃烧', 'status_effects', '持续伤害', 'ember-flame-mark', 'burn-flame', ['#b64d32', '#ffb071', '#3a160e', '#ff7a3d'], 'pulse', 0.82),

  // Ability and command icons
  seed('ability_q_strike', 'Q 斩击图标', 'ability_icons', '技能图标', 'q-slash-icon', 'q-slash', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'pulse', 0.68),
  seed('ability_w_guard', 'W 护盾图标', 'ability_icons', '技能图标', 'w-shield-icon', 'w-shield', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'pulse', 0.68),
  seed('ability_e_dash', 'E 突进图标', 'ability_icons', '技能图标', 'e-dash-icon', 'e-dash', ['#3f8fd2', '#c7ecff', '#12304a', '#8bd8ff'], 'spin', 0.68),
  seed('ability_r_ultimate', 'R 终极技图标', 'ability_icons', '终极技能图标', 'r-crown-icon', 'r-crown', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'ambient', 0.72),
  seed('ability_passive_aura', '被动光环图标', 'ability_icons', '被动图标', 'passive-aura-icon', 'passive-aura', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'ambient', 0.66),
  seed('ability_toggle_mode', '切换技能图标', 'ability_icons', '切换图标', 'toggle-mode-icon', 'toggle-mode', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.66),
  seed('ability_channel_cast', '持续施法图标', 'ability_icons', '引导图标', 'channel-cast-icon', 'channel-cast', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.68),
  seed('ability_talent_star', '天赋图标', 'ability_icons', '天赋图标', 'talent-star-icon', 'talent-star', ['#b1863a', '#fff0a4', '#3e2a10', '#fff0a8'], 'spin', 0.68),
  seed('ability_scepter_upgrade', '神杖升级图标', 'ability_icons', '升级图标', 'scepter-upgrade-icon', 'scepter-star', ['#6750b8', '#d8c8ff', '#21184a', '#c2a8ff'], 'ambient', 0.7),
  seed('ability_shard_upgrade', '魔晶升级图标', 'ability_icons', '升级图标', 'shard-upgrade-icon', 'shard-spark', ['#3d9fc4', '#c8f6ff', '#123746', '#8defff'], 'pulse', 0.68),

  // Targeting reticles and cast previews
  seed('target_unit_enemy', '敌方单位准星', 'targeting_reticles', '单位指示', 'enemy-unit-reticle', 'enemy-target', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.82),
  seed('target_unit_ally', '友方单位准星', 'targeting_reticles', '单位指示', 'ally-unit-reticle', 'ally-target', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.82),
  seed('target_ground_point', '地面点选准星', 'targeting_reticles', '地面指示', 'ground-point-reticle', 'ground-target', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'spin', 0.82),
  seed('target_aoe_circle', '圆形范围准星', 'targeting_reticles', '范围指示', 'circle-reticle', 'circle-target', ['#3a8ca2', '#c5fbff', '#12343d', '#8ff6ff'], 'pulse', 0.88),
  seed('target_cone_facing', '扇形朝向准星', 'targeting_reticles', '朝向指示', 'cone-facing-reticle', 'cone-target', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'impact', 0.86),
  seed('target_line_skillshot', '直线弹道准星', 'targeting_reticles', '弹道指示', 'line-skillshot-reticle', 'line-target', ['#5678e8', '#dce7ff', '#17265a', '#8fb4ff'], 'float', 0.9),
  seed('target_vector_drag', '拖拽向量准星', 'targeting_reticles', '向量指示', 'vector-drag-reticle', 'vector-target', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'float', 0.86),
  seed('target_self_cast', '自我施法准星', 'targeting_reticles', '自我指示', 'self-cast-reticle', 'self-target', ['#bd8c35', '#fff0a8', '#3e2c10', '#ffe56b'], 'ambient', 0.8),
  seed('target_global_cast', '全图施法准星', 'targeting_reticles', '全图指示', 'global-cast-reticle', 'global-target', ['#24376a', '#aebdff', '#090f25', '#cbd6ff'], 'spin', 0.88),
  seed('target_invalid_cross', '无效目标准星', 'targeting_reticles', '错误指示', 'invalid-cross-reticle', 'invalid-target', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.82),

  // Combat number and floating text styles
  seed('number_physical_damage', '物理伤害数字', 'combat_numbers', '飘字', 'physical-number-stack', 'physical-number', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'impact', 0.62),
  seed('number_magic_damage', '魔法伤害数字', 'combat_numbers', '飘字', 'magic-number-stack', 'magic-number', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'impact', 0.62),
  seed('number_pure_damage', '纯粹伤害数字', 'combat_numbers', '飘字', 'pure-number-stack', 'pure-number', ['#d8d8d8', '#ffffff', '#2a2a2a', '#ffffff'], 'impact', 0.62),
  seed('number_critical_hit', '暴击数字', 'combat_numbers', '暴击飘字', 'critical-number-burst', 'crit-number', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.68),
  seed('number_heal_gain', '治疗数字', 'combat_numbers', '治疗飘字', 'heal-number-stack', 'heal-number', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.62),
  seed('number_shield_block', '护盾吸收数字', 'combat_numbers', '防护飘字', 'shield-number-stack', 'shield-number', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'pulse', 0.62),
  seed('number_gold_gain', '金币数字', 'combat_numbers', '经济飘字', 'gold-number-stack', 'gold-number', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'float', 0.62),
  seed('number_xp_gain', '经验数字', 'combat_numbers', '经验飘字', 'xp-number-stack', 'xp-number', ['#3d9fc4', '#c8f6ff', '#123746', '#8defff'], 'float', 0.62),
  seed('number_miss_text', '闪避文字', 'combat_numbers', '战斗文字', 'miss-text-stack', 'miss-text', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'float', 0.6),
  seed('number_deny_text', '反补文字', 'combat_numbers', '战斗文字', 'deny-text-stack', 'deny-text', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.6),

  // Health, mana, and status bars
  seed('bar_ally_health', '友方血条', 'health_mana_ui', '单位状态条', 'ally-health-bar', 'health-bar', ['#3f9f6c', '#c8ffd7', '#12381f', '#8effa9'], 'pulse', 0.7),
  seed('bar_enemy_health', '敌方血条', 'health_mana_ui', '单位状态条', 'enemy-health-bar', 'health-bar-red', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'pulse', 0.7),
  seed('bar_mana', '法力条', 'health_mana_ui', '单位状态条', 'mana-bar', 'mana-bar', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'pulse', 0.68),
  seed('bar_shield', '护盾条', 'health_mana_ui', '护盾状态条', 'shield-bar', 'shield-bar', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'ambient', 0.68),
  seed('bar_boss_health', 'Boss 血条', 'health_mana_ui', 'Boss 状态条', 'boss-health-bar', 'boss-health', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 0.78),
  seed('bar_tower_health', '建筑血条', 'health_mana_ui', '建筑状态条', 'tower-health-bar', 'tower-health', ['#8f6d45', '#e8c584', '#302010', '#ffd98a'], 'ambient', 0.72),
  seed('bar_creep_health', '小兵血条', 'health_mana_ui', '小兵状态条', 'creep-health-bar', 'creep-health', ['#6c8b55', '#c1e28f', '#24381d', '#aaff88'], 'idle', 0.64),
  seed('bar_channel_cast', '引导读条', 'health_mana_ui', '施法读条', 'channel-bar', 'channel-bar', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.7),
  seed('bar_respawn_timer', '复活读条', 'health_mana_ui', '复活 UI', 'respawn-timer-bar', 'respawn-timer', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'spin', 0.68),
  seed('bar_low_health_flash', '濒危血条', 'health_mana_ui', '危险状态条', 'low-health-bar', 'low-health', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'impact', 0.7),

  // Screen overlays and full-screen feedback
  seed('overlay_hit_flash', '受击闪屏', 'screen_overlays', '屏幕反馈', 'hit-flash-overlay', 'hit-flash', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.86),
  seed('overlay_low_health', '低血量暗角', 'screen_overlays', '屏幕反馈', 'low-health-vignette', 'low-health-vignette', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'pulse', 0.86),
  seed('overlay_stunned', '眩晕屏幕星', 'screen_overlays', '控制反馈', 'stun-screen-stars', 'screen-stun', ['#c69b38', '#fff0a0', '#442f10', '#ffe36b'], 'impact', 0.82),
  seed('overlay_silenced', '沉默屏幕封印', 'screen_overlays', '控制反馈', 'silence-screen-seal', 'screen-silence', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'pulse', 0.82),
  seed('overlay_smoke_veil', '开雾屏幕纱', 'screen_overlays', '团队反馈', 'smoke-screen-veil', 'screen-smoke', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'ambient', 0.82),
  seed('overlay_spell_immune', '魔免金光屏', 'screen_overlays', '防护反馈', 'spell-immune-overlay', 'screen-immune', ['#bd8c35', '#fff0a8', '#3e2c10', '#ffe56b'], 'pulse', 0.82),
  seed('overlay_respawn_fade', '复活淡入', 'screen_overlays', '复活反馈', 'respawn-fade-overlay', 'screen-respawn', ['#3f8f97', '#bffaff', '#17383c', '#9ff3ff'], 'float', 0.82),
  seed('overlay_night_vision', '夜视屏幕层', 'screen_overlays', '昼夜反馈', 'night-vision-overlay', 'screen-night', ['#24376a', '#aebdff', '#090f25', '#cbd6ff'], 'ambient', 0.82),
  seed('overlay_shop_open', '商店打开幕', 'screen_overlays', '界面转场', 'shop-open-overlay', 'screen-shop', ['#7f5640', '#d9bd7e', '#2d2018', '#ffd782'], 'float', 0.8),
  seed('overlay_victory_wash', '胜利金光幕', 'screen_overlays', '结算反馈', 'victory-wash-overlay', 'screen-victory', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'ambient', 0.84),

  // Match announcements
  seed('announce_first_blood', '一血播报', 'announcements', '击杀播报', 'first-blood-banner', 'first-blood', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.88),
  seed('announce_double_kill', '双杀播报', 'announcements', '击杀播报', 'double-kill-banner', 'double-kill', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'impact', 0.86),
  seed('announce_rampage', '暴走播报', 'announcements', '击杀播报', 'rampage-banner', 'rampage', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'impact', 0.9),
  seed('announce_tower_fall', '防御塔倒塌', 'announcements', '目标播报', 'tower-fall-banner', 'tower-fall', ['#8f6d45', '#e8c584', '#302010', '#ffd98a'], 'ambient', 0.86),
  seed('announce_boss_slain', 'Boss 被击杀', 'announcements', '目标播报', 'boss-slain-banner', 'boss-slain', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 0.88),
  seed('announce_aegis_claimed', '不朽被拾取', 'announcements', '目标播报', 'aegis-claimed-banner', 'aegis-claimed', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'ambient', 0.86),
  seed('announce_buyback', '买活播报', 'announcements', '经济播报', 'buyback-banner', 'buyback', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'pulse', 0.84),
  seed('announce_courier_kill', '信使被击杀', 'announcements', '事件播报', 'courier-kill-banner', 'courier-kill', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.84),
  seed('announce_ancient_exposed', '基地暴露', 'announcements', '目标播报', 'ancient-exposed-banner', 'ancient-exposed', ['#4b3d91', '#cdb9ff', '#181431', '#d8c2ff'], 'pulse', 0.86),
  seed('announce_victory', '胜利播报', 'announcements', '结算播报', 'victory-announcement-banner', 'victory-announce', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'ambient', 0.9),

  // Shop and inventory UI pieces
  seed('shop_item_slot', '物品槽位', 'shop_inventory_ui', '背包 UI', 'item-slot-frame', 'item-slot', ['#5d4a38', '#a98b68', '#251b13', '#d09b6c'], 'ambient', 0.68),
  seed('shop_quickbuy_slot', '快捷购买槽', 'shop_inventory_ui', '购买 UI', 'quickbuy-slot-frame', 'quickbuy-slot', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'pulse', 0.68),
  seed('shop_stash_slot', '储藏槽位', 'shop_inventory_ui', '储藏 UI', 'stash-slot-frame', 'stash-slot', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'ambient', 0.68),
  seed('shop_recipe_highlight', '配方高亮', 'shop_inventory_ui', '合成 UI', 'recipe-highlight-frame', 'recipe-highlight', ['#b18655', '#ffe0a0', '#3b2412', '#ffd08a'], 'pulse', 0.68),
  seed('shop_cooldown_sweep', '冷却扫光', 'shop_inventory_ui', '冷却 UI', 'cooldown-sweep-frame', 'cooldown-sweep', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'spin', 0.68),
  seed('shop_gold_wallet', '金币钱包', 'shop_inventory_ui', '经济 UI', 'gold-wallet-widget', 'gold-wallet', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'float', 0.7),
  seed('shop_courier_delivery', '信使配送按钮', 'shop_inventory_ui', '信使 UI', 'courier-delivery-button', 'courier-delivery', ['#596b53', '#d7ca8b', '#1f2a1b', '#f0d782'], 'pulse', 0.7),
  seed('shop_neutral_slot', '中立装备槽', 'shop_inventory_ui', '装备 UI', 'neutral-slot-frame', 'neutral-slot', ['#6c8b55', '#c1e28f', '#24381d', '#aaff88'], 'ambient', 0.68),
  seed('shop_locked_slot', '锁定槽位', 'shop_inventory_ui', '限制 UI', 'locked-slot-frame', 'locked-slot', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'impact', 0.68),
  seed('shop_sell_zone', '出售区域', 'shop_inventory_ui', '商店 UI', 'sell-zone-frame', 'sell-zone', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'pulse', 0.7),

  // Sound cue markers for future audio binding
  seed('sound_attack_cue', '攻击音效提示', 'sound_cue_markers', '音效提示', 'attack-sound-cue', 'sound-attack', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'pulse', 0.64),
  seed('sound_cast_cue', '施法音效提示', 'sound_cue_markers', '音效提示', 'cast-sound-cue', 'sound-cast', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'spin', 0.64),
  seed('sound_hit_cue', '命中音效提示', 'sound_cue_markers', '音效提示', 'hit-sound-cue', 'sound-hit', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.64),
  seed('sound_crit_cue', '暴击音效提示', 'sound_cue_markers', '音效提示', 'crit-sound-cue', 'sound-crit', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'impact', 0.66),
  seed('sound_heal_cue', '治疗音效提示', 'sound_cue_markers', '音效提示', 'heal-sound-cue', 'sound-heal', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.64),
  seed('sound_death_cue', '死亡音效提示', 'sound_cue_markers', '音效提示', 'death-sound-cue', 'sound-death', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.64),
  seed('sound_objective_cue', '目标音效提示', 'sound_cue_markers', '音效提示', 'objective-sound-cue', 'sound-objective', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'ambient', 0.66),
  seed('sound_shop_cue', '商店音效提示', 'sound_cue_markers', '音效提示', 'shop-sound-cue', 'sound-shop', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'float', 0.64),
  seed('sound_ping_cue', '信号音效提示', 'sound_cue_markers', '音效提示', 'ping-sound-cue', 'sound-ping', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'pulse', 0.64),
  seed('sound_warning_cue', '警告音效提示', 'sound_cue_markers', '音效提示', 'warning-sound-cue', 'sound-warning', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.64),

  // Hero roster, portraits, and selection UI
  seed('roster_card_strength', '力量英雄卡', 'hero_roster_ui', '英雄卡片', 'strength-hero-card', 'hero-card-str', ['#a74638', '#ffc0a8', '#37140f', '#ff7a58'], 'ambient', 0.72),
  seed('roster_card_agility', '敏捷英雄卡', 'hero_roster_ui', '英雄卡片', 'agility-hero-card', 'hero-card-agi', ['#438f55', '#c9ffbd', '#14351b', '#9cff82'], 'ambient', 0.72),
  seed('roster_card_intellect', '智力英雄卡', 'hero_roster_ui', '英雄卡片', 'intellect-hero-card', 'hero-card-int', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'ambient', 0.72),
  seed('roster_card_universal', '全才英雄卡', 'hero_roster_ui', '英雄卡片', 'universal-hero-card', 'hero-card-all', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'ambient', 0.72),
  seed('roster_portrait_frame', '英雄头像框', 'hero_roster_ui', '头像 UI', 'portrait-frame', 'portrait-frame', ['#5d4a38', '#a98b68', '#251b13', '#d09b6c'], 'pulse', 0.68),
  seed('roster_selected_glow', '已选择光框', 'hero_roster_ui', '选择状态', 'selected-hero-glow', 'selected-glow', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'pulse', 0.7),
  seed('roster_banned_stamp', '禁用印章', 'hero_roster_ui', '禁用状态', 'banned-hero-stamp', 'banned-stamp', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.68),
  seed('roster_role_filter', '角色筛选钮', 'hero_roster_ui', '筛选 UI', 'role-filter-chip', 'role-filter', ['#6d55aa', '#d4c2ff', '#21183f', '#b896ff'], 'float', 0.66),
  seed('roster_random_button', '随机英雄按钮', 'hero_roster_ui', '选择按钮', 'random-hero-button', 'random-button', ['#3d9fc4', '#c8f6ff', '#123746', '#8defff'], 'spin', 0.66),
  seed('roster_lockin_seal', '锁定英雄印', 'hero_roster_ui', '锁定 UI', 'lockin-hero-seal', 'lockin-seal', ['#bd8c35', '#fff0a8', '#3e2c10', '#ffe56b'], 'impact', 0.7),

  // Leveling and talent UI
  seed('level_badge_one', '一级徽章', 'level_talent_ui', '等级 UI', 'level-one-badge', 'level-one', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'pulse', 0.62),
  seed('level_badge_max', '满级徽章', 'level_talent_ui', '等级 UI', 'level-max-badge', 'level-max', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'ambient', 0.66),
  seed('level_up_burst', '升级爆光', 'level_talent_ui', '升级反馈', 'level-up-burst', 'level-up', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'impact', 0.72),
  seed('talent_left_node', '左侧天赋点', 'level_talent_ui', '天赋 UI', 'talent-left-node', 'talent-left', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.64),
  seed('talent_right_node', '右侧天赋点', 'level_talent_ui', '天赋 UI', 'talent-right-node', 'talent-right', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.64),
  seed('talent_locked_node', '锁定天赋点', 'level_talent_ui', '天赋锁定', 'talent-locked-node', 'talent-lock', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.62),
  seed('talent_chosen_glow', '已选天赋光', 'level_talent_ui', '天赋状态', 'talent-chosen-glow', 'talent-glow', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'ambient', 0.66),
  seed('skill_point_plus', '技能点加号', 'level_talent_ui', '技能升级 UI', 'skill-point-plus', 'skill-plus', ['#3f8fd2', '#c7ecff', '#12304a', '#8bd8ff'], 'pulse', 0.62),
  seed('attribute_bonus_node', '属性加点', 'level_talent_ui', '属性 UI', 'attribute-bonus-node', 'attribute-bonus', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'ambient', 0.64),
  seed('xp_ring_progress', '经验环进度', 'level_talent_ui', '经验 UI', 'xp-ring-progress', 'xp-progress', ['#3d9fc4', '#c8f6ff', '#123746', '#8defff'], 'spin', 0.66),

  // Death recap and post-death UI
  seed('death_recap_panel', '死亡回放面板', 'death_recap_ui', '死亡 UI', 'death-recap-panel', 'death-panel', ['#3a2f34', '#b78f9f', '#120d10', '#ff8fa8'], 'ambient', 0.74),
  seed('death_killer_portrait', '击杀者头像框', 'death_recap_ui', '死亡 UI', 'killer-portrait-frame', 'killer-portrait', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.68),
  seed('death_damage_breakdown', '伤害构成条', 'death_recap_ui', '伤害 UI', 'damage-breakdown-bars', 'damage-breakdown', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'pulse', 0.7),
  seed('death_spell_source', '致死技能源', 'death_recap_ui', '来源 UI', 'death-spell-source', 'death-spell', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.66),
  seed('death_buyback_button', '买活按钮', 'death_recap_ui', '买活 UI', 'buyback-death-button', 'buyback-button', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'impact', 0.68),
  seed('death_respawn_countdown', '复活倒计时', 'death_recap_ui', '复活 UI', 'respawn-countdown-card', 'respawn-countdown', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'spin', 0.66),
  seed('death_gold_lost', '损失金币', 'death_recap_ui', '经济 UI', 'gold-lost-card', 'gold-lost', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'float', 0.64),
  seed('death_assist_list', '助攻列表', 'death_recap_ui', '事件 UI', 'assist-list-card', 'assist-list', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'ambient', 0.66),
  seed('death_timeline_tick', '死亡时间轴', 'death_recap_ui', '时间轴 UI', 'death-timeline-tick', 'death-timeline', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'pulse', 0.64),
  seed('death_tip_card', '死亡提示卡', 'death_recap_ui', '教学提示', 'death-tip-card', 'death-tip', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.64),

  // Scoreboard and team economy UI
  seed('score_team_header', '队伍比分头', 'scoreboard_ui', '比分 UI', 'team-score-header', 'team-score', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'ambient', 0.72),
  seed('score_kda_column', 'KDA 列', 'scoreboard_ui', '数据列', 'kda-column-card', 'kda-column', ['#5d4a38', '#a98b68', '#251b13', '#d09b6c'], 'pulse', 0.64),
  seed('score_lasthit_column', '补刀列', 'scoreboard_ui', '数据列', 'lasthit-column-card', 'lasthit-column', ['#6c8b55', '#c1e28f', '#24381d', '#aaff88'], 'pulse', 0.64),
  seed('score_networth_column', '经济列', 'scoreboard_ui', '数据列', 'networth-column-card', 'networth-column', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'pulse', 0.64),
  seed('score_item_strip', '装备横条', 'scoreboard_ui', '装备 UI', 'score-item-strip', 'item-strip', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'ambient', 0.66),
  seed('score_alive_dot', '存活圆点', 'scoreboard_ui', '状态 UI', 'alive-dot-card', 'alive-dot', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.6),
  seed('score_dead_dot', '死亡圆点', 'scoreboard_ui', '状态 UI', 'dead-dot-card', 'dead-dot', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.6),
  seed('score_mute_toggle', '静音按钮', 'scoreboard_ui', '社交 UI', 'mute-toggle-card', 'mute-toggle', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.62),
  seed('score_glyph_timer', '防御符文计时', 'scoreboard_ui', '团队计时', 'glyph-timer-card', 'glyph-timer', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'spin', 0.64),
  seed('score_scan_timer', '扫描计时', 'scoreboard_ui', '团队计时', 'scan-timer-card', 'scan-timer', ['#3d9fc4', '#c8f6ff', '#123746', '#8defff'], 'spin', 0.64),

  // Match flow, lobby, loading, and results UI
  seed('flow_loading_emblem', '载入徽章', 'match_flow_ui', '载入 UI', 'loading-emblem-card', 'loading-emblem', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'spin', 0.74),
  seed('flow_versus_banner', '对阵旗帜', 'match_flow_ui', '赛前 UI', 'versus-banner-card', 'versus-banner', ['#4b3d91', '#cdb9ff', '#181431', '#d8c2ff'], 'impact', 0.72),
  seed('flow_strategy_timer', '策略倒计时', 'match_flow_ui', '赛前 UI', 'strategy-timer-card', 'strategy-timer', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'spin', 0.66),
  seed('flow_lane_suggestion', '分路建议卡', 'match_flow_ui', '赛前 UI', 'lane-suggestion-card', 'lane-suggest', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.68),
  seed('flow_pause_banner', '暂停横幅', 'match_flow_ui', '比赛 UI', 'pause-banner-card', 'pause-banner', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'pulse', 0.68),
  seed('flow_disconnect_notice', '掉线提示', 'match_flow_ui', '比赛 UI', 'disconnect-notice-card', 'disconnect', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.68),
  seed('flow_victory_panel', '胜利结算板', 'match_flow_ui', '结算 UI', 'victory-panel-card', 'victory-panel', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'ambient', 0.74),
  seed('flow_defeat_panel', '失败结算板', 'match_flow_ui', '结算 UI', 'defeat-panel-card', 'defeat-panel', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'ambient', 0.74),
  seed('flow_mvp_card', 'MVP 卡片', 'match_flow_ui', '结算 UI', 'mvp-card-panel', 'mvp-card', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'pulse', 0.7),
  seed('flow_rewards_panel', '奖励结算板', 'match_flow_ui', '结算 UI', 'rewards-panel-card', 'rewards-panel', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.7),

  // Cursor and command affordances
  seed('cursor_move', '移动指针', 'cursor_commands', '鼠标命令', 'move-cursor-command', 'cursor-move', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.62),
  seed('cursor_attack', '攻击指针', 'cursor_commands', '鼠标命令', 'attack-cursor-command', 'cursor-attack', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.62),
  seed('cursor_cast', '施法指针', 'cursor_commands', '鼠标命令', 'cast-cursor-command', 'cursor-cast', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.62),
  seed('cursor_target_ally', '友方目标指针', 'cursor_commands', '鼠标命令', 'ally-cursor-command', 'cursor-ally', ['#3f9f6c', '#c8ffd7', '#12381f', '#8effa9'], 'pulse', 0.62),
  seed('cursor_target_enemy', '敌方目标指针', 'cursor_commands', '鼠标命令', 'enemy-cursor-command', 'cursor-enemy', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'impact', 0.62),
  seed('cursor_invalid', '无效指针', 'cursor_commands', '鼠标命令', 'invalid-cursor-command', 'cursor-invalid', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.62),
  seed('cursor_shop', '商店指针', 'cursor_commands', '鼠标命令', 'shop-cursor-command', 'cursor-shop', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'float', 0.62),
  seed('cursor_pickup', '拾取指针', 'cursor_commands', '鼠标命令', 'pickup-cursor-command', 'cursor-pickup', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'float', 0.62),
  seed('cursor_drag_camera', '拖拽镜头指针', 'cursor_commands', '鼠标命令', 'drag-camera-cursor', 'cursor-camera', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'ambient', 0.62),
  seed('cursor_ping', '信号指针', 'cursor_commands', '鼠标命令', 'ping-cursor-command', 'cursor-ping', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'spin', 0.62),

  // System notifications
  seed('notice_error_toast', '错误提示条', 'system_notifications', '系统提示', 'error-toast-card', 'error-toast', ['#7a4040', '#ffb0a0', '#2a1010', '#ff7058'], 'impact', 0.66),
  seed('notice_success_toast', '成功提示条', 'system_notifications', '系统提示', 'success-toast-card', 'success-toast', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.66),
  seed('notice_warning_toast', '警告提示条', 'system_notifications', '系统提示', 'warning-toast-card', 'warning-toast', ['#d1a04b', '#fff0a0', '#4b3413', '#ffe78a'], 'impact', 0.66),
  seed('notice_inventory_full', '背包已满提示', 'system_notifications', '系统提示', 'inventory-full-toast', 'inventory-full', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'pulse', 0.66),
  seed('notice_no_mana', '法力不足提示', 'system_notifications', '系统提示', 'no-mana-toast', 'no-mana', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'impact', 0.66),
  seed('notice_cooldown', '冷却中提示', 'system_notifications', '系统提示', 'cooldown-toast', 'cooldown-toast', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'spin', 0.66),
  seed('notice_saved_replay', '录像保存提示', 'system_notifications', '系统提示', 'replay-saved-toast', 'replay-saved', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'float', 0.66),
  seed('notice_settings_changed', '设置变更提示', 'system_notifications', '系统提示', 'settings-changed-toast', 'settings-changed', ['#5a5d78', '#d4d8ff', '#1c1e30', '#b8c2ff'], 'float', 0.66),
  seed('notice_party_invite', '组队邀请提示', 'system_notifications', '社交提示', 'party-invite-toast', 'party-invite', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.66),
  seed('notice_network_lag', '网络延迟提示', 'system_notifications', '系统提示', 'network-lag-toast', 'network-lag', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'impact', 0.66),

  // Tutorial and onboarding guide markers
  seed('guide_move_step', '移动教学标记', 'tutorial_guides', '教程引导', 'guide-move-step', 'guide-move', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.66),
  seed('guide_attack_step', '攻击教学标记', 'tutorial_guides', '教程引导', 'guide-attack-step', 'guide-attack', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.66),
  seed('guide_cast_step', '施法教学标记', 'tutorial_guides', '教程引导', 'guide-cast-step', 'guide-cast', ['#604ed0', '#d4c8ff', '#1d174a', '#b9a0ff'], 'pulse', 0.66),
  seed('guide_shop_step', '商店教学标记', 'tutorial_guides', '教程引导', 'guide-shop-step', 'guide-shop', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'float', 0.66),
  seed('guide_lane_step', '分路教学标记', 'tutorial_guides', '教程引导', 'guide-lane-step', 'guide-lane', ['#6c8b55', '#c1e28f', '#24381d', '#aaff88'], 'float', 0.66),
  seed('guide_ward_step', '插眼教学标记', 'tutorial_guides', '教程引导', 'guide-ward-step', 'guide-ward', ['#4f8b6f', '#c6ffe2', '#18362a', '#9affc9'], 'pulse', 0.66),
  seed('guide_roshan_step', 'Boss 教学标记', 'tutorial_guides', '教程引导', 'guide-boss-step', 'guide-boss', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 0.66),
  seed('guide_objective_step', '目标教学标记', 'tutorial_guides', '教程引导', 'guide-objective-step', 'guide-objective', ['#b89442', '#fff0a8', '#4a3512', '#fff4be'], 'ambient', 0.66),
  seed('guide_hotkey_hint', '快捷键提示', 'tutorial_guides', '教程提示', 'guide-hotkey-hint', 'guide-hotkey', ['#3f82c0', '#c7ecff', '#12304a', '#8bd8ff'], 'pulse', 0.66),
  seed('guide_completion_badge', '教程完成章', 'tutorial_guides', '教程完成', 'guide-completion-badge', 'guide-complete', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'ambient', 0.68),

  // UI badges and icons
  seed('ui_role_carry', '核心定位', 'ui_badges', '角色徽章', 'sword-role-badge', 'carry-sword', ['#b8793b', '#ffd59b', '#3b2412', '#ffbe7c'], 'ambient', 0.76),
  seed('ui_role_support', '辅助定位', 'ui_badges', '角色徽章', 'hand-role-badge', 'support-hand', ['#3f8f72', '#c6ffd9', '#123423', '#9affb9'], 'ambient', 0.76),
  seed('ui_role_tank', '坦克定位', 'ui_badges', '角色徽章', 'shield-role-badge', 'tank-shield', ['#8d7b58', '#e2cf9f', '#2d2518', '#ffe0a0'], 'ambient', 0.76),
  seed('ui_role_ganker', '游走定位', 'ui_badges', '角色徽章', 'dagger-role-badge', 'ganker-dagger', ['#6d55aa', '#d4c2ff', '#21183f', '#b896ff'], 'ambient', 0.76),
  seed('ui_primary_str', '力量属性', 'ui_badges', '属性徽章', 'red-fist-badge', 'str-fist', ['#a74638', '#ffc0a8', '#37140f', '#ff7a58'], 'pulse', 0.74),
  seed('ui_primary_agi', '敏捷属性', 'ui_badges', '属性徽章', 'green-wing-badge', 'agi-wing', ['#438f55', '#c9ffbd', '#14351b', '#9cff82'], 'pulse', 0.74),
  seed('ui_primary_int', '智力属性', 'ui_badges', '属性徽章', 'blue-eye-badge', 'int-eye', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'pulse', 0.74),
  seed('ui_shop_secret', '秘店标记', 'ui_badges', '商店徽章', 'hooded-shop-badge', 'secret-shop-eye', ['#72533c', '#d9bd7e', '#2c1f16', '#ffd782'], 'float', 0.76),
  seed('ui_cooldown_ready', '冷却就绪', 'ui_badges', '状态徽章', 'ready-check-badge', 'ready-check', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'pulse', 0.74),
  seed('ui_cooldown_locked', '冷却锁定', 'ui_badges', '状态徽章', 'locked-hourglass-badge', 'locked-hourglass', ['#79646c', '#d6b8c8', '#2c2228', '#e5b3cc'], 'impact', 0.74),

  // Terrain and tile materials
  seed('terrain_lane_stone', '兵线路面', 'terrain_tiles', '地貌块', 'flat-lane-stone-tile', 'lane-stone', ['#4e5147', '#a5a98e', '#1d201a', '#c8d19c'], 'idle', 0.92),
  seed('terrain_river_water', '河道水面', 'terrain_tiles', '地貌块', 'flat-river-water-tile', 'river-water', ['#306d7d', '#b8edf7', '#0f2a32', '#8defff'], 'pulse', 0.92),
  seed('terrain_jungle_grass', '野区草地', 'terrain_tiles', '地貌块', 'flat-jungle-grass-tile', 'jungle-grass', ['#315f3b', '#83c777', '#16301d', '#9cff82'], 'ambient', 0.92),
  seed('terrain_highground_edge', '高地边缘', 'terrain_tiles', '地貌块', 'stepped-highground-tile', 'highground-edge', ['#6a5a43', '#c5a76b', '#2a2116', '#d9bd7e'], 'idle', 0.96),
  seed('terrain_ancient_floor', '基地地砖', 'terrain_tiles', '地貌块', 'ancient-floor-tile', 'ancient-floor', ['#625544', '#d6bf83', '#2a2217', '#ffe08a'], 'ambient', 0.94),
  seed('terrain_roshan_pit', '深渊巢穴', 'terrain_tiles', '地貌块', 'dark-pit-tile', 'pit-crack', ['#342b2c', '#8f6e65', '#111010', '#ff8a5a'], 'ambient', 0.96),
  seed('terrain_secret_shop', '秘店地毯', 'terrain_tiles', '地貌块', 'shop-carpet-tile', 'shop-carpet', ['#6f4938', '#d2a06f', '#261711', '#ffc985'], 'idle', 0.9),
  seed('terrain_rune_pad', '神符圆台', 'terrain_tiles', '地貌块', 'rune-pad-tile', 'rune-pad', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'pulse', 0.92),
  seed('terrain_cliff_shadow', '峭壁阴影', 'terrain_tiles', '地貌块', 'cliff-shadow-tile', 'cliff-shadow', ['#2c342e', '#758274', '#111611', '#9ca88f'], 'idle', 0.9),
  seed('terrain_fountain_glow', '泉水光面', 'terrain_tiles', '地貌块', 'fountain-glow-tile', 'fountain-glow', ['#3f8f97', '#bffaff', '#17383c', '#9ff3ff'], 'pulse', 0.94),
  seed('terrain_flat_plain', '平地草原', 'terrain_tiles', '平地', 'flat-plain-tile', 'plain-ground', ['#465f38', '#a6c878', '#182614', '#c8e88a'], 'idle', 0.92),
  seed('terrain_flat_dirt', '平地泥路', 'terrain_tiles', '平地', 'flat-dirt-tile', 'dirt-ground', ['#6b5138', '#c2945e', '#26190e', '#d6a56f'], 'idle', 0.92),
  seed('terrain_flat_sand', '平地砂土', 'terrain_tiles', '平地', 'flat-sand-tile', 'sand-ground', ['#8a744d', '#ddc286', '#332711', '#f0d99c'], 'idle', 0.92),
  seed('terrain_flower_meadow', '花草地', 'terrain_tiles', '花草地', 'flower-meadow-tile', 'flower-meadow', ['#4f773d', '#e7c06f', '#173018', '#ffb0a0'], 'pulse', 0.92),
  seed('terrain_grass_edge', '草地边缘', 'terrain_tiles', '草地', 'grass-edge-tile', 'grass-edge', ['#375f34', '#a9dc7a', '#132914', '#9cff82'], 'idle', 0.92),
  seed('terrain_highground_plateau', '高地平台', 'terrain_tiles', '高地', 'highground-plateau-tile', 'highground-plateau', ['#6a5a43', '#c5a76b', '#2a2116', '#d9bd7e'], 'ambient', 0.98),
  seed('terrain_slope_grass', '草坡', 'terrain_tiles', '坡地', 'grass-slope-tile', 'slope-grass', ['#3f773c', '#a9dc7a', '#142d16', '#9cff82'], 'idle', 0.94),
  seed('terrain_slope_stone', '石坡', 'terrain_tiles', '坡地', 'stone-slope-tile', 'slope-stone', ['#5d6158', '#b7bea8', '#1e211c', '#d2d8bd'], 'idle', 0.96),
  seed('terrain_ramp_highground', '高地坡道', 'terrain_tiles', '坡道', 'highground-ramp-tile', 'ramp-highground', ['#745f43', '#caa76b', '#2b2114', '#d9bd7e'], 'ambient', 1),
  seed('terrain_riverbank_mud', '河岸泥滩', 'terrain_tiles', '河岸', 'riverbank-mud-tile', 'riverbank-mud', ['#4b6570', '#a5c7d4', '#1a2c31', '#8fdcff'], 'pulse', 0.94),
  seed('terrain_river_shallow', '浅水河床', 'terrain_tiles', '河道', 'shallow-riverbed-tile', 'river-shallow', ['#306d7d', '#b8edf7', '#0f2a32', '#8defff'], 'pulse', 0.94),
  seed('terrain_fence_foundation', '栅栏地基', 'terrain_tiles', '栅栏地形', 'fence-foundation-tile', 'fence-foundation', ['#6d4d32', '#c99861', '#25170d', '#ffd08a'], 'idle', 0.92),

  // Minimap and tactical markers
  seed('minimap_hero_ally', '友方英雄点', 'minimap_markers', '小地图标记', 'green-hero-dot', 'ally-dot', ['#3f9f6c', '#c8ffd7', '#12381f', '#8effa9'], 'pulse', 0.62),
  seed('minimap_hero_enemy', '敌方英雄点', 'minimap_markers', '小地图标记', 'red-hero-dot', 'enemy-dot', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'pulse', 0.62),
  seed('minimap_tower_ally', '友方塔点', 'minimap_markers', '建筑标记', 'green-tower-marker', 'ally-tower', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'ambient', 0.64),
  seed('minimap_tower_enemy', '敌方塔点', 'minimap_markers', '建筑标记', 'red-tower-marker', 'enemy-tower', ['#9f4f42', '#ffc8b5', '#331713', '#ff8a6c'], 'ambient', 0.64),
  seed('minimap_rune_marker', '神符标记', 'minimap_markers', '资源标记', 'rune-map-marker', 'rune-marker', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'spin', 0.64),
  seed('minimap_roshan_marker', 'Boss 标记', 'minimap_markers', '目标标记', 'boss-map-marker', 'boss-marker', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 0.66),
  seed('minimap_ping_attack', '进攻信号', 'minimap_markers', '战术信号', 'attack-ping-marker', 'attack-ping', ['#b68132', '#ffe28a', '#3e2810', '#ffd46b'], 'impact', 0.66),
  seed('minimap_ping_retreat', '撤退信号', 'minimap_markers', '战术信号', 'retreat-ping-marker', 'retreat-ping', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'impact', 0.66),
  seed('minimap_ward_seen', '视野标记', 'minimap_markers', '视野信号', 'ward-seen-marker', 'ward-seen', ['#4f8b6f', '#c6ffe2', '#18362a', '#9affc9'], 'pulse', 0.64),
  seed('minimap_smoke_path', '烟雾路线', 'minimap_markers', '路线信号', 'smoke-path-marker', 'smoke-path', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'float', 0.64),

  // Team banners and faction markers
  seed('banner_dawn_standard', '晨曦战旗', 'team_banners', '阵营旗帜', 'gold-team-standard', 'dawn-banner', ['#c99a3b', '#f4d36a', '#6f4a20', '#ffe58a'], 'float', 0.9),
  seed('banner_night_standard', '永夜战旗', 'team_banners', '阵营旗帜', 'violet-team-standard', 'night-banner', ['#5b4aa0', '#a58cff', '#241c46', '#bba0ff'], 'float', 0.9),
  seed('banner_kill_streak', '连杀旌旗', 'team_banners', '战况旗帜', 'kill-streak-banner', 'streak-mark', ['#b9483d', '#ffc0a8', '#3e1510', '#ff7a58'], 'impact', 0.86),
  seed('banner_tower_taken', '破塔旌旗', 'team_banners', '战况旗帜', 'tower-taken-banner', 'tower-mark', ['#8f6d45', '#e8c584', '#302010', '#ffd98a'], 'ambient', 0.86),
  seed('banner_roshan_taken', 'Boss 击杀旗', 'team_banners', '战况旗帜', 'boss-taken-banner', 'boss-mark', ['#60343a', '#d9906f', '#190d10', '#ff8a5a'], 'impact', 0.88),
  seed('banner_lane_push', '推进旗', 'team_banners', '战术旗帜', 'lane-push-banner', 'push-arrow', ['#4f9f78', '#caffdc', '#143424', '#9affbf'], 'float', 0.84),
  seed('banner_defense_call', '防守旗', 'team_banners', '战术旗帜', 'defense-call-banner', 'defense-shield', ['#4b70bb', '#c8dcff', '#15264b', '#9cc4ff'], 'float', 0.84),
  seed('banner_smoke_gank', '开雾旗', 'team_banners', '战术旗帜', 'smoke-gank-banner', 'smoke-mark', ['#6b55a8', '#d7c7ff', '#21183f', '#b896ff'], 'ambient', 0.84),
  seed('banner_objective_ping', '目标旗', 'team_banners', '战术旗帜', 'objective-ping-banner', 'objective-eye', ['#465d86', '#b8d4ff', '#17233a', '#9ed3ff'], 'pulse', 0.84),
  seed('banner_victory', '胜利旗', 'team_banners', '结算旗帜', 'victory-banner', 'victory-star', ['#d7b251', '#fff0a6', '#533d15', '#fff5b5'], 'ambient', 0.88),
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

export const RESOURCE3D_SAMPLE_ASSETS: Resource3DAssetSpec[] = seeds.map((item, index) => {
  const laneReadability = laneReadabilityFor(item);
  const wildReadability = wildReadabilityFor(item);
  const supportReadability = supportReadabilityFor(item);
  return {
    key: item.key,
    name: item.name,
    category: item.category,
    role: item.role,
    silhouette: item.silhouette,
    motif: item.motif,
    scale: item.scale ?? 1,
    palette: item.palette,
    textureChannels: RESOURCE3D_TEXTURE_CHANNELS,
    texture: textureSpecFor(item.category),
    previewMotion: item.motion,
    laneReadability,
    wildReadability,
    supportReadability,
    parts: makeParts(item, index, laneReadability, wildReadability, supportReadability),
  };
});

function makeParts(
  item: ResourceSeed,
  index: number,
  laneReadability?: ResourceLaneReadabilitySpec,
  wildReadability?: ResourceWildReadabilitySpec,
  supportReadability?: ResourceSupportReadabilitySpec,
): Resource3DPartSpec[] {
  const [primary, accent, dark, glow] = item.palette;
  const tall = isStructureCategory(item.category)
    ? 1.35
    : item.category === 'boss_objectives'
      ? 1.2
      : isIconCategory(item.category)
        ? 0.58
        : isMapCategory(item.category)
          ? 1.05
          : 0.92;
  const wide = isFxCategory(item.category) || isItemCategory(item.category)
    ? 0.72
    : isIconCategory(item.category) || item.category === 'pickups_drops'
      ? 0.5
      : 0.58;
  const rowVariance = (index % 3) * 0.05;
  const base: Resource3DPartSpec[] = [
    part('display base', 'base', dark, [0.72 + wide * 0.2, 0.08, 0.72 + wide * 0.2], [0, 0.04, 0]),
    part('main mass', bodyKind(item.category), primary, [0.52 + wide * 0.28, tall, 0.42 + wide * 0.18], [0, 0.62 + tall * 0.12, 0]),
    part('top read', topKind(item.category), accent, [0.42, 0.38 + rowVariance, 0.42], [0, 1.35 + tall * 0.24, 0], glow),
    part('left read accent', sideKind(item.category), accent, [0.12, 0.8, 0.12], [-0.55 - wide * 0.16, 0.86, -0.06], glow, [0.25, 0, 0.42]),
    part('right read accent', sideKind(item.category), accent, [0.12, 0.8, 0.12], [0.55 + wide * 0.16, 0.86, -0.06], glow, [0.25, 0, -0.42]),
    part('motif glow', 'orb', accent, [0.16, 0.16, 0.16], [0.34, 1.18, -0.36], glow),
  ];

  if (isFxCategory(item.category)) {
    base.push(part('spell ring', 'ring', accent, [0.95, 0.06, 0.95], [0, 0.16, 0], glow));
    base.push(part('spell beam', 'beam', glow, [0.22, 1.35, 0.22], [0, 0.92, 0], glow));
  } else if (isStructureCategory(item.category)) {
    base.push(part('roof plate', 'plate', accent, [0.94, 0.12, 0.74], [0, 1.55, 0], glow));
    base.push(part('team banner', 'banner', dark, [0.56, 0.08, 0.8], [0, 0.9, 0.48], glow, [0.25, 0, 0]));
  } else if (isItemCategory(item.category) || item.category === 'pickups_drops') {
    base.push(part('relic ring', 'ring', accent, [0.82, 0.05, 0.82], [0, 0.2, 0], glow));
    base.push(part('gem core', 'orb', accent, [0.24, 0.24, 0.24], [0, 1.06, -0.32], glow));
  } else if (isMapCategory(item.category)) {
    base.push(part('ground scatter', 'plate', dark, [0.78, 0.06, 0.44], [0, 0.18, 0.32]));
    base.push(part('ambient mote', 'orb', accent, [0.12, 0.12, 0.12], [-0.38, 1.12, -0.28], glow));
  } else if (isIconCategory(item.category)) {
    base.push(part('icon face plate', 'plate', accent, [0.78, 0.1, 0.78], [0, 0.82, -0.12], glow, [Math.PI / 2, 0, 0]));
    base.push(part('icon glint', 'orb', glow, [0.12, 0.12, 0.12], [-0.28, 1.02, -0.34], glow));
  } else {
    base.push(part('shoulder plate', 'plate', accent, [0.88, 0.12, 0.26], [0, 1.02, -0.16], glow));
    base.push(part('ground rune', 'ring', accent, [0.72, 0.05, 0.72], [0, 0.13, 0], glow));
  }
  if (laneReadability) base.push(...v5LaneUnitParts(item, laneReadability, primary, accent, dark, glow));
  if (wildReadability) base.push(...v5WildParts(item, wildReadability, primary, accent, dark, glow));
  if (supportReadability) base.push(...v5SupportParts(item, supportReadability, primary, accent, dark, glow));
  return base;
}

function v5LaneUnitParts(
  item: ResourceSeed,
  read: ResourceLaneReadabilitySpec,
  primary: string,
  accent: string,
  dark: string,
  glow: string,
): Resource3DPartSpec[] {
  const side = read.teamRead === 'night' ? -1 : 1;
  const roleScale = read.roleClass === 'siege' ? 1.28 : read.roleClass === 'super' ? 1.12 : 1;
  const attackKind: Resource3DPartKind = read.roleClass === 'ranged' || read.roleClass === 'scout' ? 'beam' : 'weapon';
  return [
    part(`v5 lane ${item.key} formation banner`, 'banner', read.teamRead === 'night' ? dark : accent, [0.34 * roleScale, 0.06, 0.82 * roleScale], [side * 0.42, 1.02, 0.54], glow, [0.18, 0, side * 0.08]),
    part(`v5 lane ${item.key} role attack read`, attackKind, glow, [0.14, read.roleClass === 'siege' ? 1.18 : 0.92, 0.14], [side * 0.68, 0.96, -0.18], glow, [0.34, 0, side * -0.42]),
    part(`v5 lane ${item.key} team trim plate`, 'plate', primary, [0.7 * roleScale, 0.08, 0.2], [0, 0.95, -0.34], glow, [Math.PI / 2, 0, 0]),
    part(`v5 lane ${item.key} formation foot rune`, 'ring', accent, [0.72 * roleScale, 0.05, 0.72 * roleScale], [0, 0.16, 0], glow),
  ];
}

function laneReadabilityFor(item: ResourceSeed): ResourceLaneReadabilitySpec | undefined {
  if (item.category !== 'lane_units') return undefined;
  const teamRead: ResourceLaneTeamRead = item.key.startsWith('dawn_')
    ? 'dawn'
    : item.key.startsWith('night_')
      ? 'night'
      : 'neutral';
  const roleClass: ResourceLaneRoleClass = item.key.includes('melee')
    ? 'melee'
    : item.key.includes('ranged')
      ? 'ranged'
      : item.key.includes('siege')
        ? 'siege'
        : item.key.includes('super')
          ? 'super'
          : item.key.includes('scout')
            ? 'scout'
            : 'utility';
  const formationSlot: Record<ResourceLaneRoleClass, string> = {
    melee: 'frontline body-block slot',
    ranged: 'backline projectile slot',
    siege: 'rear siege footprint slot',
    super: 'frontline elite pressure slot',
    utility: 'center banner support slot',
    scout: 'offset vision probe slot',
  };
  const attackRead: Record<ResourceLaneRoleClass, string> = {
    melee: 'short weapon arc',
    ranged: 'thin projectile beam',
    siege: 'low heavy launcher',
    super: 'large elite strike',
    utility: 'banner aura pulse',
    scout: 'small vision spark',
  };
  return {
    teamRead,
    roleClass,
    formationSlot: formationSlot[roleClass],
    attackRead: attackRead[roleClass],
    silhouetteAnchors: [
      'main mass',
      'top read',
      `v5 lane ${item.key} formation banner`,
      `v5 lane ${item.key} role attack read`,
      `v5 lane ${item.key} team trim plate`,
      `v5 lane ${item.key} formation foot rune`,
    ],
  };
}

function v5WildParts(
  item: ResourceSeed,
  read: ResourceWildReadabilitySpec,
  primary: string,
  accent: string,
  dark: string,
  glow: string,
): Resource3DPartSpec[] {
  const heavy = read.tier === 'boss' || read.tier === 'ancient' || read.tier === 'large';
  const bossy = read.tier === 'boss' || read.tier === 'objective';
  const side = read.biome === 'sky' || read.packRole === 'flying' ? -1 : 1;
  return [
    part(`v5 wild ${item.key} tier crown`, bossy ? 'banner' : 'plate', accent, [heavy ? 0.86 : 0.62, 0.08, heavy ? 0.36 : 0.28], [0, heavy ? 1.76 : 1.54, -0.05], glow, [Math.PI / 2, 0, 0]),
    part(`v5 wild ${item.key} threat limb`, read.packRole === 'caster' || read.packRole === 'objective-mechanic' ? 'beam' : 'weapon', glow, [0.14, heavy ? 1.1 : 0.82, 0.14], [side * (heavy ? 0.78 : 0.64), 0.94, -0.18], glow, [0.36, 0, side * -0.46]),
    part(`v5 wild ${item.key} biome back read`, 'banner', read.biome === 'demonic' ? dark : primary, [heavy ? 0.74 : 0.54, 0.06, heavy ? 0.94 : 0.72], [side * 0.12, 1.08, 0.62], glow, [0.18, 0, side * 0.1]),
    part(`v5 wild ${item.key} threat core`, 'orb', accent, [heavy ? 0.24 : 0.18, heavy ? 0.24 : 0.18, heavy ? 0.24 : 0.18], [side * 0.32, 1.24, -0.4], glow),
    part(`v5 wild ${item.key} camp footprint`, 'ring', accent, [heavy ? 0.92 : 0.74, 0.05, heavy ? 0.92 : 0.74], [0, 0.17, 0], glow),
  ];
}

function wildReadabilityFor(item: ResourceSeed): ResourceWildReadabilitySpec | undefined {
  if (item.category !== 'neutral_units' && item.category !== 'boss_objectives') return undefined;
  const tier = wildTierFor(item);
  const biome = wildBiomeFor(item);
  const packRole = wildPackRoleFor(item);
  return {
    tier,
    biome,
    packRole,
    threatRead: wildThreatReadFor(tier, biome, packRole),
    silhouetteAnchors: [
      'main mass',
      'top read',
      `v5 wild ${item.key} tier crown`,
      `v5 wild ${item.key} threat limb`,
      `v5 wild ${item.key} biome back read`,
      `v5 wild ${item.key} threat core`,
      `v5 wild ${item.key} camp footprint`,
    ],
  };
}

function wildTierFor(item: ResourceSeed): ResourceWildTier {
  if (item.category === 'boss_objectives') return item.key.startsWith('boss_') ? 'boss' : 'objective';
  if (item.key.includes('ancient') || item.key.includes('turtle')) return 'ancient';
  if (item.key.includes('troll')) return 'large';
  if (item.key.includes('lizard')) return 'medium';
  if (item.key.includes('harpy') || item.key.includes('satyr')) return 'special';
  return 'small';
}

function wildBiomeFor(item: ResourceSeed): ResourceWildBiome {
  if (item.category === 'boss_objectives') {
    if (item.key.includes('pit') || item.key.includes('tormentor')) return 'demonic';
    if (item.key.includes('lotus') || item.key.includes('gate')) return 'river';
    return 'relic';
  }
  if (item.key.includes('turtle')) return 'river';
  if (item.key.includes('lizard') || item.key.includes('troll')) return 'stone';
  if (item.key.includes('harpy')) return 'sky';
  return 'forest';
}

function wildPackRoleFor(item: ResourceSeed): ResourceWildPackRole {
  if (item.category === 'boss_objectives') return item.key.startsWith('boss_') ? 'boss-core' : 'objective-mechanic';
  if (item.key.includes('alpha') || item.key.includes('elder') || item.key.includes('king')) return 'leader';
  if (item.key.includes('priest') || item.key.includes('satyr')) return 'caster';
  if (item.key.includes('harpy')) return 'flying';
  if (item.key.includes('ancient') || item.key.includes('turtle')) return 'ancient';
  return 'fodder';
}

function wildThreatReadFor(tier: ResourceWildTier, biome: ResourceWildBiome, role: ResourceWildPackRole): string {
  if (tier === 'boss') return 'large boss core and danger aura';
  if (tier === 'objective') return 'map objective mechanism glow';
  if (role === 'caster') return `${biome} caster projectile focus`;
  if (role === 'leader') return `${biome} leader crest and pack aura`;
  if (role === 'flying') return 'sky silhouette and dive threat';
  if (tier === 'ancient') return `${biome} ancient shell mass`;
  return `${biome} camp body and bite threat`;
}

function v5SupportParts(
  item: ResourceSeed,
  read: ResourceSupportReadabilitySpec,
  primary: string,
  accent: string,
  dark: string,
  glow: string,
): Resource3DPartSpec[] {
  const medium = read.priorityBand === 'medium';
  const ringScale = medium ? 0.78 : 0.62;
  const markerKind: Resource3DPartKind = read.roleClass === 'ward' || read.roleClass === 'trap' ? 'orb' : 'banner';
  return [
    part(`v5 support ${item.key} owner ring`, 'ring', accent, [ringScale, 0.045, ringScale], [0, 0.18, 0], glow),
    part(`v5 support ${item.key} owner marker`, markerKind, read.roleClass === 'trap' ? dark : primary, [medium ? 0.42 : 0.32, 0.055, medium ? 0.7 : 0.52], [0.26, medium ? 1.12 : 0.94, 0.42], glow, [0.18, 0, 0.18]),
    part(`v5 support ${item.key} interaction spark`, 'orb', accent, [0.14, 0.14, 0.14], [-0.34, medium ? 1.28 : 1.06, -0.34], glow),
    part(`v5 support ${item.key} expire tick`, 'beam', glow, [0.08, medium ? 0.76 : 0.56, 0.08], [0.48, 0.74, -0.12], glow, [0.26, 0, -0.34]),
  ];
}

function supportReadabilityFor(item: ResourceSeed): ResourceSupportReadabilitySpec | undefined {
  if (item.category !== 'couriers_summons' && item.category !== 'wards_traps') return undefined;
  const roleClass = supportRoleFor(item);
  const priorityBand: ResourceSupportPriorityBand = roleClass === 'summon' || roleClass === 'totem' ? 'medium' : 'low';
  return {
    roleClass,
    ownerRead: supportOwnerReadFor(item, roleClass),
    interactionRead: supportInteractionReadFor(roleClass),
    expireCue: roleClass === 'courier' ? 'persistent service unit' : 'subtle timed fade cue',
    priorityBand,
    visualPriority: priorityBand === 'medium' ? 0.56 : 0.42,
    silhouetteAnchors: [
      'main mass',
      'top read',
      `v5 support ${item.key} owner ring`,
      `v5 support ${item.key} owner marker`,
      `v5 support ${item.key} interaction spark`,
      `v5 support ${item.key} expire tick`,
    ],
  };
}

function supportRoleFor(item: ResourceSeed): ResourceSupportRoleClass {
  if (item.key.includes('courier')) return 'courier';
  if (item.key.includes('illusion')) return 'illusion';
  if (item.key.includes('totem') || item.key.includes('healing_ward') || item.key.includes('serpent')) return 'totem';
  if (item.key.includes('trap') || item.key.includes('mine')) return 'trap';
  if (item.key.includes('ward') || item.key.includes('beacon') || item.key.includes('lantern')) return 'ward';
  return 'summon';
}

function supportOwnerReadFor(item: ResourceSeed, role: ResourceSupportRoleClass): string {
  if (role === 'courier') return 'service unit team accent';
  if (role === 'trap') return 'placed hidden danger marker';
  if (role === 'ward') return 'placed vision ownership marker';
  if (role === 'illusion') return 'mirror owner echo';
  if (role === 'totem') return 'summoned utility totem';
  return `${item.role} owner-colored summon`;
}

function supportInteractionReadFor(role: ResourceSupportRoleClass): string {
  switch (role) {
    case 'courier': return 'non-combat delivery motion';
    case 'trap': return 'trigger radius and impact cue';
    case 'ward': return 'vision radius and reveal cue';
    case 'illusion': return 'low-priority copy marker';
    case 'totem': return 'utility aura pulse';
    case 'summon':
    default: return 'controlled unit attack cue';
  }
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
  return {
    name,
    kind,
    color,
    scale,
    position,
    emissive,
    rotation,
    material: materialForPart(name, kind),
    detail: detailForPart(name, kind),
  };
}

function textureSpecFor(category: Resource3DCategory): Resource3DTextureSpec {
  const detailLevel = isPriority3DCategory(category) ? 4 : 3;
  return {
    detailLevel,
    overlays: ['microGrain', 'motifInk', 'rimTrim', 'edgeWear', 'emissiveHotspots', 'materialMask'],
  };
}

function materialForPart(name: string, kind: Resource3DPartKind): Resource3DMaterialKind {
  if (kind === 'ring') return 'metal';
  if (kind === 'orb') return 'crystal';
  if (name.includes('base') || name.includes('ground') || name.includes('roof')) return 'stone';
  if (name.includes('banner')) return 'cloth';
  if (name.includes('mote') || name.includes('glow') || name.includes('beam')) return 'energy';
  if (name.includes('gem') || name.includes('orb')) return 'crystal';
  if (name.includes('scatter')) return 'foliage';
  if (name.includes('face')) return 'paper';
  switch (kind) {
    case 'weapon':
    case 'plate':
      return 'metal';
    case 'banner':
      return 'cloth';
    case 'beam':
      return 'energy';
    case 'prop':
      return 'wood';
    case 'base':
      return 'stone';
    case 'head':
    case 'body':
      return 'leather';
    default:
      return 'shadow';
  }
}

function detailForPart(name: string, kind: Resource3DPartKind): Resource3DDetailKind {
  if (name.includes('rune') || name.includes('ring')) return 'rune';
  if (name.includes('banner')) return 'bannerGlyph';
  if (name.includes('mote') || name.includes('glow') || name.includes('gem') || name.includes('orb')) return 'sparkCore';
  if (name.includes('beam')) return 'circuit';
  if (name.includes('scatter')) return 'leafVein';
  if (name.includes('base') || name.includes('roof')) return 'edgeWear';
  if (name.includes('main')) return 'scalePattern';
  if (kind === 'beam') return 'circuit';
  if (kind === 'ring') return 'rune';
  if (kind === 'banner') return 'bannerGlyph';
  if (kind === 'plate') return 'trim';
  return 'plain';
}

function bodyKind(category: Resource3DCategory): Resource3DPartKind {
  if (category === 'spell_fx'
    || category === 'aoe_indicators'
    || category === 'environment_fx'
    || category === 'targeting_reticles'
    || category === 'screen_overlays'
    || category === 'cursor_commands') return 'beam';
  if (category === 'projectiles' || isItemCategory(category) || category === 'pickups_drops') return 'weapon';
  if (isMapCategory(category) || category === 'shops_npcs' || category === 'team_banners') return 'prop';
  if (isIconCategory(category)) return 'plate';
  return 'body';
}

function topKind(category: Resource3DCategory): Resource3DPartKind {
  if (isStructureCategory(category) || isIconCategory(category)) return 'plate';
  if (isItemCategory(category) || isFxCategory(category) || category === 'pickups_drops') return 'orb';
  if (isMapCategory(category) || category === 'team_banners') return 'banner';
  return 'head';
}

function sideKind(category: Resource3DCategory): Resource3DPartKind {
  if (isStructureCategory(category) || isMapCategory(category) || category === 'team_banners') return 'banner';
  if (isItemCategory(category) || isFxCategory(category) || category === 'pickups_drops') return 'beam';
  return 'weapon';
}

function isStructureCategory(category: Resource3DCategory): boolean {
  return category === 'buildings' || category === 'boss_objectives' || category === 'shops_npcs';
}

function isItemCategory(category: Resource3DCategory): boolean {
  return category === 'items'
    || category === 'item_components'
    || category === 'consumables'
    || category === 'wards_traps';
}

function isFxCategory(category: Resource3DCategory): boolean {
  return category === 'spell_fx'
    || category === 'projectiles'
    || category === 'aoe_indicators'
    || category === 'environment_fx'
    || category === 'targeting_reticles'
    || category === 'screen_overlays'
    || category === 'cursor_commands';
}

function isMapCategory(category: Resource3DCategory): boolean {
  return category === 'map_props' || category === 'terrain_tiles';
}

function isIconCategory(category: Resource3DCategory): boolean {
  return category === 'ui_badges'
    || category === 'minimap_markers'
    || category === 'ability_icons'
    || category === 'combat_numbers'
    || category === 'health_mana_ui'
    || category === 'announcements'
    || category === 'shop_inventory_ui'
    || category === 'sound_cue_markers'
    || category === 'hero_roster_ui'
    || category === 'level_talent_ui'
    || category === 'death_recap_ui'
    || category === 'scoreboard_ui'
    || category === 'match_flow_ui'
    || category === 'system_notifications'
    || category === 'tutorial_guides';
}

function isPriority3DCategory(category: Resource3DCategory): boolean {
  return category === 'lane_units'
    || category === 'neutral_units'
    || category === 'boss_objectives'
    || category === 'buildings'
    || category === 'couriers_summons'
    || category === 'map_props'
    || category === 'terrain_tiles'
    || category === 'spell_fx'
    || category === 'projectiles'
    || category === 'status_effects';
}
