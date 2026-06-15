import { describe, it, expect } from 'vitest';
import {
  writeFogRGBA, FOG_ALPHA_VISIBLE, FOG_ALPHA_EXPLORED, FOG_ALPHA_UNSEEN, FOG_RGB,
} from '../src/render/fogShared';
import { Team } from '../src/sim/map';

function vision(grids: number[][], explored: number[][]) {
  return {
    vision: {
      grids: grids.map((g) => new Uint8Array(g)) as unknown as [Uint8Array, Uint8Array],
      explored: explored.map((e) => new Uint8Array(e)) as unknown as [Uint8Array, Uint8Array],
      trueSight: [[], []],
    },
  } as Parameters<typeof writeFogRGBA>[0];
}

describe('writeFogRGBA (shared 2D/3D fog logic)', () => {
  it('returns false when there is no vision', () => {
    expect(writeFogRGBA({ vision: undefined }, Team.Dawn, new Uint8Array(4))).toBe(false);
  });

  it('maps visible→0 / explored→150 / unseen→235 alpha per cell, dark rgb', () => {
    const w = vision([[1, 0, 0], [0, 0, 0]], [[1, 1, 0], [0, 0, 0]]);
    const out = new Uint8Array(3 * 4);
    expect(writeFogRGBA(w, Team.Dawn, out)).toBe(true);
    expect(out[3]).toBe(FOG_ALPHA_VISIBLE);  // cell0 currently visible
    expect(out[7]).toBe(FOG_ALPHA_EXPLORED); // cell1 explored, not visible
    expect(out[11]).toBe(FOG_ALPHA_UNSEEN);  // cell2 never seen
    expect([out[0], out[1], out[2]]).toEqual([FOG_RGB[0], FOG_RGB[1], FOG_RGB[2]]);
  });

  it('reads the per-team grid (Night sees its own vision)', () => {
    const w = vision([[0], [1]], [[0], [0]]);
    const out = new Uint8Array(4);
    writeFogRGBA(w, Team.Night, out);
    expect(out[3]).toBe(FOG_ALPHA_VISIBLE);
  });
});
