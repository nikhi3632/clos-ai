import type { ProductBase } from "../types";
import { bodyZone, classify, season } from "./slots";
import type { Reason } from "./types";

const NEUTRAL_FAMILIES = new Set(["Black", "White", "Grey", "Cream", "Tan", "Brown", "Gold", "Silver"]);

/** Occasions that do not belong in the same outfit. Everything else coexists. */
const OCCASION_CONFLICTS: ReadonlyArray<readonly [string, string]> = [
  ["Active", "Work"],
  ["Active", "Event"],
  ["Active", "Night Out"],
  ["Lounge", "Work"],
  ["Lounge", "Event"],
  ["Lounge", "Night Out"],
  ["Vacation", "Work"],
];

export interface Compatibility {
  reasons: Reason[];
  conflict: boolean;
}

/** Denim reads as neutral in an outfit even though the dataset files it under Blue. */
export function isNeutral(p: ProductBase): boolean {
  return (p.colorFamily !== null && NEUTRAL_FAMILIES.has(p.colorFamily)) || p.category.level2 === "Jeans";
}

export function occasionsConflict(a: ProductBase, b: ProductBase): boolean {
  if (a.occasion === null || b.occasion === null) return false;
  return OCCASION_CONFLICTS.some(([x, y]) => (a.occasion === x && b.occasion === y) || (a.occasion === y && b.occasion === x));
}

const patterned = (p: ProductBase) => p.print !== null && p.print !== "Solid";

/** Same designer, same print: pieces sold as a set, e.g. a plaid suit. */
export function isMatchingSet(a: ProductBase, b: ProductBase): boolean {
  return patterned(a) && a.brand === b.brand && a.print === b.print;
}

/** Two patterned pieces clash unless they are a matching set. Solids and unknowns go with anything. */
export function printsClash(a: ProductBase, b: ProductBase): boolean {
  return patterned(a) && patterned(b) && !isMatchingSet(a, b);
}

/** A winter boot and tailored shorts do not share an outfit. */
export function seasonsConflict(a: ProductBase, b: ProductBase): boolean {
  const sa = season(a);
  const sb = season(b);
  return sa !== "any" && sb !== "any" && sa !== sb;
}

/** A cardigan or sweatshirt does not go under a coat or blazer. */
export function layersConflict(a: ProductBase, b: ProductBase): boolean {
  const ca = classify(a);
  const cb = classify(b);
  if (ca === null || cb === null) return false;
  const midUnderOuter = (x: typeof ca, y: typeof cb) => x.slot === "outerwear" && y.slot === "top" && y.layer === "mid";
  return midUnderOuter(ca, cb) || midUnderOuter(cb, ca);
}

/** Two pieces on the same part of the body, or a dress with a bottom. */
export function zonesConflict(a: ProductBase, b: ProductBase): boolean {
  const ca = classify(a);
  const cb = classify(b);
  if (ca === null || cb === null) return false;
  if (bodyZone(a, ca) === bodyZone(b, cb)) return true;
  const slots = new Set([ca.slot, cb.slot]);
  return slots.has("dress") && slots.has("bottom");
}

/**
 * Everything that makes two pieces impossible together: clashing occasions,
 * competing prints, opposite seasons, a mid-layer under outerwear, or the same
 * part of the body. These are the facts the rules own; whether two compatible
 * pieces look good together is the stylist model's call.
 */
export function conflicts(a: ProductBase, b: ProductBase): boolean {
  return occasionsConflict(a, b) || printsClash(a, b) || seasonsConflict(a, b) || layersConflict(a, b) || zonesConflict(a, b);
}

/**
 * Evidence for an owned piece against the product being viewed. The reasons
 * returned are exactly the rules that fired and are shown under the piece;
 * they do not gate anything. A piece is a candidate as long as it does not
 * conflict.
 */
export function compatibility(viewed: ProductBase, candidate: ProductBase): Compatibility {
  const reasons: Reason[] = [];
  const conflict = conflicts(viewed, candidate);

  if (viewed.occasion !== null && viewed.occasion === candidate.occasion) {
    reasons.push({ code: "same-occasion", label: "Same occasion" });
  } else if (candidate.occasion === "Everyday" && viewed.occasion !== null) {
    reasons.push({ code: "everyday-staple", label: "Everyday staple" });
  }

  if (isNeutral(viewed) && isNeutral(candidate)) {
    reasons.push({ code: "neutral-palette", label: "Neutral palette" });
  } else if (viewed.colorFamily !== null && viewed.colorFamily === candidate.colorFamily) {
    reasons.push({ code: "matching-palette", label: "Matching palette" });
  } else if (isNeutral(viewed) || isNeutral(candidate)) {
    reasons.push({ code: "neutral-pairing", label: "Neutral pairing" });
  }

  if (viewed.brand === candidate.brand) {
    reasons.push({ code: "same-brand", label: `Also ${viewed.brand}` });
  }

  if (isMatchingSet(viewed, candidate)) {
    reasons.push({ code: "matching-set", label: "Matching set" });
  }

  const viewedClass = classify(viewed);
  const candidateClass = classify(candidate);
  if (viewedClass?.slot === "outerwear" && candidateClass?.slot === "top" && candidateClass.layer === "base") {
    reasons.push({ code: "layers-under", label: "Layers underneath" });
  }

  return { reasons, conflict };
}
