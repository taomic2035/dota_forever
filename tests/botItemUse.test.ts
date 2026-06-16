import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { tryUseOffensiveItems, tryUseDefensiveItems } from '../src/sim/ai/bots';
import { makeItem } from '../src/sim/items';
import { applyModifier } from '../src/sim/modifiers';
import { stateOf } from '../src/sim/combat';
import { HEROES } from '../src/data/heroes';

const map = new GameMap();

describe('tryUseOffensiveItems(bot 战斗中用攻击性主动物品)', () => {
  it('对射程内敌方目标施放 orchid(敌方指向控制物品)', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    const enemy = spawnHero(w, HEROES[5], Team.Night, { x: 7200, y: 7000 }); // 200 < orchid 900
    bot.inventory[0] = makeItem('orchid');

    expect(tryUseOffensiveItems(w, bot, enemy)).toBe(true);
    expect(bot.inventory[0]!.cooldownUntil).toBeGreaterThan(0); // 进入冷却 = 已使用
    expect(enemy.modifiers.some((m) => m.key === 'item_orchid_silence')).toBe(true); // 敌方被沉默
  });

  it('目标超出物品射程时不使用', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    const far = spawnHero(w, HEROES[5], Team.Night, { x: 8300, y: 7000 }); // 1300 > orchid 900
    bot.inventory[0] = makeItem('orchid');
    expect(tryUseOffensiveItems(w, bot, far)).toBe(false);
    expect(bot.inventory[0]!.cooldownUntil).toBeLessThan(0); // 未使用
  });

  it('非攻击性物品(治疗 salve,非敌方指向)不会被当攻击物品使用', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    const enemy = spawnHero(w, HEROES[5], Team.Night, { x: 7200, y: 7000 });
    bot.inventory[0] = makeItem('salve'); // active targetMode 'none',非 enemy 指向
    expect(tryUseOffensiveItems(w, bot, enemy)).toBe(false);
  });
});

describe('tryUseDefensiveItems(bot 受威胁时自保)', () => {
  it('被沉默时使用 BKB(强驱散解控 + 魔免)', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    bot.inventory[0] = makeItem('bkb');
    applyModifier(w, bot, { key: 'test_silence', duration: 5, states: { silenced: true } }, bot.id);
    expect(stateOf(bot).silenced).toBe(true);

    expect(tryUseDefensiveItems(w, bot)).toBe(true);
    expect(bot.inventory[0]!.cooldownUntil).toBeGreaterThan(0); // BKB 已用
    expect(bot.modifiers.some((m) => m.key === 'item_bkb')).toBe(true); // 获魔免
    expect(stateOf(bot).silenced).toBeFalsy(); // 强驱散解除沉默(modifier 移除后属性为 undefined)
  });

  it('濒死(<45%)时使用 BKB', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    bot.inventory[0] = makeItem('bkb');
    bot.hp = bot.calc.maxHp * 0.3;
    expect(tryUseDefensiveItems(w, bot)).toBe(true);
    expect(bot.inventory[0]!.cooldownUntil).toBeGreaterThan(0);
  });

  it('满血未被控时不浪费 BKB', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    bot.inventory[0] = makeItem('bkb');
    expect(tryUseDefensiveItems(w, bot)).toBe(false); // 满血不被控 → 不用
  });

  it('安全:非 allowlist 的自施物品(动力之靴)即使濒死也不误用', () => {
    const w = createWorld(map, { seed: 1, startTime: 300 });
    const bot = spawnHero(w, HEROES[0], Team.Dawn, { x: 7000, y: 7000 });
    bot.inventory[0] = makeItem('power_treads'); // 'none' 切换属性,不在 allowlist
    bot.hp = bot.calc.maxHp * 0.2;
    expect(tryUseDefensiveItems(w, bot)).toBe(false); // allowlist 杜绝乱用非自保物品
  });
});
