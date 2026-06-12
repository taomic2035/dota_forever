import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { HEROES } from '../src/data/heroes';
import { addGold, spendGold, loseGoldOnDeath } from '../src/sim/economy';

// M9 回归:可靠金(工资/击杀/拆塔/Boss)死亡不掉;不可靠金(正补/野)死亡按惩罚扣。
function freshHero() {
  const w = createWorld(new GameMap(), { seed: 1, noBuildings: true });
  const h = spawnHero(w, HEROES[0], Team.Dawn, { x: 7520, y: 7520 });
  h.heroMeta!.gold = 0;
  h.heroMeta!.reliableGold = 0;
  return h;
}

describe('可靠/不可靠金(M9)', () => {
  it('reliable 计入 reliableGold,unreliable 不计', () => {
    const h = freshHero();
    addGold(h, 200, true); // 击杀(可靠)
    addGold(h, 100, false); // 正补(不可靠)
    expect(h.heroMeta!.gold).toBe(300);
    expect(h.heroMeta!.reliableGold).toBe(200);
  });

  it('死亡只扣不可靠金,可靠金分毫不掉', () => {
    const h = freshHero();
    addGold(h, 200, true);
    addGold(h, 100, false);
    loseGoldOnDeath(h, 500); // 远大于不可靠 100
    expect(h.heroMeta!.gold).toBe(200); // 仅损失 100 不可靠
    expect(h.heroMeta!.reliableGold).toBe(200);
  });

  it('死亡惩罚小于不可靠时只扣惩罚额', () => {
    const h = freshHero();
    addGold(h, 50, true);
    addGold(h, 100, false);
    loseGoldOnDeath(h, 30);
    expect(h.heroMeta!.gold).toBe(120); // 150 - 30
    expect(h.heroMeta!.reliableGold).toBe(50);
  });

  it('消费优先扣不可靠;总额低于可靠时回钳 reliableGold', () => {
    const h = freshHero();
    addGold(h, 80, true);
    addGold(h, 100, false);
    spendGold(h, 150); // 总 180 → 30
    expect(h.heroMeta!.gold).toBe(30);
    expect(h.heroMeta!.reliableGold).toBe(30); // 回钳至总额
  });

  it('reliableGold 不超过总额', () => {
    const h = freshHero();
    addGold(h, 1000, true); // 即便全可靠
    expect(h.heroMeta!.reliableGold).toBeLessThanOrEqual(h.heroMeta!.gold);
  });
});
