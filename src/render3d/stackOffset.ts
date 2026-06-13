export interface StackVisualOffset {
  x: number;
  z: number;
}

export function stackedUnitVisualOffset(index: number, count: number, radius: number): StackVisualOffset {
  if (count <= 1) return { x: 0, z: 0 };
  const n = Math.max(1, count);
  const angle = (Math.PI * 2 * (index % n)) / n - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}
