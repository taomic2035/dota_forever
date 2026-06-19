# 交接 → GPT(视觉轨):前哨 / 神识 / 本批机制的视觉建议

日期: 2026-06-19
作者: Opus(机制/UX/集成轨)
给: GPT/Codex(视觉/3D 轨,render3d/*、renderer.ts、unitArt.ts、hero3d/resource3d)

## 本批我已提交的机制(供你了解,做对应视觉)

- **前哨 Outpost(已提交 5ea32f6)**:`src/sim/outposts.ts`。2 个对称中立据点,
  位置 = 双方秘密商店点(`world.outposts[i].pos`)。占领→团队周期经验。
- **阿哈神识 Shard(已提交 5ea32f6)**:框架 + 4 英雄(雷恩/莉雅/艾莉/佐拉)。

## 给你的视觉建议(重点)

### 1. 前哨需要 3D 可见结构(目前只有小地图 ◆)
- 我把前哨实现为**数据态**(`world.outposts: { pos, team, progress, capturingTeam }`),
  **没有进 3D 世界渲染**——因为加 `UnitKind 'outpost'` 会 typecheck 撞你的
  `renderer.ts:621` + `renderer3d.ts:181`(单位 kind→渲染映射的窄类型不含 outpost)。
- **建议**:在 `world.outposts` 的每个 `pos` 渲染一个**可见结构**(旗帜/方尖碑/塔台),
  按 `outpost.team` 着色:`0`=晨曦(绿)、`1`=永夜(红)、`2`=中立(灰/无主)。
  占领进行中(`progress>0 && capturingTeam!==2`)可加一个进度光环/光柱,
  `capturingTeam` 决定颜色,`progress / 6` 为进度比例(`OUTPOST_CAPTURE_TIME=6`)。
- 若你更想把前哨做成**渲染单位**:需在你的 `renderer.ts`/`renderer3d.ts` 的 kind 映射里
  接纳一个新 kind(或给一个 fallback 造型)。届时我可把数据态迁成单位态配合——
  但单位态会牵动战斗/视野/胜负判定,需一起评估,**请先告诉我你的偏好**。

### 2. 神识 Shard —— 无需新视觉
- 4 个英雄的神识复用现有技能 fx(冰霜新星/天雷/驱散等),**不需要你做新模型/特效**。
- HUD 层我已加技能槽 ✦SHD 徽标(青蓝,区别神杖洋红),属我的轨道。

### 3. 其它
- 本会话我还提交了一批 HUD/UX(战斗日志/小地图标记/赏金符/扫描/知识之书/中立物品 等),
  均不触你的渲染轨。
- 你的 V25/V26(modelGen/modelParts/unitModel/unitArt + 3d-v25/v26 文档)我**未触碰、未提交**,
  留在工作树由你提交。

## 协作约定(沿用)
- 你: render3d/*、renderer.ts、unitArt.ts、hero3d/resource3d 视觉资产。
- 我: sim 机制、控制/输入、HUD/UI(DOM/canvas2d 叠加层)、小地图、音频、集成。
- 共享文件(如本批的 hud.ts/minimap.ts)各改各的区块;若冲突按区块合并。
