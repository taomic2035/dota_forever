import { Team } from '../sim/map';

export type ProjectileVisualFamily = 'physical' | 'tower' | 'ability';
export type ProjectileSourceKind = 'hero' | 'creep' | 'tower' | 'building' | 'neutral' | 'boss' | 'ward' | 'illusion';

export interface ProjectileVisualInput {
  kind: 'attack' | 'ability';
  sourceTeam: Team;
  sourceKind?: ProjectileSourceKind;
  style?: string;
}

export interface ProjectileVisual {
  family: ProjectileVisualFamily;
  color: string;
  trail: string;
  length: number;
  thickness: number;
  glow: number;
}

export function projectileVisualFor(input: ProjectileVisualInput): ProjectileVisual {
  if (input.kind === 'ability') {
    const color = input.style === 'hammer' ? '#ffd54f' : '#bfe3ff';
    return {
      family: 'ability',
      color,
      trail: color,
      length: 46,
      thickness: 14,
      glow: 18,
    };
  }

  if (input.sourceKind === 'tower') {
    const color = input.sourceTeam === Team.Night ? '#ff6f59' : '#f4e7a1';
    return {
      family: 'tower',
      color,
      trail: color,
      length: 82,
      thickness: 10,
      glow: 14,
    };
  }

  const color =
    input.sourceTeam === Team.Night ? '#ff9e80' :
    input.sourceTeam === Team.Dawn ? '#cdeebf' :
    '#e0e0e0';
  return {
    family: 'physical',
    color,
    trail: color,
    length: 46,
    thickness: 5,
    glow: 0,
  };
}
