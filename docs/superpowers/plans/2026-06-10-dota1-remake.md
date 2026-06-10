# DotA1 玩法复刻 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans(本项目选定 Inline 执行——强耦合游戏代码库,单一作者保证一致性)。Steps 用 checkbox 跟踪,**每完成一个 Task 必须勾选本文件并 commit**(压缩恢复锚点)。

**Goal:** 浏览器内可玩的 DotA1 核心玩法复刻:5v5(玩家+9 AI)三路推塔至摧毁主基地,含补刀/反补/迷雾/昼夜/符文/野区/Boss/装备合成。

**Architecture:** 确定性 30Hz 定步模拟(种子随机、不触 DOM、实体 id 引用)与 Canvas2D 分层渲染(rAF 插值)严格分离;Modifier 系统承载一切状态效果;Order 指令统一人类与 AI 输入。

**Tech Stack:** TypeScript + Vite + 原生 Canvas2D + vitest。零运行时依赖。

**全局纪律:** ① 每 Task 结束 `npm test` 绿 + commit;② sim/ 不得 import DOM/render;③ 数值只进 `data/balance.ts`;④ 跨实体引用一律 `EntityId`(number);⑤ 浏览器验证用 `window.__game` 暴露的状态钩子 + Playwright 截图。

**速查 — 锁定的核心接口(后续 Task 不得偏离命名):**

```ts
// core
type EntityId = number;
class Vec2 { x: number; y: number }                  // core/vec2.ts, 不可变风格静态方法 add/sub/scale/len/dist/norm/lerp
class Rng { constructor(seed: number); next(): number; range(a,b): number; pick<T>(arr): T }  // mulberry32

// sim 顶层
class World {
  tick: number;                                       // 30Hz, dt=1/30 固定
  rng: Rng;
  map: GameMap;
  units: Map<EntityId, Unit>;
  step(): void;                                       // 推进一帧
  spawnUnit(def, team, pos): Unit;
  getUnit(id): Unit | undefined;
  queryRadius(pos, r, filter?): Unit[];
  events: GameEvent[];                                // 本 tick 事件(渲染/UI/音频消费后清空)
}
enum Team { Dawn = 0, Night = 1, Neutral = 2 }        // 晨曦 / 永夜 / 中立
type OrderType = 'move'|'attack'|'attackmove'|'cast'|'hold'|'stop';
interface Order { type: OrderType; pos?: Vec2; targetId?: EntityId; abilityIndex?: number }
class Unit {
  id: EntityId; team: Team; pos: Vec2; facing: number;
  hp: number; mp: number; level: number;
  base: UnitStats; calc: CalcStats;                   // calc 每 tick 由 base+modifiers 重算
  modifiers: Modifier[]; abilities: AbilityInstance[]; inventory: ItemInstance[];
  order: Order | null; orderQueue: Order[];
  issueOrder(o: Order): void;
  takeDamage(d: DamageEvent): void;
  isAlive(): boolean; isHero(): boolean;
}
interface DamageEvent { source: EntityId; attackType: AttackType; amount: number; flags: { spell?: boolean; pure?: boolean } }
type AttackType = 'hero'|'normal'|'pierce'|'siege'|'spell';
type ArmorType  = 'hero'|'unarmored'|'light'|'medium'|'heavy'|'fortified';

// modifier
interface ModifierDef {
  key: string; duration?: number;                     // 无 duration = 永久(光环每 0.5s 续期)
  stats?: Partial<StatMods>;                          // 加法/乘法字段见 Task 13
  states?: Partial<{ stunned; rooted; silenced; disarmed; invisible; magicImmune; phased; trueSight }>;
  tickInterval?: number; onTick?(w: World, u: Unit, m: Modifier): void;   // DoT/周期效果
  aura?: { radius: number; affects: 'ally'|'enemy'; grant: ModifierDef }; // 光环本体挂自身
}

// ability
type TargetMode = 'none'|'point'|'unit'|'passive';
interface AbilityDef {
  key: string; name: string; maxLevel: number; ultimate?: boolean;
  targetMode: TargetMode; castRange?: number[]; manaCost?: number[]; cooldown?: number[];
  castPoint?: number;                                 // 前摇秒
  tags: Array<'nuke'|'stun'|'slow'|'heal'|'escape'|'buff'|'aoe'|'channel'|'orb'>;
  aiScore?(w: World, caster: Unit, lvl: number): { score: number; pos?: Vec2; targetId?: EntityId } | null;
  onCast?(w: World, caster: Unit, lvl: number, pos?: Vec2, target?: Unit): void;
  passiveModifier?(lvl: number): ModifierDef;         // passive 类自动挂载
  channel?: { duration: number; onChannelTick(...): void };
}

// map
class GameMap {
  W = 15000; H = 15000; CELL = 64; GW = 235; GH = 235;
  walkable: Uint8Array; height: Uint8Array;           // 0/1/2 三层
  trees: Set<number>;                                 // cell index
  lanes: Record<'top'|'mid'|'bot', Vec2[]>;           // 晨曦→永夜方向 waypoints
  buildings: BuildingSpawn[]; camps: CampSpawn[]; runeSpots: Vec2[]; shops: ShopZone[];
  cellAt(pos: Vec2): number; isWalkable(pos): boolean; heightAt(pos): number;
}
findPath(map: GameMap, from: Vec2, to: Vec2): Vec2[]  // A* + 视线拉直
```

---

## M1 地基

### Task 1: 工程脚手架
**Files:** `package.json` `tsconfig.json` `vite.config.ts` `index.html` `.gitignore` `src/main.ts` `tests/smoke.test.ts`
- [x] devDeps: `vite typescript vitest`;scripts: `dev/build/test/typecheck`(typecheck=`tsc --noEmit`)
- [x] index.html:全屏黑底 `#app`,canvas 由 JS 创建;禁右键菜单
- [x] smoke 测试:`expect(1+1).toBe(2)`;`npm test` 绿、`npm run dev` 起服
- [x] Commit `chore: scaffold vite+ts+vitest`

### Task 2: core 数学库
**Files:** `src/core/vec2.ts` `src/core/rng.ts` `src/core/mathx.ts` · Test: `tests/core.test.ts`
- [x] Vec2 静态方法集;Rng=mulberry32(同种子序列一致);mathx: clamp/lerp/angleTo/turnTowards
- [x] 测试:同种子 100 个数完全一致;dist/norm 边界(零向量)
- [x] Commit `feat(core): vec2/rng/mathx`

### Task 3: balance.ts 数值总表
**Files:** `src/data/balance.ts` · Test: `tests/balance.test.ts`
- [x] 护甲公式函数 `armorReduction(a)`(0.06A/(1+0.06A),负甲 −(2−0.94^|A|));`DAMAGE_MATRIX[attackType][armorType]`:hero 对 fortified 0.5、对其余 1.0;siege 对 fortified 1.5 对 hero 0.5;pierce 对 hero 0.5 对 unarmored/light 1.5 对 fortified 0.35;normal 对 medium 1.5 对 fortified 0.7;spell 对 hero 1.0 对 fortified 0(建筑免疫法术)
- [x] 属性换算、XP_TABLE(1-25)、复活/掉金/赏金、兵线表、昼夜、视野、经济全量常量(经典近似,注释标注)
- [x] 测试:矩阵 5×6 全覆盖无 undefined;armorReduction(0)=0、单调性;XP_TABLE 长度 25 严格递增
- [x] Commit `feat(data): balance constants + damage matrix`

### Task 4: 地图生成
**Files:** `src/sim/map.ts` `src/data/mapLayout.ts` · Test: `tests/map.test.ts`
- [x] 中心对称(绕中心旋转 180°):河道带(高度0)、三路(高度1 主平台,基地高度2)、坡道、树木簇、塔/兵营/圣坛/泉水点位、野怪营地盒、符文点、商店区
- [x] 镜像辅助 `mirror(p) = (W-x, H-y)`;晨曦基地左下
- [x] 测试:对称性(每建筑存在镜像)、三路 waypoint 全可走、两基地 BFS 连通、营地盒不可走区域内无 waypoint
- [x] Commit `feat(sim): symmetric map generation`

### Task 5: 寻路
**Files:** `src/sim/pathfinding.ts` · Test: `tests/pathfinding.test.ts`
- [x] A*(二叉堆 open list,8 向,对角不穿角)+ 失败时返回最近可达点路径;视线拉直(Bresenham walkability)
- [x] 测试:空地直线 ≤3 点;绕树;基地→基地有路;同输入两次调用结果全等(确定性)
- [x] Commit `feat(sim): A* pathfinding + smoothing`

### Task 6: World 骨架 + 渲染 + 操控(M1 验收)
**Files:** `src/sim/world.ts` `src/sim/unit.ts`(移动版) `src/render/renderer.ts` `src/render/camera.ts` `src/engine/loop.ts` `src/engine/input.ts` `src/main.ts` · Test: `tests/world.test.ts`
- [x] World.step:固定 dt;Unit 执行 move order(沿路径,转身速率);碰撞先忽略
- [x] 渲染:地形离屏烘焙(草地/河道/高地色阶/树/坡道),实体圆形+朝向线;镜头:边缘平移+中键拖拽+空格回中
- [x] 输入→Order:右键移动;`window.__game = { world, speed 控制 }`
- [x] 测试:step 100 次后单位接近目标;dev 服务器 Playwright 截图归档 `docs/screenshots/m1.png`
- [x] Commit `feat: M1 walkable hero on generated map` ← **M1 gate**

## M2 战争

### Task 7: 战斗管线
**Files:** `src/sim/combat.ts` `src/sim/unit.ts`(完整版) `src/sim/projectile.ts` · Test: `tests/combat.test.ts`
- [x] CalcStats 重算(base+modifier 聚合);攻击获取(acquireRange 内最近敌人)、攻击循环(前摇 castPoint→伤害/弹道→后摇,BAT/IAS)、弹道追踪命中
- [x] 伤害管线:类型矩阵→护甲→魔抗(spell)→pure 直通→事件(`unit_damaged/unit_died`);击杀归属=最后一击来源
- [x] 测试:armor=5 时物理减伤 23.1%;spell 受 25% 魔抗;fortified 免 spell;弹道飞行时间=dist/speed
- [x] Commit `feat(sim): combat pipeline + projectiles`

### Task 8: 建筑
**Files:** `src/sim/buildings.ts` · Test: `tests/buildings.test.ts`
- [x] 塔(fortified、siege 弹道、视野 1900、仇恨:优先小兵,本方英雄 500 内被敌英雄攻击→转火该英雄)、兵营(近/远战)、主建筑(需破基地高台 2 塔才可攻——经典"保护",非无敌后门)、泉水(光环回复 + 超高伤真视攻击)
- [x] 测试:仇恨转移场景;泉水恢复速率
- [x] Commit `feat(sim): towers/racks/ancient/fountain`

### Task 9: 兵线
**Files:** `src/sim/creeps.ts` `src/data/creeps.ts` · Test: `tests/creeps.test.ts`
- [x] 90s 首波,30s/波,3 近 1 远,第 7n 波 +投石车;7.5min 周期成长(hp/dmg/赏金);兵营破→该路超级兵,六营全破→精英兵
- [x] 兵 AI:沿 waypoint attackmove;仇恨表(就近,英雄 A 友方英雄可引);leash 600 回线
- [x] 测试:波次构成时间表;成长后数值;超级兵切换
- [x] Commit `feat(sim): creep waves + lane AI`

### Task 10: 经济与经验
**Files:** `src/sim/economy.ts` · Test: `tests/economy.test.ts`
- [x] 正补金=赏金±随机抖动;反补(对己方兵 hp<50% 可 A):敌得 0 金 + 圈内 50% XP;XP 共享半径 1300 平分;工资;英雄击杀赏金+助攻圈;死亡掉金
- [x] 测试:补刀金落账;反补 XP 折半;等级按 XP_TABLE 跳变;技能点发放
- [x] Commit `feat(sim): economy/xp/levels`

### Task 11: 英雄实体 + 玩家 HUD v0
**Files:** `src/sim/hero.ts` `src/data/heroes/index.ts`(先 4 个英雄的裸属性) `src/ui/hud.ts` · Test: `tests/hero.test.ts`
- [x] 属性成长、主属性加攻、升级、技能点(黄点占位)、死亡/复活计时
- [x] HUD:顶栏(时间/金)、底部(头像色块/等级/血蓝/属性)、选中描边
- [x] Commit `feat: hero entity + hud v0`

### Task 12: M2 验收门
- [x] `?mode=spectate&speed=8`:兵线中路交战、塔开火、金币增长断言(Playwright 通过 `__game` 读状态);截图 `docs/screenshots/m2.png`
- [x] Commit `feat: M2 war of the lanes` ← **M2 gate**

## M3 英雄

### Task 13: Modifier 系统
**Files:** `src/sim/modifiers.ts` · Test: `tests/modifiers.test.ts`
- [x] StatMods 字段:`bonusHp bonusMp bonusDamage bonusDamagePct bonusArmor bonusAttackSpeed bonusMoveSpeed bonusMoveSpeedPct bonusStr/Agi/Int bonusHpRegen bonusMpRegen bonusMagicResist evasion critChance critMultiplier lifesteal auraBurn`(加法聚合;moveSpeedPct/damagePct 乘法段)
- [x] 状态聚合(任一 stunned 即停);同 key 同源刷新、同 key 异源按 def.stackable;光环:持有者每 0.5s 给半径内目标续 `grant`(duration 0.6)
- [x] 测试:叠加/过期/光环离开半径消退/眩晕禁动作
- [x] Commit `feat(sim): modifier system`

### Task 14: 技能系统
**Files:** `src/sim/abilities.ts` · Test: `tests/abilities.test.ts`
- [x] 施法状态机:转身→前摇(可被眩晕打断,扣资源在前摇末)→效果→后摇;channel 持续引导被打断逻辑;CD/蓝校验;passive 自动挂 modifier;orb 类挂攻击钩子
- [x] AoE 工具:`damageArea/applyModifierArea`;点目标超射程自动走近
- [x] 测试:前摇被晕打断不扣蓝不进 CD;channel 被打断停止 tick;升级改数值
- [x] Commit `feat(sim): ability framework`

### Task 15: 首批 4 英雄
**Files:** `src/data/heroes/rein.ts` `liya.ts` `zola.ts` `aili.ts` + `index.ts` · Test: `tests/heroes1.test.ts`
- [x] 雷恩(锤晕/战吼/顺劈/泰坦),莉雅(新星/禁制/秘法泉/极寒引导),佐拉(弹射/天雷/静电场/全图大),艾莉(霜箭 orb/风行/精准光环/强击被动);每技能 aiScore
- [x] 测试:每技能至少 1 断言(伤害值/修饰键/状态)
- [x] Commit `feat(data): first 4 heroes`

### Task 16: 战争迷雾
**Files:** `src/sim/vision.ts` `src/render/fog.ts` · Test: `tests/vision.test.ts`
- [x] 每队 Uint8Array 视野格(0.25s 重算):圆形+高度规则(看不见更高层)+夜间半径;真视标志;敌方单位仅在可见格渲染;迷雾层 47×47 低分辨率柔化
- [x] 测试:高台不可见;夜间半径缩;真视看隐身
- [x] Commit `feat: fog of war`

### Task 17: Bot AI v1
**Files:** `src/sim/ai/strategist.ts` `src/sim/ai/tactician.ts` `src/sim/ai/micro.ts` `src/sim/ai/index.ts` · Test: `tests/ai.test.ts`(headless 仿真)
- [x] 战略 1s:分路 2-1-2、意图(farm/push/defend/retreat/heal);战术 0.3s:目标选择+按 tags/aiScore 放技能+血量 25% 撤退;微操:补刀窗口(兵血≤本方一击)、塔仇恨规避
- [x] headless 测试:speed∞ 跑 10 分钟模拟:无异常、双方均有补刀、出现击杀或塔伤
- [x] Commit `feat(sim): bot ai v1`

### Task 18: M3 验收门
- [x] 死亡/复活/泉水买活(`-b` 占位按钮);击杀播报事件;观战 10min 截图 `docs/screenshots/m3.png`
- [x] Commit `feat: M3 heroes fight` ← **M3 gate**

## M4 完整

### Task 19: 物品框架
**Files:** `src/sim/items.ts` `src/data/items.ts` · Test: `tests/items.test.ts`
- [x] 6 格背包+储藏处+商店区判定;金币购买/50% 卖出;消耗品充能;TP 卷轴(3s 引导,目的地为己方建筑);药膏(受英雄攻击打断 buff);属性件=modifier
- [x] 测试:背包满→储藏;TP 落点;药膏打断
- [x] Commit `feat(sim): items + inventory + tp`

### Task 20: 合成与商店 UI
**Files:** `src/sim/recipes.ts` `src/ui/shop.ts` · Test: `tests/recipes.test.ts`
- [x] 自动合成(含跨储藏不合、卷轴件);商店 DOM:分类页签/合成树视图/买入;秘密商店物品仅在其范围购买
- [x] 测试:全配方可达且总价=Σ部件;持有部件买卷轴即合成
- [x] Commit `feat: recipes + shop ui`

### Task 21: 高级装备效果
**Files:** `src/data/items.ts` 扩展 · Test: `tests/items2.test.ts`
- [x] 魔杖充能(周围敌方施法+1)、闪烁短刃(受英雄伤 3s 锁)、永恒壁垒(主动魔免 6s)、辉光灼烧光环、吸血/暴击/攻速光环/寒冰守卫主动
- [x] Commit `feat(data): advanced items`

### Task 22: 符文 + 魔法药瓶
**Files:** `src/sim/runes.ts` · Test: `tests/runes.test.ts`
- [x] 0:00 起每 2min 随机一点刷(另一点清除);四种效果(加速 522 速 25s/双倍 45s/恢复 100hp50mp 不受伤/隐身 36s);瓶装符 2min 自爆;瓶 3 充能泉水满
- [x] Commit `feat(sim): runes + bottle`

### Task 23: 野区
**Files:** `src/sim/neutrals.ts` `src/data/neutrals.ts` · Test: `tests/neutrals.test.ts`
- [x] 每方:小/中/大/远古 4+1 营;整分钟若营地盒无单位且无敌方视野→刷新;leash 800 脱战回营满血;三档怪(石肤陷阱手/嚎叫狼/巨岩傀儡式原创名)
- [x] Commit `feat(sim): neutral camps`

### Task 24: 深渊领主(Boss)
**Files:** `src/sim/pitlord.ts` · Test: `tests/pitlord.test.ts`
- [x] 河道坑;基础高甲高伤,每 4min 成长;掉**不灭之盾**(占背包格,死亡 5s 后原地满状态复活并消耗);死后 8–11min 随机复活;全图击杀播报
- [x] Commit `feat(sim): pit boss + aegis`

### Task 25: 昼夜 + 高低地实战
**Files:** `src/sim/daynight.ts` + combat/vision 接线 · Test: `tests/terrain-combat.test.ts`
- [x] 5min 交替事件;低打高 25% miss(攻击者高度<目标);上坡视野遮断已有——补集成测试;AI v1.5:防守意图触发 TP
- [x] Commit `feat: day/night + uphill miss`

### Task 26: 英雄全员 + M4 验收门
**Files:** `src/data/heroes/{gorm,grosh,kai,chen,olan,morphis}.ts` · Test: `tests/heroes2.test.ts`
- [x] 余下 6 英雄完整技能与 aiScore;headless 全速整局:断言**比赛能分出胜负**(主建筑摧毁,<60min 模拟时);胜负结算画面
- [x] 截图 `docs/screenshots/m4.png`;Commit `feat: M4 full game loop` ← **M4 gate**

## M5 打磨

### Task 27: 小地图 + 记分板 + 播报
**Files:** `src/render/minimap.ts` `src/ui/scoreboard.ts` `src/ui/killfeed.ts`
- [x] 小地图:迷雾/建筑方块/英雄头字/点击移动镜头/Alt 信号;Tab 记分板 K/D/A/LH/DN/NW/装备;连杀播报文案(原创)
- [x] Commit `feat(ui): minimap/scoreboard/killfeed`

### Task 28: 主菜单 + 选人
**Files:** `src/ui/menu.ts` `src/ui/pick.ts`
- [x] 标题→模式(对战/观战)→英雄选择(10 卡片+技能 tooltip+随机)→加载入局;P 暂停;ESC 菜单(重开/退出)
- [x] Commit `feat(ui): menu + hero pick`

### Task 29: 音频
**Files:** `src/audio/synth.ts` `src/audio/director.ts`
- [x] WebAudio 合成:普攻命中(噪声短促)/施法(正弦扫频)/升级/击杀重音/塔倒/背景环境垫;主音量滑条;事件驱动
- [x] Commit `feat(audio): procedural sfx`

### Task 30: 平衡批跑
**Files:** `scripts/batchsim.ts` `tests/balance-sim.test.ts`
- [x] node 跑 N=6 局 headless(不同种子):收集时长/总击杀/双方胜率/经济曲线;断言时长 15–60min、无零击杀局;失衡则调 balance.ts 并记录
- [x] Commit `chore: balance batch sims + tuning`

### Task 31: README + 发布
**Files:** `README.md` `docs/screenshots/*`
- [x] 操作说明/特性清单/架构图/开发命令/IP 边界声明/截图;`npm run build` 产物验证;tag `v0.1.0`
- [x] Commit `docs: README + v0.1.0` ← **M5 gate / 交付**

---

## Self-Review 记录
- Spec 覆盖:设计文档 §0-§10 每条均映射到 Task(高低地→T4/T16/T25;买活→T18;秘密商店→T19/T20;黄点→T11 占位+T15 实装)。✔
- 接口一致性:速查表为唯一命名真相源;Task 文内引用与其一致。✔
- 无占位符:各 Task 均含具体行为与测试断言;数值细节统一指向 balance.ts(单一真相源,非回避)。✔
