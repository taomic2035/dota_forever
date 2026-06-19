import { describe, expect, it } from 'vitest';
import { Mesh, Object3D } from 'three';
import { unitArt } from '../../src/render/unitArt';
import { buildUnitModel } from '../../src/render3d/unitModel';

describe('V26 non-hero unit model quality', () => {
  it('builds lane creeps with play-camera rounded silhouettes and team readability metadata', () => {
    const model = buildUnitModel(unitArt({
      kind: 'creep',
      team: 0,
      name: 'dawn melee soldier',
      attackRange: 100,
      collisionRadius: 16,
    }));

    expect(model.root.userData.gameplayUnitModelQuality).toMatchObject({
      pass: 'v26-nonhero-play-camera-model-quality',
      family: 'lane',
      teamRead: 'dawn',
      priority: 'low',
    });
    expect(nonBoxGeometryTypes(model.root).length).toBeGreaterThanOrEqual(6);
    expect(readabilityLayers(model.root)).toEqual(expect.arrayContaining(['core-volume', 'head-read', 'team-band']));
  });

  it('marks ancient neutrals with heavier threat silhouettes without changing sim data', () => {
    const model = buildUnitModel(unitArt({
      kind: 'neutral',
      team: 2,
      name: 'ancient granite golem',
      attackRange: 128,
      collisionRadius: 34,
    }));

    expect(model.root.userData.gameplayUnitModelQuality).toMatchObject({
      pass: 'v26-nonhero-play-camera-model-quality',
      family: 'neutral',
      threatRead: 'ancient',
      priority: 'medium',
    });
    expect(nonBoxGeometryTypes(model.root).length).toBeGreaterThanOrEqual(5);
    expect(readabilityLayers(model.root)).toEqual(expect.arrayContaining(['core-volume', 'head-read', 'threat-horns']));
  });

  it('keeps illusion models visually readable but lower priority than real heroes', () => {
    const model = buildUnitModel(unitArt({
      kind: 'illusion',
      team: 1,
      name: 'mirror copy',
      attackRange: 600,
      collisionRadius: 24,
      heroDef: { primary: 'agi', color: '#4aa0a8', glyph: 'M', aiRole: 'carry' },
    }));

    expect(model.root.userData.gameplayUnitModelQuality).toMatchObject({
      pass: 'v26-nonhero-play-camera-model-quality',
      family: 'illusion',
      teamRead: 'night',
      priority: 'low',
    });
    expect(readabilityLayers(model.root)).toEqual(expect.arrayContaining(['clone-glint', 'team-band']));
  });
});

function nonBoxGeometryTypes(root: Object3D): string[] {
  const types: string[] = [];
  root.traverse((obj) => {
    if (obj instanceof Mesh && !obj.geometry.type.includes('Box')) types.push(obj.geometry.type);
  });
  return types;
}

function readabilityLayers(root: Object3D): string[] {
  const layers: string[] = [];
  root.traverse((obj) => {
    const layer = obj.userData.playCameraReadabilityLayer;
    if (typeof layer === 'string') layers.push(layer);
  });
  return layers;
}
