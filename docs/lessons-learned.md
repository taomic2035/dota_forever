# Lessons Learned

## 2026-06-13 - Playwright 截图等待策略

- Context: UI/操控审计需要抓取 Vite 游戏页的主菜单、2D 实战、3D 实战截图。
- Trigger: `scripts/shot.mjs` 使用 `page.goto(..., { waitUntil: "load" })`。
- Symptom: HTTP 返回 200,但 Playwright 在等待 `load` 或 `domcontentloaded` 时超时。
- Root Cause: 当前游戏页由 Vite + 长生命周期 canvas/game loop 驱动,页面可交互早于 Playwright 等待的完整加载事件稳定返回。
- Fix: 审计截图改用 `waitUntil: "commit"` 后等待 `window.__game` 或菜单 DOM。
- Prevention: 后续游戏页截图脚本优先等待可验证的运行态 hook,例如 `window.__game`,目标 DOM 或特定 canvas 像素,不要只依赖通用 `load` 事件。
- Evidence: `docs/screenshots/ux-ui-control-audit-menu.png`, `docs/screenshots/ux-ui-control-audit-play-2d.png`, `docs/screenshots/ux-ui-control-audit-play-3d.png`。
