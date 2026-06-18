# HUD 缩放(可访问性)

日期: 2026-06-18
范围: 底部英雄面板可缩放(对应 UX 路线图 P2.4 可访问性:HUD scale)。

## 问题

HUD 用固定 px 布局,在不同分辨率/视力下大小不可调。DotA 客户端有 HUD 缩放滑块,这是常见可访问性需求。

## 方案

底部英雄面板(最密集、最需阅读的区域)支持 小(0.9)/标准(1.0)/大(1.1) 缩放,暂停菜单切换,localStorage 持久化。沿用 `cameraPanSpeed`/`autoAttack` 的设置模式(parse/cycle/label/value)。

应用方式:`bottom.style.transform = translateX(-50%) scale(s)` + `transform-origin: bottom center`——锚定底部中央缩放,**点击命中区随 CSS transform 一同缩放**(无需改 hit-test)。

## 改动

- `src/engine/controlSettings.ts`:`HUD_SCALES` + `hudScale` 字段(默认 normal)+ `parseHudScale`/`cycleHudScale`/`hudScaleLabel`/`hudScaleValue`(0.9/1.0/1.1)+ normalize 接入。
- `src/ui/hud.ts`:`update` 每帧按 `controlSettings.hudScale` 应用底部面板 transform。
- `src/ui/menu.ts`:数字行那行扩为 3 列,新增「HUD 小/标准/大」切换按钮。
- 覆盖测试:`tests/controlSettings.test.ts` +1(cycle/parse/label/value/默认/normalize)。

## 验证

- typecheck 通过;完整套件 0 失败。
- 真实运行(localStorage 预设 + 重载):底部面板 transform 分别为 `scale(0.9)/scale(1)/scale(1.1)`;小缩放下 learn 点击仍生效(命中区随 transform 缩放);large 时面板右沿 1306 < 小地图区(~1340+),不遮挡。

## 后续(留档)

- 顶栏/小地图/英雄条独立缩放或整体缩放档位。
- 字体大小、色盲队色、小地图简化色(P2.4 其余可访问性项)。
