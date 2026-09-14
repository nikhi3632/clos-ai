import type { CatalogProduct, ClosetItem } from "../types";
import type { FitSignal } from "./types";

/**
 * What size the shopper has bought from this brand in this category before.
 * Sizes are reported as stored (US numeric, letters, EU) with no conversion,
 * and only when the owned sizes agree on a single answer.
 */
export function fitSignal(product: CatalogProduct, closet: ClosetItem[]): FitSignal | null {
  const sizes = closet
    .filter((c) => c.brand === product.brand && c.category.level1 === product.category.level1 && c.size !== null)
    .map((c) => c.size as string);
  if (sizes.length === 0) return null;

  const counts = new Map<string, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [size, agreeing] = ranked[0];
  if (ranked.length > 1 && ranked[1][1] === agreeing) return null;
  return { size, purchases: sizes.length, agreeing };
}
