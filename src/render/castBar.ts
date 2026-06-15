/**
 * 施法/引导进度条:2D 与 3D 渲染器共用,杜绝奇偶漂移。
 *
 * sim 只暴露施法/引导的「结束时刻」(casting.pointUntil / channeling.until),
 * 起始时刻由渲染侧在首次看见时捕获(per-renderer 的 castTrack Map),据此算进度。
 */
import type { Unit } from '../sim/unit';

export interface CastTrackEntry {
  start: number;
  end: number;
}

export interface CastBarInfo {
  /** 0..1 进度 */
  frac: number;
  /** true = 引导(channel),false = 施法前摇(cast) */
  channel: boolean;
  /** 进度条颜色 */
  color: string;
}

/** 施法青 / 引导金 —— 两个渲染器共用同一配色。 */
export const CAST_COLOR = '#46d0ff';
export const CHANNEL_COLOR = '#ffc23a';

/**
 * 更新该单位的施法轨迹并返回进度信息;未施法时返回 null 并清理其轨迹。
 * 端时刻变化(>0.02s)视为新一次施法,重新捕获起始。
 */
export function castBarInfo(
  track: Map<number, CastTrackEntry>,
  u: Pick<Unit, 'id' | 'casting' | 'channeling'>,
  now: number,
): CastBarInfo | null {
  const castEnd = u.casting ? u.casting.pointUntil : u.channeling ? u.channeling.until : null;
  if (castEnd === null) {
    track.delete(u.id);
    return null;
  }
  const tr = track.get(u.id);
  if (!tr || Math.abs(tr.end - castEnd) > 0.02) track.set(u.id, { start: now, end: castEnd });
  const e = track.get(u.id)!;
  const frac = Math.max(0, Math.min(1, (now - e.start) / Math.max(0.05, e.end - e.start)));
  const channel = !!u.channeling;
  return { frac, channel, color: channel ? CHANNEL_COLOR : CAST_COLOR };
}
