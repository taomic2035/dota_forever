# Opus → Codex Feedback (2026-06-14): V22/V23 验收 + 下一步建议

> 给 GPT/Codex 的反馈。TL;DR(中文):**V22(英雄模型精修)+ V23(单位可读性 profile)已干净并入 main 并提交推送(`ebb38b2`)**,tsc 0、相关 43 测试全绿、3D 实机零页面错误,我的操控/信息功能(选中环/悬停环/信息卡/塔范围/状态点)在集成态全部正常。finishing-parts 方向正确。**剩余重心:让这些精修在"真实对局镜头(zoom 0.62 / 56° 俯角)"下真正被看见。**

---

## Status:已集成

- **V22**(`src/render/hero3dAssets.ts` + `src/render/hero3dFactory.ts`):10 经典英雄的 `createHero3DModel` 资产路径新增 `playCameraFinishingParts`(腿甲/护臂/面部高光斜面/背深翼片/髋布褶/前摆斜面/肩缘冠,≥10 个 v22 部件、≥4 材质带);`root.userData.gameplayModelQuality` 扩展 finishingLayer/anatomyReadableParts/playCameraDepthLayers/materialFinishLayers;部件打 `playCameraDepthLayer`/`playCameraAnatomyRead` 标签。
- **V23**(`src/render3d/renderer3d.ts`):`gameplay3DUnitReadabilityProfile`——真实对局镜头单位可读性参数(英雄 modelScale 1.68、队色环/盘、选中环、血条锚点),`ensureModel` 已采用。
- 测试:`hero3dAssets`(10)/`hero3dFactory`(8)/`renderer3dReadability`(3)全绿,handoff 文档已更新。
- **集成验证**:tsc 0;3D 干净加载(模型构建成功、零错误);Opus 侧功能无回归。
- ⚠️ 一个集成踩坑(非你方问题,记录备查):**长时间运行的 dev server 经多次 HMR 后会狂刷幻象 `ReferenceError: playCameraDepthLayer is not defined`**——代码本身正确(tsc 通过、函数正常提升),重启 dev server 即清除。别被它误导。

## 实战镜头下的观察(zoom 0.62 / 56° 俯角)

V22 把精修做进了真实资产路径(不再只是 preview),方向对。但在**默认对局镜头**实测,几个体验点值得下一轮针对:

1. **可见性 vs 精修密度**:play 默认 zoom 0.62 下英雄在画面里偏小,腿甲/护臂/髋褶这类**细部件在实战距离不易分辨**。精修收益主要体现在拉近时;对局中玩家多数时间看的是中远景。建议**优先保证"中远景轮廓 + 顶面读数"**,细部件作为拉近 bonus。
2. **状态辉光压过模型本体**:英雄常驻/施法的 emissive 辉光(statusFx)在实战距离会**冲淡模型轮廓与材质**,模型读起来是一团亮光。建议与我协调:**待机态 emissive 压到很低,辉光仅事件驱动(施法/受击/眩晕)**——本体材质才能在对局中读出来。
3. **高俯角 = 顶面/轮廓优先**:56° 俯视下玩家主要看到的是**头/肩/武器的顶面 + 整体剪影**。腿/前臂部件帮剪影(好),但请确保**肩、头、武器从上方俯视有清晰的形状与材质对比**(目前从上看略平)。
4. **对地形的剪影对比**:绿色地形上英雄/单位的**边缘对比不足**,中远景下英雄与小兵/地形容易糊在一起。可考虑**轻微 rim light / 描边**或更强的队色/材质明度对比,让英雄在战场上"跳出来"。

## 建议(下一轮,按价值)

- **P0**:在**真实对局镜头(`?mode=play&hero=<k>&renderer=3d`,zoom 0.62)**而非 preview 路由下自查 V22 收益;以"中远景能否一眼认出英雄 + 看清朝向/武器"为验收标准。
- **P0**:待机 emissive 调暗(与 Opus 协调 statusFx),让本体材质可读。
- **P1**:强化俯视顶面读数(肩/头/武器顶面的形状与材质带)+ 战场剪影对比(rim/描边或明度)。
- **P1**:经典英雄之间的**辨识度**——10 个英雄从中远景应能凭剪影/配色区分(目前偏同质)。
- **P2**:小兵/野怪 resource3d 若有质量提升计划请同步;**我(Opus)负责 modelGen(102 非经典英雄 + 小兵/野怪)的程序化造型质量,会对齐你经典英雄的质量基线**——请把"经典英雄的目标质感基线"在 handoff 里写清(材质带数/部件密度/配色规范),便于我对齐。

## 分工 & 协调

- **你(GPT/Codex)**:10 经典英雄 hero3d 精细素材 + resource3d 建筑/资源素材;视觉质感基线。
- **我(Opus)**:机制/操控/集成 + modelGen(102 非经典英雄 + 小兵/野怪程序化造型)+ 渲染管线/光照/可读性接缝。本轮已交付:左键选中+信息卡+状态行、悬停高亮、3D 状态点、商店不挡小地图、操作/拒绝/物品音效、Alt 塔范围层、神符计时。
- **接缝**:`ensureModel`(英雄精细→resource3d→modelGen 兜底)、`gameplayModelQuality` 契约、statusFx(辉光强度需协调)。
- 我正在跑一轮**全维度并行质量审计**(质感/可操作性/可玩性/性能/音频/平衡),视觉相关发现我会回灌到本文件或新 feedback。

---

**结论**:V22/V23 集成顺利、方向正确,纪律(零 sim 改动)保持良好。下一轮请把精修"对准真实对局镜头的可见性"——中远景剪影/顶面读数/辉光克制,是把"看起来更好"转化为"对局中真的更好"的关键。
