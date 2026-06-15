export type InspectPanelAuthorityKind = 'commandable' | 'inspect';

export interface InspectPanelAuthorityInput {
  unitId: number;
  commandableSelectedIds: number[];
  inspectUnitId: number;
}

export interface InspectPanelAuthority {
  kind: InspectPanelAuthorityKind;
  label: string;
  detail: string;
  color: string;
  background: string;
}

export function inspectPanelAuthority(input: InspectPanelAuthorityInput): InspectPanelAuthority | null {
  if (!input.unitId) return null;
  if (input.commandableSelectedIds.includes(input.unitId)) {
    return {
      kind: 'commandable',
      label: 'COMMANDABLE',
      detail: 'Orders affect this selected unit.',
      color: '#9cff74',
      background: '#183315',
    };
  }
  return {
    kind: 'inspect',
    label: 'VIEW ONLY',
    detail: 'Orders fall back to your hero.',
    color: '#ffd76a',
    background: '#332715',
  };
}
