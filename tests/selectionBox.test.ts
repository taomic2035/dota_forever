import { describe, expect, it } from 'vitest';
import { selectionBoxRect } from '../src/render/selectionBox';

describe('selectionBoxRect', () => {
  it('normalizes drag direction into a positive rectangle', () => {
    expect(selectionBoxRect({ x: 90, y: 70 }, { x: 30, y: 120 })).toEqual({
      x: 30,
      y: 70,
      width: 60,
      height: 50,
    });
  });
});
