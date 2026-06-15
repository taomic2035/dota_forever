# Dota Forever Documentation

This folder is the documentation entry point: mechanics fidelity, balance, architecture, plus UX validation, screenshots, and implementation plans.

## 版本发布(Releases)

- [**2.1.0 — 发布与复盘**](2026-06-15-v2.1.0-release.md)(2026-06-15):操控与可玩性大版本。逐子系统交付、量化指标、工程洞察、Opus↔Codex 协作复盘与教训。**了解「当前做到哪了」先读此文。**
- 版本摘要见 [`../CHANGELOG.md`](../CHANGELOG.md)(2.1.0 / 2.0.0 真 3D / 1.0.0 完整玩法)。

## 核心机制 / 数值 / 架构(Mechanics · Balance · Architecture)

权威参考——理解游戏机制与保真度先读这些:

- [核心机制对照 DotA 1 的缺口审计与进度](2026-06-12-core-mechanics-gaps.md):M1–M12 + 三轮对抗性审计的全部发现与处置(已修 / 留档 / 有意简化)。**「机制还差什么」先读此文。**
- [数值校准记录](2026-06-12-balance-calibration.md):经验/赏金/买活等数值对齐经典的依据。
- [架构与审计](2026-06-12-architecture-and-audit.md):系统分层与工程审计。
- [Source map](source-map.md):源码目录职责与改动入口。

## UX / 截图 / 计划(开发过程归档)

- [UX workstream index](ux/README.md): design docs and completion summaries grouped by gameplay UX topic.
- [Screenshot evidence index](screenshots/README.md): validation captures grouped by what they prove.
- [Implementation plans](superpowers/plans/): task-by-task execution notes for each major slice.
- [Original project spec](superpowers/specs/2026-06-10-dota1-remake-design.md): broad product and gameplay baseline.

## Current State (2.1.0)

操控与可玩性已达商用水平的主线目标——选择/控制组/指令卡/改键、施法条、公屏播报、危险反馈、商店去向预览、信使/防御符/后门等机制深化,2D/3D 渲染器经共享纯函数对等。完整清单与复盘见 [2.1.0 发布文档](2026-06-15-v2.1.0-release.md)。下一阶段(2.2)规划见该文「已知后续」。

The visual direction is Dota1-inspired, but intentionally uses original programmatic art and a fresher interface style.

## Validation Pattern

Each UX slice should have:

- A design doc in `docs/ux/*-design.md`.
- A summary doc in `docs/ux/*-summary.md`.
- A screenshot in `docs/screenshots/` when visible behavior changed.
- A plan in `docs/superpowers/plans/`.
- Fresh `npm test` and `npm run build` evidence before commit.
