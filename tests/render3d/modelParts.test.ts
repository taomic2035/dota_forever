import { describe, it, expect } from 'vitest';
import { humanoidSpec } from '../../src/render3d/modelParts';
import { unitArt } from '../../src/render/unitArt';

const strHero = unitArt({
  kind: 'hero', team: 0, name: 'A', attackRange: 128, collisionRadius: 24,
  heroDef: { primary: 'str', color: '#c8a23c', glyph: '盾', aiRole: 'tank' },
});
const intHero = unitArt({
  kind: 'hero', team: 1, name: 'B', attackRange: 600, collisionRadius: 24,
  heroDef: { primary: 'int', color: '#7ec8e3', glyph: '霜', aiRole: 'support' },
});

describe('humanoidSpec(描述符→部件)', () => {
  it('力量英雄躯干比智力英雄更宽', () => {
    expect(humanoidSpec(strHero).torso.w).toBeGreaterThan(humanoidSpec(intHero).torso.w);
  });
  it('智力/法系英雄有法袍,力量坦克无', () => {
    expect(humanoidSpec(intHero).hasRobe).toBe(true);
    expect(humanoidSpec(strHero).hasRobe).toBe(false);
  });
  it('主体色取自描述符 primary', () => {
    expect(humanoidSpec(strHero).primary).toBe(strHero.primary);
  });
  it('武器种类透传,长度非负', () => {
    expect(humanoidSpec(strHero).weapon.kind).toBe(strHero.weapon);
    expect(humanoidSpec(strHero).weapon.length).toBeGreaterThanOrEqual(0);
  });
  it('scale 有下限(不小于 0.8)', () => {
    expect(humanoidSpec(strHero).scale).toBeGreaterThanOrEqual(0.8);
  });
});
