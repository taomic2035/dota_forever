export const REQUIRED_HERO3D_ACTIONS = [
  'idle',
  'walk',
  'attack',
  'cast_q',
  'cast_w',
  'cast_e',
  'cast_r',
  'hit',
  'death',
] as const;

export const REQUIRED_HERO3D_TEXTURES = [
  'albedo',
  'normal',
  'orm',
  'emissive',
] as const;

export type Hero3DActionName = typeof REQUIRED_HERO3D_ACTIONS[number];
export type Hero3DTextureChannel = typeof REQUIRED_HERO3D_TEXTURES[number];
export type Hero3DPartKind =
  | 'body'
  | 'head'
  | 'shoulder'
  | 'cape'
  | 'weapon'
  | 'offhand'
  | 'sigil'
  | 'orb'
  | 'aura';

export interface Hero3DPartSpec {
  name: string;
  kind: Hero3DPartKind;
  color: string;
  emissive?: string;
  scale: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
}

export interface Hero3DTextureSpec {
  channel: Hero3DTextureChannel;
  palette: string[];
  motif: string;
}

export interface Hero3DActionSpec {
  name: Hero3DActionName;
  duration: number;
  motion: 'loop' | 'strike' | 'cast' | 'flinch' | 'fall';
}

export interface Hero3DAssetSpec {
  key: string;
  name: string;
  title: string;
  classicArchetype: string;
  model: {
    scale: number;
    silhouette: string;
    groundRadius: number;
    parts: Hero3DPartSpec[];
  };
  textures: Hero3DTextureSpec[];
  actions: Hero3DActionSpec[];
  previewCamera: {
    yaw: number;
    pitch: number;
    distance: number;
  };
}

function textures(primary: string, accent: string, glow: string, motif: string): Hero3DTextureSpec[] {
  return [
    { channel: 'albedo', palette: [primary, accent, '#1a2018'], motif },
    { channel: 'normal', palette: ['#8080ff', '#9ca8ff', '#6066aa'], motif: `${motif}-relief` },
    { channel: 'orm', palette: ['#4a4030', '#80725c', '#c8b889'], motif: `${motif}-material` },
    { channel: 'emissive', palette: [glow, '#050608', '#000000'], motif: `${motif}-glow` },
  ];
}

const actions: Hero3DActionSpec[] = REQUIRED_HERO3D_ACTIONS.map((name) => ({
  name,
  duration:
    name === 'idle' ? 1.8 :
    name === 'walk' ? 0.9 :
    name === 'death' ? 1.1 :
    name === 'hit' ? 0.35 :
    name === 'attack' ? 0.65 :
    0.8,
  motion:
    name === 'idle' || name === 'walk' ? 'loop' :
    name === 'death' ? 'fall' :
    name === 'hit' ? 'flinch' :
    name === 'attack' ? 'strike' :
    'cast',
}));

const basePreviewCamera = { yaw: 0.7, pitch: 0.78, distance: 7.6 };

const BASE_CLASSIC_HERO3D_ASSETS: Hero3DAssetSpec[] = [
  {
    key: 'rein',
    name: '雷恩',
    title: '铁壁卫士',
    classicArchetype: 'shield initiator tank',
    model: {
      scale: 1.12,
      silhouette: 'tower-shield',
      groundRadius: 1.05,
      parts: [
        { name: 'heavy cuirass', kind: 'body', color: '#c8a23c', scale: [1.25, 1.55, 0.8], position: [0, 1.05, 0] },
        { name: 'guard helm', kind: 'head', color: '#e6d398', scale: [0.72, 0.58, 0.72], position: [0, 2.05, 0] },
        { name: 'left pauldron', kind: 'shoulder', color: '#f0cf63', scale: [0.62, 0.28, 0.72], position: [-0.72, 1.55, 0] },
        { name: 'right pauldron', kind: 'shoulder', color: '#f0cf63', scale: [0.62, 0.28, 0.72], position: [0.72, 1.55, 0] },
        { name: 'tower shield', kind: 'offhand', color: '#d7b64d', scale: [0.18, 1.5, 0.95], position: [-1.05, 1.05, 0.28], rotation: [0, 0.18, -0.08] },
        { name: 'war hammer', kind: 'weapon', color: '#f7e08a', scale: [0.18, 1.3, 0.18], position: [1.08, 1.1, -0.18], rotation: [0.35, 0, -0.28] },
      ],
    },
    textures: textures('#c8a23c', '#f0cf63', '#ffe489', 'shield-cross'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'liya',
    name: '莉雅',
    title: '霜语者',
    classicArchetype: 'ice control support',
    model: {
      scale: 0.98,
      silhouette: 'ice-mantle',
      groundRadius: 0.82,
      parts: [
        { name: 'frost robe', kind: 'body', color: '#7ec8e3', scale: [0.88, 1.52, 0.72], position: [0, 0.98, 0] },
        { name: 'hood', kind: 'head', color: '#d7f7ff', scale: [0.58, 0.58, 0.58], position: [0, 1.95, 0] },
        { name: 'ice mantle', kind: 'cape', color: '#aeefff', scale: [1.35, 0.08, 0.95], position: [0, 1.34, 0.55] },
        { name: 'frost staff', kind: 'weapon', color: '#dbfbff', emissive: '#b9f6ff', scale: [0.12, 1.8, 0.12], position: [0.95, 1.1, -0.2], rotation: [0.12, 0, -0.22] },
        { name: 'ice orb', kind: 'orb', color: '#c8fbff', emissive: '#8feeff', scale: [0.36, 0.36, 0.36], position: [0.95, 2.05, -0.28] },
      ],
    },
    textures: textures('#7ec8e3', '#d7f7ff', '#9ff3ff', 'snowflake'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'zola',
    name: '佐拉',
    title: '雷霆先知',
    classicArchetype: 'lightning burst mage',
    model: {
      scale: 1,
      silhouette: 'forked-lightning-crown',
      groundRadius: 0.85,
      parts: [
        { name: 'storm robe', kind: 'body', color: '#5b7fe8', scale: [0.92, 1.48, 0.7], position: [0, 1, 0] },
        { name: 'storm mask', kind: 'head', color: '#aabfff', scale: [0.58, 0.56, 0.58], position: [0, 1.95, 0] },
        { name: 'lightning crown', kind: 'sigil', color: '#dce7ff', emissive: '#9eb8ff', scale: [1.05, 0.16, 0.16], position: [0, 2.38, 0] },
        { name: 'prophet staff', kind: 'weapon', color: '#b8c7ff', emissive: '#7fa4ff', scale: [0.12, 1.75, 0.12], position: [0.92, 1.1, -0.2], rotation: [0.08, 0, -0.16] },
        { name: 'storm orb', kind: 'orb', color: '#8fb4ff', emissive: '#6e9dff', scale: [0.42, 0.42, 0.42], position: [-0.72, 1.6, 0.12] },
      ],
    },
    textures: textures('#5b7fe8', '#aabfff', '#82a7ff', 'lightning-rune'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'aili',
    name: '艾莉',
    title: '疾风射手',
    classicArchetype: 'ranged agility carry',
    model: {
      scale: 0.94,
      silhouette: 'leaf-longbow',
      groundRadius: 0.78,
      parts: [
        { name: 'ranger tunic', kind: 'body', color: '#8fd17a', scale: [0.78, 1.28, 0.58], position: [0, 0.98, 0] },
        { name: 'wind hood', kind: 'head', color: '#cdeebd', scale: [0.5, 0.5, 0.5], position: [0, 1.82, 0] },
        { name: 'green cloak', kind: 'cape', color: '#4f9b60', scale: [1.12, 0.08, 0.9], position: [0, 1.22, 0.5] },
        { name: 'longbow', kind: 'weapon', color: '#dff4b5', scale: [0.12, 1.95, 0.16], position: [0.9, 1.15, 0], rotation: [0, 0, -0.04] },
        { name: 'wind charm', kind: 'sigil', color: '#bff4a0', emissive: '#9cff82', scale: [0.28, 0.28, 0.28], position: [-0.52, 1.55, -0.32] },
      ],
    },
    textures: textures('#8fd17a', '#dff4b5', '#aaff88', 'wind-leaf'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'gorm',
    name: '戈姆',
    title: '裂地者',
    classicArchetype: 'earthquake control tank',
    model: {
      scale: 1.18,
      silhouette: 'stone-totem-back',
      groundRadius: 1.08,
      parts: [
        { name: 'stone torso', kind: 'body', color: '#a1887f', scale: [1.22, 1.48, 0.86], position: [0, 1.02, 0] },
        { name: 'rock head', kind: 'head', color: '#d1b9a5', scale: [0.72, 0.52, 0.68], position: [0, 1.95, 0] },
        { name: 'left boulder shoulder', kind: 'shoulder', color: '#bba08c', scale: [0.72, 0.34, 0.76], position: [-0.78, 1.48, 0] },
        { name: 'right boulder shoulder', kind: 'shoulder', color: '#bba08c', scale: [0.72, 0.34, 0.76], position: [0.78, 1.48, 0] },
        { name: 'earth totem', kind: 'weapon', color: '#d8bd88', scale: [0.28, 1.65, 0.28], position: [1.05, 1.08, 0], rotation: [0.08, 0, -0.2] },
        { name: 'crack rune', kind: 'sigil', color: '#ffd491', emissive: '#d6a85a', scale: [0.42, 0.06, 0.42], position: [0, 0.28, 0.46] },
      ],
    },
    textures: textures('#a1887f', '#d8bd88', '#d6a85a', 'earth-crack'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'grosh',
    name: '格罗什',
    title: '钩魂者',
    classicArchetype: 'hook dismember ganker',
    model: {
      scale: 1.08,
      silhouette: 'hook-chain',
      groundRadius: 0.98,
      parts: [
        { name: 'butcher body', kind: 'body', color: '#8d6e63', scale: [1.08, 1.36, 0.88], position: [0, 1, 0] },
        { name: 'grim head', kind: 'head', color: '#c3a08e', scale: [0.64, 0.54, 0.64], position: [0, 1.9, 0] },
        { name: 'hook arm', kind: 'weapon', color: '#c8b089', emissive: '#a88a5b', scale: [0.18, 1.5, 0.18], position: [1.06, 1.08, -0.16], rotation: [0.42, 0, -0.42] },
        { name: 'chain loop', kind: 'offhand', color: '#b7a084', scale: [0.74, 0.12, 0.74], position: [-0.76, 1.15, 0.18] },
        { name: 'miasma vial', kind: 'orb', color: '#8fb86c', emissive: '#91d66d', scale: [0.34, 0.34, 0.34], position: [-0.42, 1.52, -0.36] },
      ],
    },
    textures: textures('#8d6e63', '#c8b089', '#91d66d', 'chain-stain'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'kai',
    name: '凯',
    title: '影刃',
    classicArchetype: 'stealth assassin',
    model: {
      scale: 0.92,
      silhouette: 'dual-shadow-daggers',
      groundRadius: 0.72,
      parts: [
        { name: 'shadow body', kind: 'body', color: '#7e57c2', scale: [0.72, 1.25, 0.56], position: [0, 0.96, 0] },
        { name: 'masked head', kind: 'head', color: '#b69aff', scale: [0.48, 0.48, 0.48], position: [0, 1.78, 0] },
        { name: 'smoke cloak', kind: 'cape', color: '#24172f', emissive: '#6c3db4', scale: [1, 0.08, 0.82], position: [0, 1.16, 0.5] },
        { name: 'left dagger', kind: 'weapon', color: '#eee6ff', emissive: '#b896ff', scale: [0.12, 1.05, 0.12], position: [-0.62, 1.05, -0.18], rotation: [0.35, 0, 0.54] },
        { name: 'right dagger', kind: 'offhand', color: '#eee6ff', emissive: '#b896ff', scale: [0.12, 1.05, 0.12], position: [0.62, 1.05, -0.18], rotation: [0.35, 0, -0.54] },
      ],
    },
    textures: textures('#7e57c2', '#b69aff', '#b896ff', 'shadow-slash'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'chenblade',
    name: '辰',
    title: '刃舞者',
    classicArchetype: 'spinning blade carry',
    model: {
      scale: 0.96,
      silhouette: 'crossed-twin-blades',
      groundRadius: 0.78,
      parts: [
        { name: 'blade dancer armor', kind: 'body', color: '#26c6da', scale: [0.78, 1.3, 0.58], position: [0, 0.98, 0] },
        { name: 'duelist head', kind: 'head', color: '#c9fbff', scale: [0.5, 0.5, 0.5], position: [0, 1.82, 0] },
        { name: 'left blade', kind: 'weapon', color: '#dffcff', emissive: '#8df5ff', scale: [0.12, 1.45, 0.12], position: [-0.72, 1.08, -0.12], rotation: [0.28, 0, 0.48] },
        { name: 'right blade', kind: 'offhand', color: '#dffcff', emissive: '#8df5ff', scale: [0.12, 1.45, 0.12], position: [0.72, 1.08, -0.12], rotation: [0.28, 0, -0.48] },
        { name: 'whirl sigil', kind: 'aura', color: '#8df5ff', emissive: '#5ee8ff', scale: [1.18, 0.05, 1.18], position: [0, 0.14, 0] },
      ],
    },
    textures: textures('#26c6da', '#dffcff', '#5ee8ff', 'blade-whirl'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'olan',
    name: '奥兰',
    title: '晨光牧师',
    classicArchetype: 'holy healer support',
    model: {
      scale: 0.98,
      silhouette: 'sun-halo-staff',
      groundRadius: 0.82,
      parts: [
        { name: 'sun robe', kind: 'body', color: '#ffe082', scale: [0.86, 1.44, 0.68], position: [0, 0.98, 0] },
        { name: 'priest head', kind: 'head', color: '#fff2b8', scale: [0.52, 0.52, 0.52], position: [0, 1.9, 0] },
        { name: 'holy halo', kind: 'sigil', color: '#fff0a8', emissive: '#ffe56b', scale: [0.92, 0.08, 0.92], position: [0, 2.42, 0] },
        { name: 'sun staff', kind: 'weapon', color: '#ffd85a', emissive: '#ffe56b', scale: [0.12, 1.72, 0.12], position: [0.9, 1.12, -0.2], rotation: [0.12, 0, -0.18] },
        { name: 'prayer seal', kind: 'orb', color: '#fff4bc', emissive: '#ffe56b', scale: [0.34, 0.34, 0.34], position: [-0.55, 1.42, -0.26] },
      ],
    },
    textures: textures('#ffe082', '#fff2b8', '#ffe56b', 'sun-cross'),
    actions,
    previewCamera: basePreviewCamera,
  },
  {
    key: 'morphis',
    name: '墨菲斯',
    title: '暗渊术士',
    classicArchetype: 'shadow warlock support',
    model: {
      scale: 1,
      silhouette: 'abyss-book-flame',
      groundRadius: 0.86,
      parts: [
        { name: 'abyss robe', kind: 'body', color: '#ab47bc', scale: [0.9, 1.46, 0.72], position: [0, 0.98, 0] },
        { name: 'warlock hood', kind: 'head', color: '#e0a4ec', scale: [0.56, 0.54, 0.56], position: [0, 1.9, 0] },
        { name: 'shadow book', kind: 'offhand', color: '#2a1534', emissive: '#d58cff', scale: [0.66, 0.12, 0.48], position: [-0.74, 1.28, -0.18], rotation: [0.4, 0.15, 0.18] },
        { name: 'abyss staff', kind: 'weapon', color: '#d58cff', emissive: '#ff5fb7', scale: [0.12, 1.72, 0.12], position: [0.9, 1.12, -0.2], rotation: [0.1, 0, -0.18] },
        { name: 'void flame', kind: 'orb', color: '#ff5fb7', emissive: '#ff5fb7', scale: [0.44, 0.44, 0.44], position: [0.42, 1.78, -0.34] },
      ],
    },
    textures: textures('#ab47bc', '#e0a4ec', '#ff5fb7', 'abyss-rune'),
    actions,
    previewCamera: basePreviewCamera,
  },
];

function polishParts(asset: Hero3DAssetSpec): Hero3DPartSpec[] {
  const radius = asset.model.groundRadius;
  const wide = Math.max(0.78, radius * 0.95);
  const [primary, accent] = asset.textures[0].palette;
  const glow = asset.textures[3].palette[0];
  const shared: Hero3DPartSpec[] = [
    {
      name: 'selection rune base',
      kind: 'aura',
      color: accent,
      emissive: glow,
      scale: [radius * 1.55, 0.08, radius * 1.55],
      position: [0, 0.08, 0],
    },
    {
      name: 'painted hero plinth',
      kind: 'aura',
      color: '#171b17',
      scale: [radius * 1.85, 0.05, radius * 1.85],
      position: [0, 0.02, 0],
    },
    {
      name: 'left class mote',
      kind: 'orb',
      color: accent,
      emissive: glow,
      scale: [0.13, 0.13, 0.13],
      position: [-wide, 1.74, -0.42],
    },
    {
      name: 'right class mote',
      kind: 'orb',
      color: primary,
      emissive: glow,
      scale: [0.11, 0.11, 0.11],
      position: [wide, 1.52, -0.5],
    },
    {
      name: 'left outer silhouette flare',
      kind: 'sigil',
      color: accent,
      emissive: glow,
      scale: [0.18, 0.035, 0.54],
      position: [-wide, 1.16, 0.2],
      rotation: [Math.PI / 2, 0, -0.28],
    },
    {
      name: 'right outer silhouette flare',
      kind: 'sigil',
      color: accent,
      emissive: glow,
      scale: [0.18, 0.035, 0.54],
      position: [wide, 1.16, 0.2],
      rotation: [Math.PI / 2, 0, 0.28],
    },
    {
      name: 'back silhouette plate',
      kind: 'cape',
      color: primary,
      emissive: glow,
      scale: [radius * 0.9, 0.06, 0.72],
      position: [0, 1.05, 0.72],
      rotation: [0.18, 0, 0],
    },
    {
      name: 'hero class halo',
      kind: 'sigil',
      color: accent,
      emissive: glow,
      scale: [radius * 0.48, 0.045, radius * 0.48],
      position: [0, 2.18, -0.06],
      rotation: [Math.PI / 2, 0, 0],
    },
    {
      name: 'upper silhouette glint',
      kind: 'orb',
      color: '#ffffff',
      emissive: glow,
      scale: [0.09, 0.09, 0.09],
      position: [radius * 0.58, 2.12, -0.18],
    },
  ];
  return [...asset.model.parts, ...shared, ...signatureParts(asset.key, primary, accent, glow)];
}

function signatureParts(key: string, primary: string, accent: string, glow: string): Hero3DPartSpec[] {
  const parts: Record<string, Hero3DPartSpec[]> = {
    rein: [
      { name: 'lion crest helm', kind: 'sigil', color: '#fff0a6', emissive: '#ffd75a', scale: [0.42, 0.08, 0.42], position: [0, 2.48, 0.06], rotation: [Math.PI / 2, 0, 0] },
      { name: 'shield face gem', kind: 'orb', color: '#7fd7ff', emissive: '#9fe8ff', scale: [0.18, 0.18, 0.08], position: [-1.17, 1.2, 0.76] },
      { name: 'royal back banner', kind: 'cape', color: '#6c1424', emissive: '#b32036', scale: [0.72, 0.08, 1.45], position: [0, 1.4, 0.76], rotation: [0.08, 0, 0] },
    ],
    liya: [
      { name: 'floating snow crown', kind: 'sigil', color: '#effcff', emissive: '#a9f6ff', scale: [0.5, 0.07, 0.5], position: [0, 2.42, 0.02], rotation: [Math.PI / 2, 0, 0] },
      { name: 'ice skirt shards', kind: 'cape', color: '#d7fbff', emissive: '#9ff3ff', scale: [1.04, 0.12, 0.7], position: [0, 0.72, -0.38], rotation: [-0.28, 0, 0] },
      { name: 'left frost wisp', kind: 'orb', color: '#ffffff', emissive: '#b9f6ff', scale: [0.18, 0.18, 0.18], position: [-0.72, 1.72, -0.24] },
    ],
    zola: [
      { name: 'forked thunder halo', kind: 'sigil', color: '#eef3ff', emissive: '#82a7ff', scale: [0.82, 0.08, 0.32], position: [0, 2.54, 0], rotation: [Math.PI / 2, 0, 0] },
      { name: 'storm shoulder spark', kind: 'orb', color: '#d6e2ff', emissive: '#6e9dff', scale: [0.2, 0.2, 0.2], position: [0.72, 1.72, -0.28] },
      { name: 'arcane sash', kind: 'cape', color: '#20174a', emissive: '#5b7fe8', scale: [1.05, 0.08, 0.22], position: [0, 1.04, -0.5], rotation: [0.16, 0, 0] },
    ],
    aili: [
      { name: 'leaf ear fins', kind: 'sigil', color: '#dff4b5', emissive: '#aaff88', scale: [0.74, 0.06, 0.24], position: [0, 2.02, 0.04], rotation: [Math.PI / 2, 0, 0] },
      { name: 'quiver feathers', kind: 'cape', color: '#276b49', emissive: '#65d884', scale: [0.38, 0.12, 1.22], position: [-0.52, 1.28, 0.62], rotation: [0.28, 0, -0.18] },
      { name: 'wind arrow glow', kind: 'orb', color: '#e9ffd8', emissive: '#b4ff82', scale: [0.16, 0.16, 0.16], position: [1.02, 1.78, -0.14] },
    ],
    gorm: [
      { name: 'earth crown slab', kind: 'sigil', color: '#ffd491', emissive: '#d6a85a', scale: [0.74, 0.1, 0.34], position: [0, 2.28, 0.02], rotation: [Math.PI / 2, 0, 0] },
      { name: 'totem back stone', kind: 'cape', color: '#59463c', emissive: '#9d7040', scale: [0.7, 0.18, 1.35], position: [0, 1.26, 0.74], rotation: [0.08, 0, 0] },
      { name: 'molten fissure core', kind: 'orb', color: '#ffb35d', emissive: '#ff9a3d', scale: [0.2, 0.2, 0.2], position: [0, 0.62, -0.48] },
    ],
    grosh: [
      { name: 'hook chain halo', kind: 'sigil', color: '#d5c2a1', emissive: '#91d66d', scale: [0.62, 0.08, 0.62], position: [0, 2.18, 0.04], rotation: [Math.PI / 2, 0, 0] },
      { name: 'toxic belly glyph', kind: 'orb', color: '#b7e27f', emissive: '#91d66d', scale: [0.22, 0.22, 0.08], position: [0, 1.14, -0.54] },
      { name: 'butcher apron plates', kind: 'cape', color: '#3b2721', emissive: '#6f3f29', scale: [0.86, 0.08, 1.05], position: [0, 0.92, -0.54], rotation: [-0.18, 0, 0] },
    ],
    kai: [
      { name: 'shadow horn crest', kind: 'sigil', color: '#eee6ff', emissive: '#b896ff', scale: [0.68, 0.06, 0.24], position: [0, 2.08, 0.03], rotation: [Math.PI / 2, 0, 0] },
      { name: 'smoke step crescent', kind: 'aura', color: '#24172f', emissive: '#6c3db4', scale: [0.84, 0.05, 0.84], position: [0, 0.16, -0.08] },
      { name: 'backstab eye gem', kind: 'orb', color: '#f0e9ff', emissive: '#d8b8ff', scale: [0.16, 0.16, 0.08], position: [0, 1.88, -0.46] },
    ],
    chenblade: [
      { name: 'duelist headband flare', kind: 'sigil', color: '#dffcff', emissive: '#8df5ff', scale: [0.7, 0.06, 0.18], position: [0, 2.08, 0.02], rotation: [Math.PI / 2, 0, 0] },
      { name: 'blade trail left', kind: 'cape', color: '#164a57', emissive: '#5ee8ff', scale: [0.16, 0.08, 1.5], position: [-0.92, 1.06, 0.44], rotation: [0.28, 0.2, 0.5] },
      { name: 'blade trail right', kind: 'cape', color: '#164a57', emissive: '#5ee8ff', scale: [0.16, 0.08, 1.5], position: [0.92, 1.06, 0.44], rotation: [0.28, -0.2, -0.5] },
    ],
    olan: [
      { name: 'radiant sun disc', kind: 'sigil', color: '#fff7c8', emissive: '#ffe56b', scale: [0.72, 0.08, 0.72], position: [0, 2.58, 0], rotation: [Math.PI / 2, 0, 0] },
      { name: 'gold prayer stole', kind: 'cape', color: '#b9892f', emissive: '#ffe56b', scale: [0.42, 0.08, 1.26], position: [0, 1.2, -0.48], rotation: [-0.16, 0, 0] },
      { name: 'healing mote', kind: 'orb', color: '#fff9d8', emissive: '#fff08a', scale: [0.2, 0.2, 0.2], position: [0.54, 1.76, -0.36] },
    ],
    morphis: [
      { name: 'abyss horn circlet', kind: 'sigil', color: '#f0b6ff', emissive: '#ff5fb7', scale: [0.78, 0.06, 0.24], position: [0, 2.22, 0.03], rotation: [Math.PI / 2, 0, 0] },
      { name: 'void shoulder flame', kind: 'orb', color: '#ff85d0', emissive: '#ff5fb7', scale: [0.22, 0.22, 0.22], position: [-0.56, 1.72, -0.36] },
      { name: 'torn abyss mantle', kind: 'cape', color: '#2a1534', emissive: '#7d2cc0', scale: [1.12, 0.08, 0.9], position: [0, 1.26, 0.56], rotation: [0.1, 0, 0] },
    ],
  };
  return parts[key] ?? [
    { name: 'class crest', kind: 'sigil', color: accent, emissive: glow, scale: [0.6, 0.08, 0.6], position: [0, 2.2, 0], rotation: [Math.PI / 2, 0, 0] },
    { name: 'class gem', kind: 'orb', color: primary, emissive: glow, scale: [0.2, 0.2, 0.2], position: [0, 1.55, -0.4] },
  ];
}

export const CLASSIC_HERO3D_ASSETS: Hero3DAssetSpec[] = BASE_CLASSIC_HERO3D_ASSETS.map((asset) => ({
  ...asset,
  model: {
    ...asset.model,
    parts: polishParts(asset),
  },
}));
