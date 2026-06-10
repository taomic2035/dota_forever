import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { mirror, WORLD } from '../src/data/mapLayout';
import { V } from '../src/core/vec2';

const map = new GameMap();

function bfsReachable(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const a = map.cellOf(map.nearestWalkable(from));
  const b = map.cellOf(map.nearestWalkable(to));
  const target = map.cellIndex(b.cx, b.cy);
  const seen = new Uint8Array(map.GW * map.GH);
  const q = [map.cellIndex(a.cx, a.cy)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop()!;
    if (i === target) return true;
    const cx = i % map.GW, cy = Math.floor(i / map.GW);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (!map.isWalkableCell(nx, ny)) continue;
      const ni = map.cellIndex(nx, ny);
      if (!seen[ni]) { seen[ni] = 1; q.push(ni); }
    }
  }
  return false;
}

describe('map symmetry', () => {
  it('every dawn building has a mirrored night building of same kind', () => {
    const dawn = map.buildings.filter((b) => b.team === Team.Dawn);
    const night = map.buildings.filter((b) => b.team === Team.Night);
    expect(dawn.length).toBe(night.length);
    for (const d of dawn) {
      const m = mirror(d.pos);
      const match = night.find((n) => n.kind === d.kind && V.dist(n.pos, m) < 1);
      expect(match, `${d.kind}@${d.pos.x},${d.pos.y}`).toBeTruthy();
    }
  });
  it('lane labels flip top<->bot for night side', () => {
    const dawnTopT1 = map.buildings.find((b) => b.team === Team.Dawn && b.kind === 'tower1' && b.lane === 'top')!;
    const nightBotT1 = map.buildings.find((b) => b.team === Team.Night && b.kind === 'tower1' && b.lane === 'bot')!;
    expect(V.dist(nightBotT1.pos, mirror(dawnTopT1.pos))).toBeLessThan(1);
  });
});

describe('lanes', () => {
  it('all lane waypoints are walkable', () => {
    for (const lane of ['top', 'mid', 'bot'] as const) {
      for (const wp of map.lanes[lane]) {
        expect(map.isWalkable(wp), `${lane} wp ${wp.x},${wp.y}`).toBe(true);
      }
    }
  });
  it('bot lane is mirror of top lane reversed', () => {
    const t = map.lanes.top;
    const b = map.lanes.bot;
    expect(b.length).toBe(t.length);
    expect(V.dist(b[0], mirror(t[t.length - 1]))).toBeLessThan(1);
  });
});

describe('connectivity', () => {
  const dawnFountain = map.buildings.find((b) => b.team === Team.Dawn && b.kind === 'fountain')!.pos;
  const nightFountain = map.buildings.find((b) => b.team === Team.Night && b.kind === 'fountain')!.pos;
  it('dawn fountain reaches night fountain', () => {
    expect(bfsReachable(dawnFountain, nightFountain)).toBe(true);
  });
  it('all camps reachable from dawn fountain', () => {
    for (const c of map.camps) {
      expect(bfsReachable(dawnFountain, c.pos), `camp#${c.id} ${c.tier}`).toBe(true);
    }
  });
  it('pit and runes reachable', () => {
    expect(bfsReachable(dawnFountain, map.pitPos)).toBe(true);
    for (const r of map.runeSpots) expect(bfsReachable(dawnFountain, r)).toBe(true);
  });
  it('secret shops reachable', () => {
    for (const s of map.shops.filter((s) => s.secret)) {
      expect(bfsReachable(dawnFountain, s.pos)).toBe(true);
    }
  });
});

describe('terrain rules', () => {
  it('river cells are height 0 at center line', () => {
    expect(map.heightAt({ x: 7520, y: 7520 })).toBe(0);
  });
  it('bases are height 2', () => {
    expect(map.heightAt({ x: 1150, y: 13890 })).toBe(2);
    expect(map.heightAt({ x: WORLD - 1150, y: WORLD - 13890 })).toBe(2);
  });
  it('deterministic construction', () => {
    const m2 = new GameMap();
    let same = m2.walkable.length === map.walkable.length;
    for (let i = 0; same && i < m2.walkable.length; i++) {
      if (m2.walkable[i] !== map.walkable[i]) same = false;
    }
    expect(same).toBe(true);
  });
});
