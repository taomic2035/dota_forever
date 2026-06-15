import { itemDef } from '../data/items';

export interface ShopRecipeItemInput {
  itemKey: string;
  charges?: number;
}

export interface ShopRecipeInput {
  recipe: { components: string[]; recipeCost: number } | null | undefined;
  inventory: Array<ShopRecipeItemInput | null>;
  backpack: Array<ShopRecipeItemInput | null>;
  stash: Array<ShopRecipeItemInput | null>;
  tpSlot?: ShopRecipeItemInput | null;
}

export interface ShopRecipeMissingComponent {
  key: string;
  label: string;
  required: number;
  owned: number;
  heroReady: number;
  missing: number;
}

export interface ShopRecipeProgressModel {
  visible: boolean;
  ownedLabel: string;
  readyLabel: string;
  missing: ShopRecipeMissingComponent[];
  detail: string;
}

export function buildShopRecipeProgressModel(input: ShopRecipeInput): ShopRecipeProgressModel {
  const recipe = input.recipe;
  if (!recipe) {
    return { visible: false, ownedLabel: '', readyLabel: '', missing: [], detail: '' };
  }

  const requirements = countRequired(recipe.components);
  const totalRequired = recipe.components.length;
  const ownedCounts = countOwned([
    ...input.inventory,
    ...input.backpack,
    ...input.stash,
    ...(input.tpSlot ? [input.tpSlot] : []),
  ], requirements);
  const heroReadyCounts = countOwned(input.inventory, requirements);
  const ownedTotal = cappedTotal(ownedCounts, requirements);
  const heroReadyTotal = cappedTotal(heroReadyCounts, requirements);
  const missing = [...requirements.entries()]
    .map(([key, required]) => {
      const owned = ownedCounts.get(key) ?? 0;
      const heroReady = heroReadyCounts.get(key) ?? 0;
      return {
        key,
        label: compactItemName(itemDef(key).name),
        required,
        owned,
        heroReady,
        missing: Math.max(0, required - owned),
      };
    })
    .filter((component) => component.missing > 0);

  return {
    visible: true,
    ownedLabel: `${ownedTotal}/${totalRequired}`,
    readyLabel: `${heroReadyTotal}/${totalRequired}`,
    missing,
    detail: recipeDetail(ownedTotal, heroReadyTotal, totalRequired, missing, recipe.recipeCost),
  };
}

function countRequired(components: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of components) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

function countOwned(
  items: Array<ShopRecipeItemInput | null>,
  requirements: Map<string, number>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item || !requirements.has(item.itemKey)) continue;
    const def = itemDef(item.itemKey);
    const amount = def.stackCharges ? Math.max(1, Math.floor(item.charges ?? 1)) : 1;
    counts.set(item.itemKey, (counts.get(item.itemKey) ?? 0) + amount);
  }
  return counts;
}

function cappedTotal(counts: Map<string, number>, requirements: Map<string, number>): number {
  let total = 0;
  for (const [key, required] of requirements) total += Math.min(required, counts.get(key) ?? 0);
  return total;
}

function recipeDetail(
  ownedTotal: number,
  heroReadyTotal: number,
  totalRequired: number,
  missing: ShopRecipeMissingComponent[],
  recipeCost: number,
): string {
  const parts = [
    `Owned ${ownedTotal}/${totalRequired}`,
    `Hero-ready ${heroReadyTotal}/${totalRequired}`,
  ];
  if (missing.length > 0) {
    parts.push(`missing ${missing.map((component) => `${component.key} x${component.missing}`).join(' / ')}`);
  }
  if (recipeCost > 0) parts.push(`recipe ${recipeCost}g`);
  return parts.join(' / ');
}

function compactItemName(name: string): string {
  return Array.from(name).slice(0, 2).join('');
}
