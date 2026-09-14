import type { ProductBase } from "../types";
import { classify, season } from "./slots";
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

/** Points per reason, used only to rank pairings that already passed the bar. */
const WEIGHT: Record<Reason["code"], number> = {
  "same-occasion": 2,
  "same-brand": 2,
  "matching-set": 2,
  "everyday-staple": 1,
  "neutral-palette": 1,
  "neutral-pairing": 1,
  "matching-palette": 1,
  "layers-under": 1,
  "same-category": 0,
  "same-color": 0,
  "same-designer": 0,
  "similar-style": 0,
  "same-fabric": 0,
};

/** The bar a pairing must clear to be shown: no conflict and at least this many reasons. */
export const MIN_REASONS = 2;

export interface Compatibility {
  reasons: Reason[];
  conflict: boolean;
  score: number;
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

/**
 * Two patterned pieces clash unless they are a matching set. A patterned piece
 * also refuses a partner whose print is unrecorded: with no evidence it is
 * solid, Closai does not vouch for the pairing. Solids go with anything.
 */
export function printsClash(a: ProductBase, b: ProductBase): boolean {
  const unsafe = (p: ProductBase) => patterned(p) || p.print === null;
  return ((patterned(a) && unsafe(b)) || (patterned(b) && unsafe(a))) && !isMatchingSet(a, b);
}

/** A winter boot and tailored shorts do not share an outfit. */
export function seasonsConflict(a: ProductBase, b: ProductBase): boolean {
  const sa = season(a);
  const sb = season(b);
  return sa !== "any" && sb !== "any" && sa !== sb;
}

/** Conflicts that apply between any two pieces in the same outfit. */
export function conflicts(a: ProductBase, b: ProductBase): boolean {
  return occasionsConflict(a, b) || printsClash(a, b) || seasonsConflict(a, b);
}

/**
 * Scores an owned candidate against the product being viewed. The reasons
 * returned are exactly the rules that fired; nothing is generated afterwards.
 */
export function compatibility(viewed: ProductBase, candidate: ProductBase): Compatibility {
  const reasons: Reason[] = [];
  let conflict = conflicts(viewed, candidate);

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
  if (viewedClass?.slot === "outerwear" && candidateClass?.slot === "top") {
    if (candidateClass.layer === "base") {
      reasons.push({ code: "layers-under", label: "Layers underneath" });
    } else {
      conflict = true;
    }
  }

  const score = reasons.reduce((sum, r) => sum + WEIGHT[r.code], 0);
  return { reasons, conflict, score };
}

export function passes(c: Compatibility): boolean {
  return !c.conflict && c.reasons.length >= MIN_REASONS;
}
