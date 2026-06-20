import { describe, expect, it } from 'vitest';
import { buildRuneWorldMarkers } from '../src/render/runeWorldMarker';

describe('buildRuneWorldMarkers', () => {
  it('turns active river runes into readable 2D/3D world markers', () => {
    const markers = buildRuneWorldMarkers([
      { type: 'haste', pos: { x: 3600, y: 3600 } },
      { type: 'doubledamage', pos: { x: 11440, y: 11440 } },
    ]);

    expect(markers).toEqual([
      expect.objectContaining({
        type: 'haste',
        label: '加速',
        glyph: 'H',
        color: '#67c7ff',
        pos: { x: 3600, y: 3600 },
        radius2d: expect.any(Number),
        height3d: expect.any(Number),
      }),
      expect.objectContaining({
        type: 'doubledamage',
        label: '双倍',
        glyph: 'D',
        color: '#ff7862',
        pos: { x: 11440, y: 11440 },
      }),
    ]);
    expect(markers[0].radius2d).toBeGreaterThan(90);
    expect(markers[0].height3d).toBeGreaterThan(120);
    expect(markers[0].title).toContain('靠近自动拾取');
  });
});
