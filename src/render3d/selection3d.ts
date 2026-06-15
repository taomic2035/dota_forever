export interface Selection3DInput {
  selectedUnitId?: number;
  selectedUnitIds?: number[];
  commandableSelectedIds?: number[];
  inspectUnitId?: number;
}

export interface Selection3DMarkerIds {
  primaryId: number;
  secondaryIds: number[];
}

export function selection3DMarkerIds(legacySelectedId: number, selection?: Selection3DInput): Selection3DMarkerIds {
  const primaryId = selection?.selectedUnitId ?? legacySelectedId;
  const commandableIds = selection?.commandableSelectedIds ?? [];
  const secondaryIds = uniqueIds(commandableIds).filter((id) => id > 0 && id !== primaryId);
  return { primaryId, secondaryIds };
}

function uniqueIds(ids: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}
