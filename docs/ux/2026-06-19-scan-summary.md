# 扫描(Scan,敌情雷达)

日期: 2026-06-19
范围: 补 DotA 战略信息机制——扫描(揭示选定区域,查敌/反 gank)。纯信息、零平衡风险。

## 方案(V1)

- **V 键**(可改键 action `scan`)→ 在光标世界点揭示一片区域 SCAN_DURATION(6s)。
- 实现:生成一个短时隐身视野源(复用守卫视野机制,visionDay/Night=SCAN_RADIUS 900),6s 后自动消失。
- **队伍冷却** 90s(`world.scanReadyAt[team]`,仿 glyph),顶栏 📡 指示就绪/倒计时。
- **纯信息**:不加 power/金/经验 → 零平衡影响(bot 不施放 → 不影响 bot 对局/batchsim)。

## 改动

- `src/sim/world.ts`:`scanReadyAt[team]`。
- `src/sim/scan.ts`(新):`castScan`(冷却门控 + 生成隐身视野源)/`scanReady` + 常量。
- `src/engine/controlSettings.ts`:可改键 action `scan`(默认 `v`)。
- `src/engine/input.ts`:`case 'v'` → `onScan(光标世界点)`。
- `src/main.ts`:`onScan` 接线(castScan + ping 脉冲 + 冷却拒绝提示)。
- `src/ui/hud.ts`:顶栏 📡 扫描冷却指示。
- 测试:`tests/scan.test.ts`(4:施放生成视野/冷却门控/到期重就绪/自队可见敌方不可见)。

## 验证

- typecheck 通过;完整套件 179 文件 / 1523 测试 0 失败。
- 真实运行:t>0 按 V → 生成 1 个扫描视野单位 + 冷却设置;顶栏 📡 显示;0 错误。(开局前 t<0 因 scanReadyAt 初始 0 而"未就绪",符合"扫描从 0:00 起可用"。)

## 后续(留档)

- 小地图选点扫描(可揭示任意远处/雾区,比光标扫描更强;需 pending-target 状态)。
- 扫描区域的视觉/小地图圈指示。
