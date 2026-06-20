export type FountainStatusTone = 'ready' | 'busy' | 'danger' | 'muted';

export interface FountainStatusModel {
  visible: boolean;
  tone: FountainStatusTone;
  label: string;
  detail: string;
  actionHint: string;
}

export interface FountainStatusInput {
  alive: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stashItems: number;
  alliedFountainDistance: number;
  alliedAuraRadius: number;
  enemyFountainDistance: number;
  enemyAttackRange: number;
}

export function buildFountainStatusModel(input: FountainStatusInput): FountainStatusModel {
  if (!input.alive) return hidden();
  const hpPct = pct(input.hp, input.maxHp);
  const mpPct = pct(input.mp, input.maxMp);
  const stash = Math.max(0, Math.floor(input.stashItems));

  if (input.enemyFountainDistance <= input.enemyAttackRange) {
    return {
      visible: true,
      tone: 'danger',
      label: '敌方泉水危险',
      detail: `射程内 · 距离 ${Math.round(input.enemyFountainDistance)}`,
      actionHint: '立刻撤离',
    };
  }

  if (input.alliedFountainDistance <= input.alliedAuraRadius) {
    return {
      visible: true,
      tone: 'ready',
      label: hpPct < 100 || mpPct < 100 ? '泉水回复中' : '基地补给就绪',
      detail: resourceDetail(hpPct, mpPct, stash),
      actionHint: stash > 0 ? '取储藏 / 补给 / 购物' : '补给 / 购物',
    };
  }

  if (hpPct <= 35 || mpPct <= 25) {
    return {
      visible: true,
      tone: 'busy',
      label: '建议回泉水',
      detail: `${resourceDetail(hpPct, mpPct, stash)} · 距泉水 ${Math.round(input.alliedFountainDistance)}`,
      actionHint: 'TP 或回撤补给',
    };
  }

  if (stash > 0) {
    return {
      visible: true,
      tone: 'busy',
      label: '储藏待处理',
      detail: `储藏 x${stash} · 距泉水 ${Math.round(input.alliedFountainDistance)}`,
      actionHint: '派信使或回泉水取回',
    };
  }

  return hidden();
}

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function resourceDetail(hpPct: number, mpPct: number, stash: number): string {
  const base = `生命 ${hpPct}% · 法力 ${mpPct}%`;
  return stash > 0 ? `${base} · 储藏 x${stash}` : base;
}

function hidden(): FountainStatusModel {
  return {
    visible: false,
    tone: 'muted',
    label: '',
    detail: '',
    actionHint: '',
  };
}
