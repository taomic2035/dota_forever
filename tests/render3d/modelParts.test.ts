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

const mageHero = unitArt({
  kind: 'hero', team: 0, name: 'M', attackRange: 600, collisionRadius: 24,
  heroDef: { primary: 'int', color: '#a060ff', glyph: '焰', aiRole: 'ganker' },
});
const meleeCreep = unitArt({ kind: 'creep', team: 0, name: '近战兵', attackRange: 100, collisionRadius: 16 });

describe('humanoidSpec 个性化(102 程序化英雄辨识度)', () => {
  it('力量坦克有头饰(角/盔)+ 肩甲', () => {
    const s = humanoidSpec(strHero);
    expect(['horns', 'helm']).toContain(s.headGear);
    expect(s.hasShoulders).toBe(true);
  });
  it('智力法师戴法帽', () => {
    expect(humanoidSpec(mageHero).headGear).toBe('hat');
  });
  it('辅助有头饰(兜帽/法帽)', () => {
    expect(['hood', 'hat']).toContain(humanoidSpec(intHero).headGear);
  });
  it('兵无头饰、无披风、无肩甲(仅英雄角色个性化)', () => {
    const s = humanoidSpec(meleeCreep);
    expect(s.headGear).toBe('none');
    expect(s.hasCape).toBe(false);
    expect(s.hasShoulders).toBe(false);
  });
  it('种子由配色+图腾确定性派生,不同英雄不同', () => {
    expect(humanoidSpec(strHero).seed).not.toBe(humanoidSpec(mageHero).seed);
    expect(humanoidSpec(strHero).seed).toBe(humanoidSpec(strHero).seed);
  });
});
