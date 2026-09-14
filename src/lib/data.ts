import type { CatalogProduct, ClosetItem } from "./types";
import catalogJson from "@/data/catalog.json";
import closetJson from "@/data/closet.json";

// The JSON files are generated from these same types by scripts/build-data.ts,
// which is the only place a real product store would need to be swapped in.
export const catalog = catalogJson as CatalogProduct[];
export const closet = closetJson as ClosetItem[];

/** Products whose Closai module the reviewer should see first: looks, fit hint, already-own. */
export const FEATURED_IDS = ["TIBI-9992392", "R13-2857220", "ZOE-CHICCO-7532027"];

/** Color variants share a base id with a numeric suffix, e.g. TIBI-9679470-01. */
export function isVariant(id: string): boolean {
  return /-\d{2}$/.test(id);
}

export function getProduct(id: string): CatalogProduct | undefined {
  return catalog.find((p) => p.id === id);
}
