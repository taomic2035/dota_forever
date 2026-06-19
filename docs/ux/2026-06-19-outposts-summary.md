# 前哨 Outposts(占领→团队周期经验)

日期: 2026-06-19
范围: 补 DotA 地图目标机制——前哨。可占领据点,给占领方周期团队经验。

## 方案

- 地图上 **2 个对称中立前哨**,置于双方**秘密商店点**(`map.shops` 中 secret 两点——对称、已知可走,且 DotA 中前哨正处侧路旧商店区,主题贴切)。无需改 `map.ts`。
- **占领**:英雄持续站在 `OUTPOST_CAPTURE_RADIUS`(350)内 `OUTPOST_CAPTURE_TIME`(6s),且无敌方在场争夺 → 翻转归属。双方同在 = 僵持(进度不涨)。无人时维持现归属。敌方可再占。
- **收益**:占领方此后每 `OUTPOST_XP_INTERVAL`(7min)获得一次**团队经验**(`outpostXp(t)=120+floor(t/60)*6`),并在前哨周围获得**视野**(`OUTPOST_VISION=700`)——团队经验 + 视野,即 DotA 前哨的两大定义性效果。
- **对称设计 → 平衡中性**:两前哨对称,双方(含 bot 推线途经)对等可占 → 阵营平衡不偏移(batchsim 门控)。

## 实现(数据态,不撞 GPT 渲染轨)

- 实现为**数据态**(`world.outposts: Outpost[]`),**非单位**——不进 3D 渲染(可见结构属 GPT 视觉轨,留待其补;加 `UnitKind` 会 typecheck 撞 `renderer.ts`/`renderer3d.ts`)。当前**仅小地图标记**(我的轨道)。
- `src/sim/outposts.ts`(新):`Outpost` 类型、常量、`outpostXp`/`outpostSpots`/`makeOutposts`、`stepOutpostCapture`(占领状态机)、`stepOutpostXp`(周期经验)、`installOutposts`(系统注册)。
- `src/sim/world.ts`:`outposts` 状态(内联类型导入,避免环)+ `outpost_captured` 事件。
- `src/sim/setup.ts`:`creeps` 模式下 `installOutposts(w)`(与野怪同级=全对局)。
- `src/render/minimap.ts`:◆ 队色标记(Dawn 绿 / Night 红 / Neutral 灰)+ 占领中进度环。
- `src/sim/vision.ts`:占领前哨为占领方揭示视野圈(`OUTPOST_VISION`,含高度遮断,镜像单位视野;recomputeVision 末尾追加,加性)。
- 测试:`tests/outposts.test.ts`(7:初始化/经验递增/单方占领/僵持/再占/周期经验/**占领获视野**)。

## 确定性

- 占领逻辑纯确定性(无 `rng`,只读单位位置/`dt`/`time`)。`outposts` 不在确定性快照内;占领带来的英雄经验变化对同种子可复现 → 确定性测试不受影响(完整套件 1533 含确定性全过)。

## 验证

- typecheck 通过;完整套件 **181 文件 / 1533 测试 0 失败**(含确定性 + fullgame M4 决胜门 + ai——前哨未破坏决胜节奏)。
- 真实输入浏览器验证(playwright + window.__game):英雄站位前哨 8.6s → 归属翻转(中立→晨曦)、顶栏 ◆1/0、Renderer3D 渲染、0 错误。bot 留线上不占前哨(=玩家专属,亦 batchsim 平衡中性之因)。
- **batchsim 平衡验证**:**8/8 种子全部 decisive + sane**(断言含阵营胜率 ≤80%、时长 15-75min)→ 前哨团队经验对称、未破坏平衡。

## 后续(留档,需 GPT 或你)

- **3D 可见结构**:前哨在 3D 世界的实体造型(旗帜/方尖碑)属 GPT 视觉轨(已写交接文档)。
- **前哨位置**:现置秘密商店区(off-lane)→ bot 不途经故不占;若要 bot 也争夺需移到 T2 路边(地图设计决策,待用户)。
- 可选:占领传送点(DotA 后续版本)、被占时的全局提示音/公告。
