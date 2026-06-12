import { describe, it, expect } from 'vitest';
import { HEROES } from '../src/data/heroes';

// D8 守护:每名英雄的 (color, glyph) 组合必须唯一,否则渲染上无法区分。
describe('英雄美术标识唯一(D8)', () => {
  it('每名英雄 color+glyph 组合全局唯一', () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const h of HEROES) {
      const key = `${h.color}|${h.glyph}`;
      const prev = seen.get(key);
      if (prev) dups.push(`${h.name} 与 ${prev} 撞 ${key}`);
      else seen.set(key, h.name);
    }
    expect(dups).toEqual([]);
  });

  it('每名英雄都声明了非空 color 与 glyph', () => {
    for (const h of HEROES) {
      expect(h.color, h.name).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(h.glyph, h.name).toBeTruthy();
    }
  });
});
