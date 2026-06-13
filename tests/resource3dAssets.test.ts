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

  it('adds V5 lane-unit readability contracts for team, role, formation, and attack read', () => {
    const laneUnits = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => asset.category === 'lane_units');
    const roleClasses = new Set(laneUnits.map((asset) => asset.laneReadability?.roleClass));
    const teamReads = new Set(laneUnits.map((asset) => asset.laneReadability?.teamRead));

    expect(roleClasses).toEqual(new Set(['melee', 'ranged', 'siege', 'super', 'utility', 'scout']));
    expect(teamReads).toEqual(new Set(['dawn', 'night', 'neutral']));

    for (const asset of laneUnits) {
      const partNames = new Set(asset.parts.map((part) => part.name));
      const v5Parts = asset.parts.filter((part) => part.name.startsWith('v5 lane '));

      expect(asset.laneReadability?.formationSlot, asset.key).toBeTruthy();
      expect(asset.laneReadability?.attackRead, asset.key).toBeTruthy();
      expect(asset.laneReadability?.silhouetteAnchors.length, asset.key).toBeGreaterThanOrEqual(4);
      for (const anchor of asset.laneReadability?.silhouetteAnchors ?? []) {
        expect(partNames.has(anchor), `${asset.key} lane anchor ${anchor} must map to a real part`).toBe(true);
      }

      expect(v5Parts.length, `${asset.key} needs V5 lane identity pieces`).toBeGreaterThanOrEqual(3);
      expect(v5Parts.some((part) => part.kind === 'banner'), `${asset.key} needs a team/faction banner read`).toBe(true);
      expect(v5Parts.some((part) => part.kind === 'weapon' || part.kind === 'beam'), `${asset.key} needs a role attack read`).toBe(true);
      expect(v5Parts.some((part) => part.position[2] >= 0.42), `${asset.key} needs rear formation read`).toBe(true);
    }
  });

  it('adds V5 wild-creature readability contracts for neutral tiers and boss objectives', () => {
    const wildAssets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => (
      asset.category === 'neutral_units' || asset.category === 'boss_objectives'
    ));
    const neutralTiers = new Set(
      wildAssets
        .filter((asset) => asset.category === 'neutral_units')
        .map((asset) => asset.wildReadability?.tier),
    );
    const bossTiers = new Set(
      wildAssets
        .filter((asset) => asset.category === 'boss_objectives')
        .map((asset) => asset.wildReadability?.tier),
    );
    const packRoles = new Set(wildAssets.map((asset) => asset.wildReadability?.packRole));

    expect(neutralTiers).toEqual(new Set(['small', 'medium', 'large', 'ancient', 'special']));
    expect(bossTiers).toEqual(new Set(['boss', 'objective']));
    expect(packRoles).toEqual(new Set(['fodder', 'leader', 'caster', 'flying', 'ancient', 'boss-core', 'objective-mechanic']));

    for (const asset of wildAssets) {
      const partNames = new Set(asset.parts.map((part) => part.name));
      const v5Parts = asset.parts.filter((part) => part.name.startsWith('v5 wild '));

      expect(asset.wildReadability?.biome, asset.key).toBeTruthy();
      expect(asset.wildReadability?.threatRead, asset.key).toBeTruthy();
      expect(asset.wildReadability?.silhouetteAnchors.length, asset.key).toBeGreaterThanOrEqual(5);
      for (const anchor of asset.wildReadability?.silhouetteAnchors ?? []) {
        expect(partNames.has(anchor), `${asset.key} wild anchor ${anchor} must map to a real part`).toBe(true);
      }

      expect(v5Parts.length, `${asset.key} needs V5 wild identity pieces`).toBeGreaterThanOrEqual(4);
      expect(v5Parts.some((part) => part.kind === 'plate' || part.kind === 'banner'), `${asset.key} needs a tier plate/banner read`).toBe(true);
      expect(v5Parts.some((part) => part.kind === 'weapon' || part.kind === 'beam'), `${asset.key} needs a threat/attack read`).toBe(true);
      expect(v5Parts.filter((part) => part.emissive).length, `${asset.key} needs visible threat glow`).toBeGreaterThanOrEqual(3);
    }
  });

  it('adds V5 summon and ward readability contracts without making them hero-priority', () => {
    const supportAssets = RESOURCE3D_SAMPLE_ASSETS.filter((asset) => (
      asset.category === 'couriers_summons' || asset.category === 'wards_traps'
    ));
    const roleClasses = new Set(supportAssets.map((asset) => asset.supportReadability?.roleClass));
    const priorityBands = new Set(supportAssets.map((asset) => asset.supportReadability?.priorityBand));

    expect(roleClasses).toEqual(new Set(['courier', 'summon', 'ward', 'trap', 'illusion', 'totem']));
    expect(priorityBands).toEqual(new Set(['low', 'medium']));

    for (const asset of supportAssets) {
      const partNames = new Set(asset.parts.map((part) => part.name));
      const v5Parts = asset.parts.filter((part) => part.name.startsWith('v5 support '));

      expect(asset.supportReadability?.ownerRead, asset.key).toBeTruthy();
      expect(asset.supportReadability?.interactionRead, asset.key).toBeTruthy();
      expect(asset.supportReadability?.expireCue, asset.key).toBeTruthy();
      expect(asset.supportReadability?.visualPriority, asset.key).toBeLessThan(0.65);
      expect(asset.supportReadability?.silhouetteAnchors.length, asset.key).toBeGreaterThanOrEqual(5);
      for (const anchor of asset.supportReadability?.silhouetteAnchors ?? []) {
        expect(partNames.has(anchor), `${asset.key} support anchor ${anchor} must map to a real part`).toBe(true);
      }

      expect(v5Parts.length, `${asset.key} needs V5 support identity pieces`).toBeGreaterThanOrEqual(4);
      expect(v5Parts.some((part) => part.kind === 'ring'), `${asset.key} needs owner/placement ring read`).toBe(true);
      expect(v5Parts.some((part) => part.kind === 'banner' || part.kind === 'orb'), `${asset.key} needs low-priority owner marker`).toBe(true);
      expect(v5Parts.filter((part) => part.emissive).length, `${asset.key} needs subtle status glow`).toBeGreaterThanOrEqual(3);
    }
  });
});
