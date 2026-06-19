# Break 状态芯片总结

日期: 2026-06-19
范围: UX / HUD / status readability

## What

- `broken` 状态现在在 buff/debuff 状态条里显示为独立 `破` 芯片。
- 颜色使用 `#ff5fb7`,与眩晕、沉默、普通 debuff 区分。
- HUD 与选中信息卡共用 `statusChips(...)`,因此两处会同步获得 Break 可读性。
- 不改变 Break 的 sim 语义;被动禁用仍由 `modifierStates` / `foldModifiers` 原有逻辑负责。

## Files

- `src/render/statusChips.ts`
  - `states.broken` 映射为 `破`。
- `tests/statusChips.test.ts`
  - 覆盖 Break 不再退化为普通 `▼` debuff。

## Opus 合入注意

- 这是纯展示层补齐,不改变静默之刃、被动禁用、modifier 生命周期或战斗结算。
- 如果后续增加更多关键状态,继续优先放在 `statusChips(...)` 的具名映射里,避免 HUD 与 inspect panel 漂移。

## Verification

- `npm test -- tests/statusChips.test.ts tests/items3.test.ts`
