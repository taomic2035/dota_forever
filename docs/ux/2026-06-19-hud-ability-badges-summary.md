# HUD Ability State Badges

日期: 2026-06-19
范围: HUD 技能格状态标记。Presentation-only, 不改变技能释放、被动、法球、神杖、冷却、法力或战斗规则。

## 问题

技能格此前只在右上角显示一个很小的 `P` 标记被动技能,神杖用单独星标。随着英雄池和被动/法球技能变多,玩家很难一眼区分:

- 这个技能是纯被动,不能按;
- 这个技能是普攻附加/法球类;
- 这个技能是大招;
- 当前神杖升级是否正在影响该技能。

这些都是 Dota-like HUD 里常见的“格子内部状态语法”,应该可测、可扩展,而不是继续散在 HTML 字符串里。

## 方案

- 新增共享纯模型 `buildAbilitySlotBadges(...)`。
- 当前先基于已有 `AbilityDef` 数据落地 4 类徽标:
  - `P`: passive;
  - `ORB`: attack modifier / orb;
  - `ULT`: ultimate;
  - `SCP`: scepter upgrade active.
- 每个技能格最多显示 3 个徽标,避免 66px 格子溢出。
- 未学习技能隐藏 passive/orb 徽标,但保留 ultimate 身份,方便玩家规划加点。

## 改动

- `src/ui/abilitySlotBadgeModel.ts`
  - 新增 `buildAbilitySlotBadges(def, { learned, scepterOn })`。
  - 输出稳定 badge keys/titles/tones,供 HUD 和后续 smoke check 使用。
- `src/ui/hud.ts`
  - 技能格右上角改用 `abilityBadges(...)`。
  - 输出 DOM marker: `data-ability-badge="passive|orb|ultimate|scepter"`。
  - 保持技能格尺寸不变。
- `tests/abilitySlotBadgeModel.test.ts`
  - 覆盖 passive、orb passive、ultimate+scepter 紧凑显示、未学习技能隐藏 passive/orb。

## Verification

Red-to-green:

```text
npm test -- tests/abilitySlotBadgeModel.test.ts
Before fix: failed because src/ui/abilitySlotBadgeModel was missing
After fix: 1 file passed, 4 tests passed
```

Focused regression:

```text
npm test -- tests/abilitySlotBadgeModel.test.ts tests/cooldownOverlayModel.test.ts tests/abilityTooltipModel.test.ts tests/controlSettings.test.ts
4 files passed
27 tests passed
```

Build:

```text
npm run build
passed
warning: existing Vite chunk-size warning remains
```

## Opus Integration Notes

Useful hooks:

- `buildAbilitySlotBadges(...)`
- `AbilitySlotBadge.tone`
- HUD DOM marker: `data-ability-badge`

Scope note: this pass does not add real toggle/autocast state. True toggle/autocast still needs an `AbilityDef`/sim contract so HUD can show on/off state honestly.
