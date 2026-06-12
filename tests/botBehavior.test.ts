import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { microLastHit, shopping, type BotState } from '../src/sim/ai/bots';
import { makeItem } from '../src/sim/items';
import type { UnitStats } from '../src/sim/unit';

const map = new GameMap();

function stats(over: Partial<UnitStats> = {}): UnitStats {
  return {
    maxHp: 600, hpRegen: 0, maxMp: 100, mpRegen: 0,
    dmgMin: 50, dmgMax: 50, attackType: 'hero', armorType: 'hero',
    armor: 0, magicResist: 0.25, attackRange: 128, attackPoint: 0.4,
    bat: 1.7, projectileSpeed: 0, moveSpeed: 300, collisionRadius: 24,
    visionDay: 1800, visionNight: 800, acquireRange: 500,
    bountyMin: 40, bountyMax: 40, xpBounty: 60,
    ...over,
  };
}

function botState(over: Partial<BotState> = {}): BotState {
  return { lane: 'mid', nextThink: 0, mode: 'lane', buildIndex: 0, ...over };
}

describe('bot micro: last-hit vs retreat', () => {
  it('issues a last-hit attack on a killable enemy creep while laning', () => {
    const w = createWorld(map, { seed: 5, noBuildings: true, startTime: 60 });
    const bot = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8000 }, name: 'bot', stats: stats() });
    for (let i = 0; i < 10; i++) w.step(); // 点亮该处视野(视野每 8 tick 重算)
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7080, y: 8000 }, name: 'c', stats: stats({ dmgMin: 0, dmgMax: 0, maxHp: 1000 }) });
    creep.hp = 20; // <= avgDmg*0.95 → 可补
    microLastHit(w, bot, botState({ mode: 'lane' }));
    expect(bot.order?.type).toBe('attack');
    expect(bot.order?.targetId).toBe(creep.id);
  });

  it('does not interrupt a retreating bot to last-hit', () => {
    const w = createWorld(map, { seed: 5, noBuildings: true, startTime: 60 });
    const bot = w.spawnUnit({ kind: 'hero', team: Team.Dawn, pos: { x: 7000, y: 8000 }, name: 'bot', stats: stats() });
    for (let i = 0; i < 10; i++) w.step();
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: { x: 7080, y: 8000 }, name: 'c', stats: stats({ dmgMin: 0, dmgMax: 0, maxHp: 1000 }) });
    creep.hp = 20;
    bot.issueOrder({ type: 'move', pos: { x: 6500, y: 8000 } }); // 撤退途中
    microLastHit(w, bot, botState({ mode: 'retreat' }));
    expect(bot.order?.type).toBe('move'); // 撤退不被补刀指令打断
  });
});

describe('bot shopping: stash retrieval', () => {
  it('pulls stranded stash items into free inventory slots at the home shop', () => {
    const w = createWorld(map, { seed: 5, startTime: 0 }); // 默认含建筑/商店
    const bot = spawnHero(w, HEROES[0], Team.Dawn);
    const shop = w.map.shops.find((s) => s.team === Team.Dawn && !s.secret)!;
    bot.pos = { x: shop.pos.x, y: shop.pos.y };
    bot.heroMeta!.gold = 0; // 不触发购买,纯验证取出
    for (let i = 0; i < 5; i++) bot.inventory[i] = makeItem('branch');
    bot.inventory[5] = null;
    bot.stash[0] = makeItem('branch');
    shopping(w, bot, botState());
    expect(bot.stash[0]).toBeNull();
    expect(bot.inventory[5]).not.toBeNull();
  });
});
