import type { ClosetItem, ProductBase } from "../types";
import { classify } from "./slots";
import type { Reason } from "./types";

const STOP_WORDS = new Set(["the", "and", "with", "in", "of", "a"]);

/** Independent signals that two same-category items are the same kind of thing. */
const MIN_SIGNALS = 2;

function nameTokens(p: ProductBase): Set<string> {
  const brand = new Set(p.brand.toLowerCase().split(/\s+/));
  return new Set(
    p.name
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0 && !STOP_WORDS.has(t) && !brand.has(t)),
  );
}

function sameCategory(a: ProductBase, b: ProductBase): boolean {
  return a.category.level1 === b.category.level1 && a.category.level2 === b.category.level2 && a.category.level3 === b.category.level3;
}

/** A solid and a checkerboard are not the same kind of thing, whatever the data says about color. */
function printsAgree(a: ProductBase, b: ProductBase): boolean {
  return a.print === null || b.print === null || a.print === b.print;
}

function signals(viewed: ProductBase, owned: ProductBase): Reason[] {
  const out: Reason[] = [];
  if (viewed.colorFamily !== null && viewed.colorFamily === owned.colorFamily) {
    out.push({ code: "same-color", label: "Same color" });
  }
  if (viewed.brand === owned.brand) {
    out.push({ code: "same-designer", label: "Same designer" });
  }
  const shared = [...nameTokens(viewed)].filter((t) => nameTokens(owned).has(t));
  if (shared.length >= 2) {
    out.push({ code: "similar-style", label: "Similar style" });
  }
  if (viewed.fabric !== null && viewed.fabric === owned.fabric) {
    out.push({ code: "same-fabric", label: "Same fabric" });
  }
  return out;
}

/**
 * Finds an owned item the shopper could reasonably substitute for the viewed
 * product: same category at every level, prints that agree, plus at least two
 * independent signals of sameness. Only styled categories qualify, so a candle never
 * "matches" another candle.
 */
export function findSimilar(viewed: ProductBase, closet: ClosetItem[]): { owned: ClosetItem; reasons: Reason[] } | null {
  if (classify(viewed) === null) return null;
  const { level1, level2, level3 } = viewed.category;
  const categoryLabel = level3 ?? level2 ?? level1;

  let best: { owned: ClosetItem; reasons: Reason[] } | null = null;
  for (const owned of closet) {
    if (classify(owned) === null || !sameCategory(viewed, owned) || !printsAgree(viewed, owned)) continue;
    const found = signals(viewed, owned);
    if (found.length < MIN_SIGNALS) continue;
    if (best === null || found.length > best.reasons.length - 1) {
      best = { owned, reasons: [{ code: "same-category", label: categoryLabel }, ...found] };
    }
  }
  return best;
}
