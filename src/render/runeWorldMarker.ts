import type { Vec2 } from '../core/vec2';
import type { RuneSpawn } from '../sim/runes';

export interface RuneWorldMarker {
  type: RuneSpawn['type'];
  pos: Vec2;
  label: string;
  glyph: string;
  color: string;
  glow: string;
  radius2d: number;
  height3d: number;
  title: string;
}

const RUNE_STYLE: Record<RuneSpawn['type'], { label: string; glyph: string; color: string; glow: string }> = {
  haste: { label: '加速', glyph: 'H', color: '#67c7ff', glow: '#a7ecff' },
  doubledamage: { label: '双倍', glyph: 'D', color: '#ff7862', glow: '#ffc0a8' },
  regen: { label: '恢复', glyph: 'G', color: '#70e89a', glow: '#c8ffd7' },
  invis: { label: '隐身', glyph: 'I', color: '#b896ff', glow: '#d7c7ff' },
  illusion: { label: '幻象', glyph: 'M', color: '#8ff6ff', glow: '#c4fbff' },
  bounty: { label: '赏金', glyph: 'B', color: '#ffd46b', glow: '#fff0a8' },
};

export function buildRuneWorldMarkers(runes: RuneSpawn[]): RuneWorldMarker[] {
  return runes.map((rune) => {
    const style = RUNE_STYLE[rune.type];
    return {
      type: rune.type,
      pos: { ...rune.pos },
      label: style.label,
      glyph: style.glyph,
      color: style.color,
      glow: style.glow,
      radius2d: 120,
      height3d: 180,
      title: `${style.label}神符: 靠近自动拾取/装瓶`,
    };
  });
}
