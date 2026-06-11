import { describe, it, expect, beforeEach } from 'vitest';
import { GameMap, Team } from '../src/sim/map';
import { createWorld } from '../src/sim/setup';
import { spawnHero } from '../src/sim/hero';
import { makeItem, useItem, syncHolderModifiers } from '../src/sim/items';
import { hasModifier, applyModifier } from '../src/sim/modifiers';
import { applyDamage } from '../src/sim/combat';
import { REIN, LIYA } from '../src/data/heroes';
import { V } from '../src/core/vec2';
import type { World } from '../src/sim/world';
import type { Unit } from '../src/sim/unit';

const map = new GameMap();

let w: World;
let h: Unit;
beforeEach(() => {
  w = createWorld(map, { seed: 71, startTime: 0 });
  h = spawnHero(w, REIN, Team.Dawn, w.map.nearestWalkable({ x: 6000, y: 9000 }));
  h.heroMeta!.gold = 99999;
});

function give(u: Unit, key: string): number {
  const slot = u.inventory.findIndex((s) => s === null);
  u.inventory[slot] = makeItem(key);
  syncHolderModifiers(w, u);
  return slot;
}
function run(n: number) { for (let i = 0; i < n; i++) w.step(); }

describe('advanced items batch 2', () => {
  it('黯灭:攻击使目标减甲', () => {
    give(h, 'desolator');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6150, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(hasModifier(t, 'item_desolator_armor')).toBe(true);
  });

  it('风暴之锤:攻击概率触发连锁闪电(多次攻击必中)', () => {
    give(h, 'maelstrom');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6150, y: 9000 }, name: 't',
      stats: { ...REIN_STATS(), maxHp: 100000, magicResist: 0 } });
    const near = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6300, y: 9050 }, name: 'n',
      stats: { ...REIN_STATS(), maxHp: 100000, magicResist: 0 } });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(30 * 12); // 12 秒多次攻击,30% 概率应触发过
    // 连锁会溅到附近的 near
    expect(near.hp).toBeLessThan(100000);
  });

  it('原力法杖:推动目标', () => {
    const slot = give(h, 'force_staff');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6400, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    t.facing = 0; // 朝 +x
    const x0 = t.pos.x;
    useItem(w, h, slot, undefined, t);
    run(5);
    expect(t.pos.x).toBeGreaterThan(x0 + 300);
  });

  it('挽紧之杖:缠绕敌方', () => {
    const slot = give(h, 'atos');
    h.mp = 200;
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6500, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    useItem(w, h, slot, undefined, t);
    run(5);
    expect(hasModifier(t, 'item_atos_root')).toBe(true);
  });

  it('影锋:主动隐身', () => {
    const slot = give(h, 'shadow_blade');
    useItem(w, h, slot);
    run(5);
    expect(hasModifier(h, 'item_shadowblade')).toBe(true);
  });

  it('亡者之书:召唤两个随从', () => {
    const slot = give(h, 'necronomicon');
    h.mp = 200;
    useItem(w, h, slot);
    run(10);
    const minions = [...w.units.values()].filter((u) => u.name === '亡者随从' && u.alive);
    expect(minions.length).toBe(2);
  });

  it('勇气勋章:对敌减甲', () => {
    const slot = give(h, 'medallion');
    const t = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: { x: 6400, y: 9000 }, name: 't',
      stats: { ...REIN_STATS() } });
    w.step();
    const armor0 = t.calc.armor;
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(t.calc.armor).toBeLessThan(armor0);
  });

  it('纷争面纱:沉默目标', () => {
    const slot = give(h, 'orchid');
    const t = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable({ x: 6500, y: 9000 }));
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_orchid_silence')).toBe(true);
  });
});

describe('advanced items batch 3', () => {
  function enemyAt(dx: number, over: Record<string, unknown> = {}): Unit {
    return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: dx, y: 0 })), name: 't', stats: { ...REIN_STATS(), ...over } });
  }

  it('先锋之盾:被动减伤', () => {
    give(h, 'vanguard'); w.step();
    expect(h.calc.incomingDamageReduction).toBeGreaterThan(0.1);
  });

  it('蝶舞之翼:提供闪避', () => {
    give(h, 'butterfly'); w.step();
    expect(h.calc.evasion).toBeGreaterThanOrEqual(0.35);
  });

  it('圣剑:巨额攻击加成', () => {
    give(h, 'rapier'); w.step();
    expect(h.calc.dmgMax).toBeGreaterThan(300);
  });

  it('寒霜之心:攻击施加冰冷减速', () => {
    give(h, 'skadi');
    const t = enemyAt(110, { magicResist: 0 });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(hasModifier(t, 'item_skadi_cold')).toBe(true);
  });

  it('雷神之锤:连锁闪电波及附近敌人', () => {
    give(h, 'mjollnir');
    const t = enemyAt(110, { maxHp: 200000, magicResist: 0 });
    const near = w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: 260, y: 60 })), name: 'n', stats: { ...REIN_STATS(), maxHp: 200000, magicResist: 0 } });
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(30 * 12);
    expect(near.hp).toBeLessThan(200000);
  });

  it('雷神之锤:主动静电护盾', () => {
    const slot = give(h, 'mjollnir');
    useItem(w, h, slot);
    run(2);
    expect(hasModifier(h, 'item_mjollnir_shield')).toBe(true);
  });

  it('净魂之刃:攻击燃烧法力', () => {
    give(h, 'diffusal');
    const t = enemyAt(110, { magicResist: 0 });
    t.mp = 200;
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(t.mp).toBeLessThan(200);
  });

  it('深渊之刃:主动眩晕', () => {
    const slot = give(h, 'abyssal');
    const t = enemyAt(300);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_abyssal_stun')).toBe(true);
  });

  it('幽魂权杖:虚化免疫物理', () => {
    const slot = give(h, 'ghost');
    useItem(w, h, slot);
    run(1);
    expect(hasModifier(h, 'item_ghost')).toBe(true);
    const dealt = applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300 });
    expect(dealt).toBe(0); // 物理免疫
  });

  it('飓风之杖:旋风禁锢敌方', () => {
    const slot = give(h, 'eul');
    h.mp = 9999;
    const t = enemyAt(300);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_eul_cyclone')).toBe(true);
  });

  it('妖术法球:变形硬控', () => {
    const slot = give(h, 'hex');
    h.mp = 9999;
    const t = enemyAt(300);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_hex')).toBe(true);
  });

  it('神灭之球:爆发魔法伤害', () => {
    const slot = give(h, 'dagon');
    h.mp = 9999;
    const t = enemyAt(300, { magicResist: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, undefined, t);
    run(2);
    expect(hp0 - t.hp).toBeGreaterThan(300);
  });

  it('虚空面纱:削减敌方魔抗', () => {
    const slot = give(h, 'veil');
    h.mp = 9999;
    const t = enemyAt(300);
    const mr0 = t.calc.magicResist;
    useItem(w, h, slot, t.pos);
    run(2);
    expect(hasModifier(t, 'item_veil')).toBe(true);
    expect(t.calc.magicResist).toBeLessThan(mr0);
  });

  it('洞察烟斗:友军护盾吸收伤害', () => {
    const slot = give(h, 'pipe');
    useItem(w, h, slot);
    run(1);
    expect(hasModifier(h, 'item_pipe_shield')).toBe(true);
    const hp0 = h.hp;
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300, flags: { pure: true } });
    expect(h.hp).toBe(hp0); // 被护盾完全吸收
  });

  it('刷新之球:重置技能冷却', () => {
    const slot = give(h, 'refresher');
    h.mp = 9999;
    h.abilities[0].cooldownUntil = w.time + 100;
    useItem(w, h, slot);
    expect(h.abilities[0].cooldownUntil).toBeLessThan(w.time);
  });
});

describe('advanced items batch 4', () => {
  function enemyAt(dx: number, over: Record<string, unknown> = {}): Unit {
    return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: dx, y: 0 })), name: 't', stats: { ...REIN_STATS(), ...over } });
  }
  // 逐 tick 轮询,捕获短时(0.4~0.8s)触发型 modifier
  function attackUntilProc(target: Unit, key: string, ticks: number): boolean {
    h.issueOrder({ type: 'attack', targetId: target.id });
    for (let i = 0; i < ticks; i++) { w.step(); if (target.modifiers.some((m) => m.key === key)) return true; }
    return false;
  }

  it('梅肯斯姆:团队治疗+护甲', () => {
    const slot = give(h, 'mekansm'); h.mp = 200;
    const ally = spawnHero(w, LIYA, Team.Dawn, w.map.nearestWalkable(V.add(h.pos, { x: 200, y: 0 })));
    ally.hp = 200;
    useItem(w, h, slot);
    run(3);
    expect(ally.hp).toBeGreaterThan(200);
    expect(hasModifier(ally, 'item_mek_armor')).toBe(true);
  });

  it('远古战鼓:团队加速并消耗充能', () => {
    const slot = give(h, 'drum');
    const inst = h.inventory.find((i) => i?.itemKey === 'drum')!;
    expect(inst.charges).toBe(5);
    useItem(w, h, slot);
    run(3);
    expect(hasModifier(h, 'item_drum_buff')).toBe(true);
    expect(inst.charges).toBe(4);
  });

  it('点金手:点化小兵获得金钱', () => {
    const slot = give(h, 'midas');
    const gold0 = h.heroMeta!.gold;
    const creep = w.spawnUnit({ kind: 'creep', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: 200, y: 0 })), name: 'c', stats: { ...REIN_STATS(), maxHp: 550 } });
    useItem(w, h, slot, undefined, creep);
    run(2);
    expect(creep.alive).toBe(false);
    expect(h.heroMeta!.gold).toBeGreaterThan(gold0);
  });

  it('萃取之瓶:对敌持续伤害并消耗充能', () => {
    const slot = give(h, 'urn');
    const inst = h.inventory.find((i) => i?.itemKey === 'urn')!;
    const t = enemyAt(200, { magicResist: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, undefined, t);
    run(60);
    expect(t.hp).toBeLessThan(hp0);
    expect(inst.charges).toBe(2);
  });

  it('萨格之刃:攻击致残', () => {
    give(h, 'sange');
    const t = enemyAt(110, { maxHp: 100000 });
    expect(attackUntilProc(t, 'item_maim', 30 * 8)).toBe(true);
  });

  it('赤红甲:攻击致残', () => {
    give(h, 'sange_yasha');
    const t = enemyAt(110, { maxHp: 100000 });
    expect(attackUntilProc(t, 'item_maim', 30 * 8)).toBe(true);
  });

  it('幻影斧:分裂出 2 个幻象', () => {
    const slot = give(h, 'manta'); h.mp = 200;
    useItem(w, h, slot);
    run(3);
    const illu = [...w.units.values()].filter((u) => u.kind === 'illusion' && u.summonOwnerId === h.id && u.alive);
    expect(illu.length).toBe(2);
  });

  it('金箍棒:攻击触发重击眩晕', () => {
    give(h, 'mkb');
    const t = enemyAt(110, { maxHp: 100000, magicResist: 0 });
    expect(attackUntilProc(t, 'item_mkb_bash', 30 * 12)).toBe(true);
  });

  it('缚足锤:攻击触发眩晕', () => {
    give(h, 'basher');
    const t = enemyAt(110, { maxHp: 100000 });
    expect(attackUntilProc(t, 'item_basher_bash', 30 * 16)).toBe(true);
  });

  it('莲花宝珠:护盾吸收伤害', () => {
    const slot = give(h, 'lotus');
    useItem(w, h, slot);
    run(1);
    expect(hasModifier(h, 'item_lotus_shield')).toBe(true);
    const hp0 = h.hp;
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 200, flags: { pure: true } });
    expect(h.hp).toBe(hp0); // 被护盾吸收
  });

  it('天鹰之戟:增加攻击距离', () => {
    give(h, 'dragon_lance'); w.step();
    expect(h.calc.attackRange).toBeGreaterThan(REIN.attackRange + 100);
  });

  it('法术之刃:提供法术增强', () => {
    give(h, 'kaya'); w.step();
    expect(h.calc.spellAmp).toBeGreaterThanOrEqual(0.15);
  });
});

describe('advanced items batch 5', () => {
  function enemyAt(dx: number, over: Record<string, unknown> = {}): Unit {
    return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: dx, y: 0 })), name: 't', stats: { ...REIN_STATS(), ...over } });
  }

  it('天堂之戟:缴械目标', () => {
    const slot = give(h, 'heavens_halberd');
    const t = enemyAt(400);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_halberd_disarm')).toBe(true);
  });

  it('雷神枷锁:范围缠绕+伤害', () => {
    const slot = give(h, 'gleipnir'); h.mp = 200;
    const t = enemyAt(300, { magicResist: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, V.add(h.pos, { x: 300, y: 0 }));
    run(3);
    expect(hasModifier(t, 'item_gleipnir_root')).toBe(true);
    expect(t.hp).toBeLessThan(hp0);
  });

  it('静默之刃:主动隐身', () => {
    const slot = give(h, 'silver_edge');
    useItem(w, h, slot);
    run(3);
    expect(hasModifier(h, 'item_silveredge')).toBe(true);
  });

  it('以太之镜:法术增强+攻击距离', () => {
    give(h, 'aether_lens'); w.step();
    expect(h.calc.spellAmp).toBeGreaterThanOrEqual(0.12);
    expect(h.calc.attackRange).toBeGreaterThan(REIN.attackRange);
  });

  it('奥术核心:高法术增强', () => {
    give(h, 'octarine'); w.step();
    expect(h.calc.spellAmp).toBeGreaterThanOrEqual(0.2);
  });

  it('深红甲盾:团队减伤主动', () => {
    const slot = give(h, 'crimson_guard'); h.mp = 200; w.step();
    expect(h.calc.incomingDamageReduction).toBeGreaterThan(0.1);
    const ally = spawnHero(w, LIYA, Team.Dawn, w.map.nearestWalkable(V.add(h.pos, { x: 200, y: 0 })));
    useItem(w, h, slot);
    run(3);
    expect(hasModifier(ally, 'item_crimson_buff')).toBe(true);
  });

  it('卫士胫甲:团队治疗+驱散', () => {
    const slot = give(h, 'guardian_greaves'); h.mp = 200;
    const ally = spawnHero(w, LIYA, Team.Dawn, w.map.nearestWalkable(V.add(h.pos, { x: 200, y: 0 })));
    ally.hp = 200;
    applyModifier(w, ally, { key: 'test_slow', duration: 10, stats: { bonusMoveSpeedPct: -0.5 } }, ally.id);
    useItem(w, h, slot);
    run(3);
    expect(ally.hp).toBeGreaterThan(200);
    expect(hasModifier(ally, 'test_slow')).toBe(false); // 被驱散
  });

  it('银月之冠:破甲敌方', () => {
    const slot = give(h, 'solar_crest'); h.mp = 200;
    const t = enemyAt(400);
    w.step();
    const armor0 = t.calc.armor;
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(t.calc.armor).toBeLessThan(armor0);
  });

  it('飓风长戟:推开目标', () => {
    const slot = give(h, 'hurricane_pike');
    const t = enemyAt(400);
    t.facing = 0;
    const x0 = t.pos.x;
    useItem(w, h, slot, undefined, t);
    run(5);
    expect(t.pos.x).toBeGreaterThan(x0 + 300);
  });

  it('阴邪之罐:灼伤敌方并消耗充能', () => {
    const slot = give(h, 'spirit_vessel');
    const inst = h.inventory.find((i) => i?.itemKey === 'spirit_vessel')!;
    const t = enemyAt(400, { magicResist: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, undefined, t);
    run(60);
    expect(t.hp).toBeLessThan(hp0);
    expect(inst.charges).toBe(3);
  });

  it('月之碎片:极致攻速', () => {
    give(h, 'moon_shard'); w.step();
    expect(h.calc.ias).toBeGreaterThan(1.0);
  });

  it('血棘:沉默目标', () => {
    const slot = give(h, 'bloodthorn');
    const t = spawnHero(w, LIYA, Team.Night, w.map.nearestWalkable(V.add(h.pos, { x: 400, y: 0 })));
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_bloodthorn_silence')).toBe(true);
  });
});

describe('advanced items batch 6', () => {
  function enemyAt(dx: number, over: Record<string, unknown> = {}): Unit {
    return w.spawnUnit({ kind: 'hero', team: Team.Night, pos: w.map.nearestWalkable(V.add(h.pos, { x: dx, y: 0 })), name: 't', stats: { ...REIN_STATS(), ...over } });
  }

  it('疾风之纹:提升移速', () => {
    const ms0 = h.calc.moveSpeed;
    give(h, 'wind_lace'); w.step();
    expect(h.calc.moveSpeed).toBeGreaterThan(ms0);
  });

  it('以太之刃:虚化目标(免疫物理)+法术爆发', () => {
    const slot = give(h, 'ethereal_blade'); h.mp = 200;
    const t = enemyAt(400, { magicResist: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_ethereal')).toBe(true);
    expect(t.hp).toBeLessThan(hp0); // 法术爆发
    expect(applyDamage(w, t, { source: 0, attackType: 'hero', amount: 300 })).toBe(0); // 物理免疫
  });

  it('流星锤:延迟砸落眩晕', () => {
    const slot = give(h, 'meteor_hammer'); h.mp = 200;
    const t = enemyAt(300, { magicResist: 0, moveSpeed: 0, acquireRange: 0 });
    const hp0 = t.hp;
    useItem(w, h, slot, V.add(h.pos, { x: 300, y: 0 }));
    run(10);
    expect(t.hp).toBe(hp0); // 尚未砸落
    run(50);
    expect(t.hp).toBeLessThan(hp0);
    expect(hasModifier(t, 'item_meteor_stun')).toBe(true);
  });

  it('否决坠饰:禁锢敌方', () => {
    const slot = give(h, 'nullifier'); h.mp = 200;
    const t = enemyAt(400);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(hasModifier(t, 'item_nullifier_mute')).toBe(true);
  });

  it('永恒之纱:护盾吸收', () => {
    const slot = give(h, 'eternal_shroud');
    useItem(w, h, slot);
    run(1);
    expect(hasModifier(h, 'item_eternal_barrier')).toBe(true);
    const hp0 = h.hp;
    applyDamage(w, h, { source: 0, attackType: 'hero', amount: 300, flags: { pure: true } });
    expect(h.hp).toBe(hp0); // 被屏障吸收
  });

  it('散华:攻击燃烧法力', () => {
    give(h, 'disperser');
    const t = enemyAt(110, { magicResist: 0 });
    t.mp = 200;
    h.issueOrder({ type: 'attack', targetId: t.id });
    run(40);
    expect(t.mp).toBeLessThan(200);
  });

  it('渔叉:拉近自身并减速', () => {
    const slot = give(h, 'harpoon'); const t = enemyAt(800, { moveSpeed: 0, acquireRange: 0 });
    const d0 = V.dist(h.pos, t.pos);
    useItem(w, h, slot, undefined, t);
    run(3);
    expect(V.dist(h.pos, t.pos)).toBeLessThan(d0); // 拉近
    expect(hasModifier(t, 'item_harpoon_slow')).toBe(true);
  });

  it('支配头盔:吸血光环', () => {
    give(h, 'helm_dominator');
    const ally = spawnHero(w, LIYA, Team.Dawn, w.map.nearestWalkable(V.add(h.pos, { x: 200, y: 0 })));
    run(30);
    expect(hasModifier(ally, 'item_helm_lifesteal')).toBe(true);
  });

  it('风之波荡:自旋无敌', () => {
    const slot = give(h, 'wind_waker'); h.mp = 200;
    useItem(w, h, slot);
    run(2);
    expect(hasModifier(h, 'item_windwaker')).toBe(true);
    expect(h.invulnerable).toBe(true);
    expect(applyDamage(w, h, { source: 0, attackType: 'hero', amount: 500 })).toBe(0);
  });

  it('永世法衣:法术增强', () => {
    give(h, 'kaya_sange'); w.step();
    expect(h.calc.spellAmp).toBeGreaterThanOrEqual(0.12);
  });
});

function REIN_STATS() {
  return {
    maxHp: 2000, hpRegen: 0, maxMp: 300, mpRegen: 0, dmgMin: 0, dmgMax: 0,
    attackType: 'hero' as const, armorType: 'hero' as const, armor: 3, magicResist: 0.25,
    attackRange: 150, attackPoint: 0.3, bat: 1.7, projectileSpeed: 0,
    moveSpeed: 300, collisionRadius: 24, visionDay: 1800, visionNight: 800,
    acquireRange: 600, bountyMin: 0, bountyMax: 0, xpBounty: 0,
  };
}
