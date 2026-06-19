import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { itemDef } from '../src/data/items';
import { hasShard } from '../src/sim/abilities';
import { applyModifier } from '../src/sim/modifiers';
import { REIN_W } from '../src/data/heroes/rein';
import { LIYA_W } from '../src/data/heroes/liya';
import { AILI_Q } from '../src/data/heroes/aili';
import { ZOLA_W } from '../src/data/heroes/zola';

const map = new GameMap();
const heroByName = (n: string) => HEROES.find((h) => h.name === n) ?? HEROES[0];

describe('阿哈神识 — 框架', () => {
  it('使用 → 永久激活 shard;不可重复消耗;hasShard 反映', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const h = spawnHero(w, HEROES[0], Team.Dawn);
    const onUse = itemDef('aghanims_shard').active!.onUse;
    expect(hasShard(h)).toBe(false);
    expect(onUse(w, h)).toBe(true);
    expect(h.heroMeta!.shard).toBe(true);
    expect(hasShard(h)).toBe(true);
    expect(onUse(w, h)).toBe(false); // 已激活
  });
});

describe('阿哈神识 — 雷恩 W 软驱散', () => {
  it('神识战吼移除友军减益', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const rein = spawnHero(w, heroByName('雷恩·铁壁'), Team.Dawn, { x: 1000, y: 1000 });
    const ally = spawnHero(w, HEROES[1], Team.Dawn, { x: 1050, y: 1000 });
    applyModifier(w, ally, { key: 'test_slow', duration: 5, stats: { bonusMoveSpeedPct: -0.4 } }, ally.id);
    expect(ally.modifiers.some((m) => m.key === 'test_slow')).toBe(true);
    rein.heroMeta!.shard = true;
    REIN_W.onCast!(w, rein, 1);
    expect(ally.modifiers.some((m) => m.key === 'test_slow')).toBe(false); // 已被软驱散
  });

  it('无神识不驱散', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const rein = spawnHero(w, heroByName('雷恩·铁壁'), Team.Dawn, { x: 1000, y: 1000 });
    const ally = spawnHero(w, HEROES[1], Team.Dawn, { x: 1050, y: 1000 });
    applyModifier(w, ally, { key: 'test_slow', duration: 5, stats: { bonusMoveSpeedPct: -0.4 } }, ally.id);
    REIN_W.onCast!(w, rein, 1);
    expect(ally.modifiers.some((m) => m.key === 'test_slow')).toBe(true);
  });
});

describe('阿哈神识 — 艾莉 Q 寒霜碎裂', () => {
  it('对已减速敌人造成额外魔法伤害;无神识不触发', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const aili = spawnHero(w, heroByName('疾风射手·艾莉'), Team.Dawn, { x: 1000, y: 1000 });
    const foe = spawnHero(w, HEROES[2], Team.Night, { x: 1100, y: 1000 });
    applyModifier(w, foe, { key: 'pre_slow', duration: 5, stats: { bonusMoveSpeedPct: -0.2 } }, aili.id);

    const hp0 = foe.hp;
    AILI_Q.orbOnHit!(w, aili, foe, 2); // 无神识
    expect(foe.hp).toBe(hp0); // 仅减速,无伤害

    aili.heroMeta!.shard = true;
    AILI_Q.orbOnHit!(w, aili, foe, 2);
    expect(foe.hp).toBeLessThan(hp0); // 寒霜碎裂伤害
  });
});

describe('阿哈神识 — 佐拉 W 弹射', () => {
  it('天雷弹射至附近额外敌方英雄', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const zola = spawnHero(w, heroByName('雷霆先知·佐拉'), Team.Dawn, { x: 900, y: 1000 });
    const t1 = spawnHero(w, HEROES[3], Team.Night, { x: 1000, y: 1000 });
    const t2 = spawnHero(w, HEROES[4], Team.Night, { x: 1100, y: 1000 }); // 距 t1 100 < 600
    zola.heroMeta!.shard = true;
    const t2hp0 = t2.hp;
    ZOLA_W.onCast!(w, zola, 1, undefined, t1);
    expect(t2.hp).toBeLessThan(t2hp0); // 弹射命中
  });

  it('无神识不弹射', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const zola = spawnHero(w, heroByName('雷霆先知·佐拉'), Team.Dawn, { x: 900, y: 1000 });
    const t1 = spawnHero(w, HEROES[3], Team.Night, { x: 1000, y: 1000 });
    const t2 = spawnHero(w, HEROES[4], Team.Night, { x: 1100, y: 1000 });
    const t2hp0 = t2.hp;
    ZOLA_W.onCast!(w, zola, 1, undefined, t1);
    expect(t2.hp).toBe(t2hp0);
  });
});

describe('阿哈神识 — 莉雅 W 冰封碎裂(onExpire)', () => {
  it('神识冰封到期引爆小新星,波及附近敌人', () => {
    const w = createWorld(map, { seed: 1, startTime: 200 });
    const liya = spawnHero(w, heroByName('霜语者·莉雅'), Team.Dawn, { x: 900, y: 1000 });
    const target = spawnHero(w, HEROES[3], Team.Night, { x: 1000, y: 1000 });
    const bystander = spawnHero(w, HEROES[4], Team.Night, { x: 1050, y: 1000 }); // 距 target 50 < 300
    liya.heroMeta!.shard = true;
    LIYA_W.onCast!(w, liya, 1, undefined, target);
    const m = target.modifiers.find((mm) => mm.key === 'liya_bind_root');
    expect(m?.def.onExpire).toBeTruthy(); // 神识赋予到期回调
    const hp0 = bystander.hp;
    m!.def.onExpire!(w, target, m!); // 触发到期
    expect(bystander.hp).toBeLessThan(hp0); // 小新星波及
  });
});
