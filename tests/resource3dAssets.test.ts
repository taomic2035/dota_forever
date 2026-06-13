import { describe, expect, it } from 'vitest';
import {
  RESOURCE3D_CATEGORIES,
  RESOURCE3D_SAMPLE_ASSETS,
  RESOURCE3D_TEXTURE_CHANNELS,
} from '../src/render/resource3dAssets';

describe('non-hero 3D resource samples', () => {
  it('covers the full non-hero resource taxonomy with expandable samples', () => {
    expect(RESOURCE3D_CATEGORIES).toEqual([
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
    ]);

    for (const category of RESOURCE3D_CATEGORIES) {
      const assets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === category);
      expect(assets.length, category).toBeGreaterThanOrEqual(10);
    }
  });

  it('keeps every sample renderable as an in-game Three.js resource', () => {
    for (const asset of RESOURCE3D_SAMPLE_ASSETS) {
      expect(asset.key, asset.name).toMatch(/^[a-z0-9_]+$/);
      expect(asset.name, asset.key).toBeTruthy();
      expect(asset.role, asset.key).toBeTruthy();
      expect(asset.parts.length, asset.key).toBeGreaterThanOrEqual(4);
      expect(asset.scale, asset.key).toBeGreaterThan(0);
      expect(asset.textureChannels, asset.key).toEqual(RESOURCE3D_TEXTURE_CHANNELS);
      expect(asset.texture.detailLevel, asset.key).toBeGreaterThanOrEqual(2);
      expect(asset.texture.overlays.length, asset.key).toBeGreaterThanOrEqual(3);
      expect(asset.previewMotion, asset.key).toMatch(/^(idle|pulse|spin|float|impact|ambient)$/);
      for (const part of asset.parts) {
        expect(part.material, `${asset.key}:${part.name}`).toMatch(/^(cloth|leather|wood|stone|metal|crystal|energy|water|foliage|paper|shadow)$/);
        expect(part.detail, `${asset.key}:${part.name}`).toMatch(/^(plain|trim|rune|edgeWear|scalePattern|leafVein|circuit|bannerGlyph|liquidRipple|sparkCore)$/);
      }
    }
  });

  it('uses high-detail V3 materials for combat-critical world resources', () => {
    const priority = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => [
      'lane_units',
      'neutral_units',
      'boss_objectives',
      'buildings',
      'couriers_summons',
      'map_props',
      'terrain_tiles',
      'spell_fx',
      'projectiles',
      'status_effects',
    ].includes(asset.category));

    expect(priority.length).toBeGreaterThan(80);
    for (const asset of priority) {
      const materials = new Set(asset.parts.map((part) => part.material));
      const details = new Set(asset.parts.map((part) => part.detail));

      expect(asset.texture.detailLevel, asset.key).toBeGreaterThanOrEqual(3);
      expect(asset.texture.overlays, asset.key).toContain('microGrain');
      expect(asset.texture.overlays, asset.key).toContain('motifInk');
      expect(materials.size, `${asset.key} material variety`).toBeGreaterThanOrEqual(3);
      expect(details.size, `${asset.key} detail variety`).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives every category readable visual variety', () => {
    for (const category of RESOURCE3D_CATEGORIES) {
      const assets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === category);
      const motifs = new Set(assets.map((asset) => asset.motif));
      const silhouettes = new Set(assets.map((asset) => asset.silhouette));
      const glowing = assets.filter((asset) => asset.parts.some((part) => part.emissive));

      expect(motifs.size, `${category} motifs`).toBeGreaterThanOrEqual(7);
      expect(silhouettes.size, `${category} silhouettes`).toBeGreaterThanOrEqual(8);
      expect(glowing.length, `${category} glow samples`).toBeGreaterThanOrEqual(6);
    }
  });

  it('uses globally unique resource keys', () => {
    const keys = RESOURCE3D_SAMPLE_ASSETS.map((asset) => asset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers requested terrain dressing subtypes for map art direction', () => {
    const terrainLikeAssets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => [
      'terrain_tiles',
      'map_props',
      'environment_fx',
    ].includes(asset.category));
    const terrainText = terrainLikeAssets
      .map((asset) => [
        asset.key,
        asset.name,
        asset.role,
        asset.silhouette,
        asset.motif,
      ].join(' '))
      .join('\n');

    const requiredTerrainConcepts: Array<[string, RegExp]> = [
      ['flat ground', /(flat|plain|平地|地面|路面)/i],
      ['trees', /(tree|树|woodland|林)/i],
      ['grass', /(grass|草)/i],
      ['flowers', /(flower|花)/i],
      ['high ground', /(highground|高地)/i],
      ['fences', /(fence|栅栏)/i],
      ['slopes and ramps', /(slope|ramp|坡|斜坡)/i],
      ['river', /(river|河道|水面)/i],
      ['sky', /(sky|天空|cloud|云)/i],
    ];

    for (const [concept, pattern] of requiredTerrainConcepts) {
      expect(terrainText, concept).toMatch(pattern);
    }
  });
});
