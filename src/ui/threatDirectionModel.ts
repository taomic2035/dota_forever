import type { Vec2 } from '../core/vec2';
import type { DamageType } from './deathRecapModel';

export type ThreatEdge = 'top' | 'right' | 'bottom' | 'left';

export interface ThreatDirectionInstance {
  at: number;
  targetPos: Vec2;
  sourcePos: Vec2;
  groupKey: string;
  sourceName: string;
  sourceColor?: string;
  amount: number;
  type: DamageType;
}

export interface ThreatEdgeIndicator {
  edge: ThreatEdge;
  groupKey: string;
  sourceName: string;
  sourceColor?: string;
  total: number;
  byType: Record<DamageType, number>;
  dominantType: DamageType;
  intensity: number;
  latestAt: number;
  label: string;
}

export interface ThreatDirectionInput {
  now: number;
  events: ThreatDirectionInstance[];
  ttl?: number;
  maxIndicators?: number;
}

const DEFAULT_TTL = 1.35;
const DEFAULT_MAX = 4;

export function threatEdgeBucket(targetPos: Vec2, sourcePos: Vec2): ThreatEdge {
  const dx = sourcePos.x - targetPos.x;
  const dy = sourcePos.y - targetPos.y;
  if (dx === 0 && dy === 0) return 'top';
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

export function buildThreatEdgeIndicators(input: ThreatDirectionInput): ThreatEdgeIndicator[] {
  const ttl = input.ttl ?? DEFAULT_TTL;
  const maxIndicators = input.maxIndicators ?? DEFAULT_MAX;
  const byEdgeSource = new Map<string, ThreatEdgeIndicator & { weighted: number }>();
  for (const event of input.events) {
    if (event.amount <= 0) continue;
    const age = input.now - event.at;
    if (age < 0 || age > ttl) continue;
    const edge = threatEdgeBucket(event.targetPos, event.sourcePos);
    const key = `${edge}:${event.groupKey}`;
    let indicator = byEdgeSource.get(key);
    if (!indicator) {
      indicator = {
        edge,
        groupKey: event.groupKey,
        sourceName: event.sourceName,
        sourceColor: event.sourceColor,
        total: 0,
        byType: { physical: 0, magical: 0, pure: 0 },
        dominantType: event.type,
        intensity: 0,
        latestAt: event.at,
        weighted: 0,
        label: '',
      };
      byEdgeSource.set(key, indicator);
    }
    const decay = Math.max(0, 1 - age / ttl);
    indicator.total += event.amount;
    indicator.weighted += event.amount * decay;
    indicator.byType[event.type] += event.amount;
    if (event.at >= indicator.latestAt) {
      indicator.latestAt = event.at;
      indicator.sourceName = event.sourceName;
      indicator.sourceColor = event.sourceColor;
    }
  }

  return [...byEdgeSource.values()]
    .map((indicator) => {
      const dominantType = dominantDamageType(indicator.byType);
      const intensity = Math.max(0.16, Math.min(1, indicator.weighted / 140));
      const label = `${indicator.sourceName} ${Math.round(indicator.total)}`;
      const { weighted: _drop, ...publicIndicator } = indicator;
      return { ...publicIndicator, dominantType, intensity, label };
    })
    .sort((a, b) => b.intensity - a.intensity || b.latestAt - a.latestAt)
    .slice(0, maxIndicators);
}

export class ThreatDirectionLog {
  private buf: ThreatDirectionInstance[] = [];

  constructor(private readonly cap = 24) {}

  push(instance: ThreatDirectionInstance): void {
    this.buf.push(instance);
    if (this.buf.length > this.cap) this.buf.shift();
  }

  clear(): void {
    this.buf = [];
  }

  indicators(now: number, ttl = DEFAULT_TTL, maxIndicators = DEFAULT_MAX): ThreatEdgeIndicator[] {
    return buildThreatEdgeIndicators({ now, events: this.buf, ttl, maxIndicators });
  }
}

function dominantDamageType(byType: Record<DamageType, number>): DamageType {
  if (byType.pure >= byType.physical && byType.pure >= byType.magical) return 'pure';
  if (byType.magical >= byType.physical) return 'magical';
  return 'physical';
}
