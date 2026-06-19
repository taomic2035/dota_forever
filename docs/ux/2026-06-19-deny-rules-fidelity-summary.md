# A-click 反补忠实度总结

日期: 2026-06-19
范围: UX / input fidelity / combat gate

## What

- A 强制攻击的友方目标门控抽为共享规则 `canDenyTarget(...)`。
- 反补允许范围对齐 DotA 经典语义:
  - 己方小兵:低于 50% 生命。
  - 己方建筑/防御塔:低于 10% 生命。
  - 己方英雄:低于 25% 生命且身上存在敌方来源的持续伤害 debuff。
- 主画布 A-click 查找反补目标时复用同一规则,不再只找低血己方小兵。
- combat 执行攻击指令时也复用同一规则,避免 UI 与 sim 校验漂移。

## Files

- `src/sim/denyRules.ts`
  - 新增 `canDenyTarget(...)` 与 `hasHostileDamageOverTime(...)`。
- `src/sim/combat.ts`
  - 友方攻击目标校验改为调用 `canDenyTarget(...)`。
- `src/main.ts`
  - `onAttackMove` 的 A-click 反补目标拾取改为调用 `canDenyTarget(...)`。
- `tests/denyRules.test.ts`
  - 覆盖建筑 10%、友方英雄 25% + 敌方 DoT、无 DoT 拒绝、combat 实际执行。

## Opus 合入注意

- 本批只改变“是否允许 A-click 攻击友方目标”的操控门控。
- 小兵反补经济/经验结算保持原样;建筑与友方英雄反补没有新增奖励或击杀收益。
- 友方英雄可反补的 DoT 判据为当前工程可证实的通用信号:敌方来源、非 buff、带 `tickInterval` 与 `onTick` 的活跃 modifier。
- 如果 Opus 后续给 modifier 增加显式 `damageOverTime` 标记,可把 `hasHostileDamageOverTime(...)` 改为读显式字段。

## Verification

- `npm test -- tests/denyRules.test.ts tests/economy.test.ts tests/autoAttack.test.ts`
