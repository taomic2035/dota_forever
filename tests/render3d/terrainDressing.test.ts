import { describe, expect, it } from 'vitest';
import { DAWN_SIDE_SHOP, mirror } from '../../src/data/mapLayout';
import { GameMap } from '../../src/sim/map';
import { buildTerrain3D, updateTerrainRuntimeMotion } from '../../src/render3d/terrain3d';
import { terrainDressingSamples, terrainDressingSummary } from '../../src/render3d/terrainDressing';

describe('terrainDressingSamples', () => {
  it('covers the requested map realism layers deterministically', () => {
    const map = new GameMap();
    const samples = terrainDressingSamples(map);
    const summary = terrainDressingSummary(samples);

    expect(summary.grass_tuft).toBeGreaterThanOrEqual(120);
    expect(summary.ground_path_dirt).toBeGreaterThanOrEqual(36);
    expect(summary.ground_grass_mottle).toBeGreaterThanOrEqual(80);
    expect(summary.ground_stone_slab).toBeGreaterThanOrEqual(24);
    expect(summary.flower_patch).toBeGreaterThanOrEqual(24);
    expect(summary.river_reed).toBeGreaterThanOrEqual(32);
    expect(summary.river_stone).toBeGreaterThanOrEqual(24);
    expect(summary.river_bank_mud).toBeGreaterThanOrEqual(32);
    expect(summary.river_foam_glint).toBeGreaterThanOrEqual(24);
    expect(summary.cliff_face).toBeGreaterThanOrEqual(24);
    expect(summary.cliff_radiant_moss).toBeGreaterThanOrEqual(20);
    expect(summary.cliff_dire_scorch).toBeGreaterThanOrEqual(20);
    expect(summary.cliff_rubble).toBeGreaterThanOrEqual(40);
    expect(summary.cliff_crack).toBeGreaterThanOrEqual(40);
    expect(summary.cliff_fence).toBeGreaterThanOrEqual(24);
    expect(summary.highground_edge).toBeGreaterThanOrEqual(24);
    expect(summary.ramp_stair).toBeGreaterThanOrEqual(6);
    expect(summary.landmark_ring).toBeGreaterThanOrEqual(10);
    expect(summary.sky_dome).toBe(1);
    expect(summary.cloud_shadow).toBeGreaterThanOrEqual(3);
    expect(summary.sky_horizon_haze).toBeGreaterThanOrEqual(4);
    expect(summary.sky_sun_shaft).toBeGreaterThanOrEqual(6);

    const again = terrainDressingSamples(new GameMap());
    expect(again).toEqual(samples);
  });

  it('keeps sampled world dressing on valid map coordinates', () => {
    const map = new GameMap();
    const samples = terrainDressingSamples(map);
    for (const sample of samples) {
      if (sample.kind === 'sky_dome' || sample.kind === 'cloud_shadow') continue;
      expect(sample.x, `${sample.kind} x`).toBeGreaterThanOrEqual(0);
      expect(sample.x, `${sample.kind} x`).toBeLessThanOrEqual(map.W);
      expect(sample.z, `${sample.kind} z`).toBeGreaterThanOrEqual(0);
      expect(sample.z, `${sample.kind} z`).toBeLessThanOrEqual(map.W);
      expect(Number.isFinite(sample.y), `${sample.kind} y`).toBe(true);
    }
  });

  it('marks side shops with distinct 3D landmark rings', () => {
    const samples = terrainDressingSamples(new GameMap());
    const sideShopRings = [DAWN_SIDE_SHOP, mirror(DAWN_SIDE_SHOP)].map((pos) => samples.find((sample) =>
      sample.kind === 'landmark_ring'
      && sample.x === pos.x
      && sample.z === pos.y
      && sample.color === '#ffc65f'
    ));

    expect(sideShopRings.every(Boolean)).toBe(true);
  });
});

describe('buildTerrain3D V4 world layers', () => {
  it('adds named runtime layers for terrain realism and Opus inspection', () => {
    const terrain = buildTerrain3D(new GameMap());
    const requiredLayers = [
      'terrain-sky-dome',
      'terrain-cloud-shadows',
      'terrain-atmosphere',
      'terrain-river-current',
      'terrain-river-bank-mud',
      'terrain-river-foam-glints',
      'terrain-ground-decals',
      'terrain-tree-trunks',
      'terrain-tree-canopy-primary',
      'terrain-tree-canopy-secondary',
      'terrain-grass-tufts',
      'terrain-flower-patches',
      'terrain-river-reeds',
      'terrain-river-stones',
      'terrain-cliff-faces',
      'terrain-cliff-biome-details',
      'terrain-cliff-fences',
      'terrain-highground-edges',
      'terrain-ramp-stairs',
      'terrain-landmark-rings',
    ];

    for (const layer of requiredLayers) {
      const object = terrain.getObjectByName(layer);
      expect(object, layer).toBeTruthy();
      expect(object!.userData.count, layer).toBeGreaterThan(0);
    }

    expect(terrain.getObjectByName('terrain-tree-trunks')!.userData.count).toBeGreaterThanOrEqual(2400);
    expect(terrain.getObjectByName('terrain-tree-canopy-secondary')!.userData.count).toBeGreaterThanOrEqual(4800);
  });

  it('adds horizon haze and sun shafts so sky/fog reads as battlefield atmosphere', () => {
    const terrain = buildTerrain3D(new GameMap());
    const atmosphere = terrain.getObjectByName('terrain-atmosphere')!;
    const haze = terrain.getObjectByName('terrain-horizon-haze')!;
    const shafts = terrain.getObjectByName('terrain-sun-shafts')!;

    expect(atmosphere.userData.count).toBe(haze.userData.count + shafts.userData.count);
    expect(haze.userData.count).toBeGreaterThanOrEqual(4);
    expect(shafts.userData.count).toBeGreaterThanOrEqual(6);
  });

  it('adds ground decal layers so flat walkable terrain is not a plain color field', () => {
    const terrain = buildTerrain3D(new GameMap());
    const decals = terrain.getObjectByName('terrain-ground-decals')!;
    const dirt = terrain.getObjectByName('terrain-ground-dirt-paths')!;
    const mottle = terrain.getObjectByName('terrain-ground-grass-mottle')!;
    const slabs = terrain.getObjectByName('terrain-ground-stone-slabs')!;

    expect(decals.userData.count).toBe(dirt.userData.count + mottle.userData.count + slabs.userData.count);
    expect(dirt.userData.count).toBeGreaterThanOrEqual(36);
    expect(mottle.userData.count).toBeGreaterThanOrEqual(80);
    expect(slabs.userData.count).toBeGreaterThanOrEqual(24);
  });

  it('builds cliff faces from layered rocky details instead of a single flat marker', () => {
    const terrain = buildTerrain3D(new GameMap());
    const faces = terrain.getObjectByName('terrain-cliff-faces')!;
    const faceCount = faces.userData.count;

    for (const layer of ['terrain-cliff-face-walls', 'terrain-cliff-rock-caps', 'terrain-cliff-ledge-shadows']) {
      const object = terrain.getObjectByName(layer);
      expect(object, layer).toBeTruthy();
      expect(object!.userData.count, layer).toBe(faceCount);
    }
  });

  it('adds side-specific cliff tint, rubble, and crack details for highground realism', () => {
    const terrain = buildTerrain3D(new GameMap());
    const details = terrain.getObjectByName('terrain-cliff-biome-details')!;
    const radiant = terrain.getObjectByName('terrain-cliff-radiant-moss')!;
    const dire = terrain.getObjectByName('terrain-cliff-dire-scorch')!;
    const rubble = terrain.getObjectByName('terrain-cliff-rubble')!;
    const cracks = terrain.getObjectByName('terrain-cliff-cracks')!;

    expect(details.userData.count).toBe(radiant.userData.count + dire.userData.count + rubble.userData.count + cracks.userData.count);
    expect(radiant.userData.count).toBeGreaterThanOrEqual(20);
    expect(dire.userData.count).toBeGreaterThanOrEqual(20);
    expect(rubble.userData.count).toBeGreaterThanOrEqual(40);
    expect(cracks.userData.count).toBeGreaterThanOrEqual(40);
  });

  it('adds biome-specific tree wall accents for lush and dire map sides', () => {
    const terrain = buildTerrain3D(new GameMap());
    const requiredLayers = [
      'terrain-tree-radiant-blooms',
      'terrain-tree-radiant-light-canopy',
      'terrain-tree-dire-dead-branches',
      'terrain-tree-dire-dark-canopy',
    ];

    for (const layer of requiredLayers) {
      const object = terrain.getObjectByName(layer);
      expect(object, layer).toBeTruthy();
      expect(object!.userData.count, layer).toBeGreaterThanOrEqual(80);
    }
  });

  it('adds riverbank detail layers so the river reads as a corridor with banks', () => {
    const terrain = buildTerrain3D(new GameMap());
    const requiredLayers = [
      'terrain-river-bank-mud',
      'terrain-river-foam-glints',
    ];

    for (const layer of requiredLayers) {
      const object = terrain.getObjectByName(layer);
      expect(object, layer).toBeTruthy();
      expect(object!.userData.count, layer).toBeGreaterThanOrEqual(24);
    }
  });

  it('animates river currents, foam glints, and reed sway as runtime-only visual motion', () => {
    const terrain = buildTerrain3D(new GameMap());
    const current = terrain.getObjectByName('terrain-river-current')!;
    const firstStrip = current.children[0];
    const foam = terrain.getObjectByName('terrain-river-foam-glints')!;
    const reeds = terrain.getObjectByName('terrain-river-reeds')!;

    expect(current.userData.motion).toBe('flow');
    expect(foam.userData.motion).toBe('foam-pulse');
    expect(reeds.userData.motion).toBe('reed-sway');

    updateTerrainRuntimeMotion(terrain, 0);
    const startX = firstStrip.position.x;
    const startOpacity = (foam as any).material.opacity;
    const startReedRotation = reeds.rotation.z;

    updateTerrainRuntimeMotion(terrain, 1.25);

    expect(firstStrip.position.x).not.toBeCloseTo(startX, 4);
    expect((foam as any).material.opacity).not.toBeCloseTo(startOpacity, 4);
    expect(reeds.rotation.z).not.toBeCloseTo(startReedRotation, 4);
  });

  it('builds cliff fences from posts, rails, and stone bases instead of a single bar', () => {
    const terrain = buildTerrain3D(new GameMap());
    const fences = terrain.getObjectByName('terrain-cliff-fences')!;
    const fenceCount = fences.userData.count;

    expect(terrain.getObjectByName('terrain-cliff-fence-rails')!.userData.count).toBe(fenceCount);
    expect(terrain.getObjectByName('terrain-cliff-fence-posts')!.userData.count).toBe(fenceCount * 2);
    expect(terrain.getObjectByName('terrain-cliff-fence-stone-bases')!.userData.count).toBe(fenceCount * 2);
  });
});
