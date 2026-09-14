import type { CatalogProduct, ClosetItem } from "../types";
import { compatibility, conflicts, passes } from "./compatibility";
import { classify } from "./slots";
import type { Look, LookItem, Slot } from "./types";

/** Which owned slots complete an outfit around the viewed product's slot. */
const TEMPLATES: Record<Slot, readonly (readonly Slot[])[]> = {
  outerwear: [["top", "bottom", "footwear"], ["dress", "footwear"]],
  top: [["bottom", "footwear"]],
  bottom: [["top", "footwear"]],
  dress: [["footwear"]],
  footwear: [["top", "bottom"], ["dress"]],
  bag: [],
  accessory: [],
};

export const MAX_LOOKS = 3;

export type Candidates = Map<Slot, LookItem[]>;

/**
 * Owned pieces that clear the compatibility bar against the viewed product,
 * grouped by slot. This is the whole universe the stylist model may compose
 * from: it cannot add a piece, and it cannot use one that failed here.
 */
export function candidatePieces(viewed: CatalogProduct, closet: ClosetItem[]): Candidates {
  const candidates: Candidates = new Map();
  for (const item of closet) {
    const cls = classify(item);
    if (cls === null) continue;
    const c = compatibility(viewed, item);
    if (!passes(c)) continue;
    const list = candidates.get(cls.slot) ?? [];
    list.push({ item, slot: cls.slot, reasons: c.reasons });
    candidates.set(cls.slot, list);
  }
  return candidates;
}

/** The slot sets that could be filled from these candidates, e.g. [["top","bottom","footwear"]]. */
export function fillableTemplates(viewed: CatalogProduct, candidates: Candidates): readonly (readonly Slot[])[] {
  const cls = classify(viewed);
  if (cls === null) return [];
  return TEMPLATES[cls.slot].filter((template) => template.every((slot) => (candidates.get(slot) ?? []).length > 0));
}

/** Pairwise coherence: no two pieces in the outfit conflict with each other. */
function coherent(items: LookItem[]): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (conflicts(items[i].item, items[j].item)) return false;
    }
  }
  return true;
}

/**
 * The piece that defines an outfit's silhouette: the dress, else the bottom's
 * category, else the top's, else the shoe's (a dress is completed by footwear
 * alone, so two dress looks differ by shoe category).
 */
export function silhouetteKey(items: LookItem[]): string {
  const dress = items.find((i) => i.slot === "dress");
  if (dress) return "dress";
  for (const slot of ["bottom", "top", "footwear"] as const) {
    const li = items.find((i) => i.slot === slot);
    if (li) return `${slot}:${li.item.category.level2 ?? li.item.category.level1}`;
  }
  return "";
}

/**
 * Checks an outfit proposed by the stylist model against the deterministic
 * rules: every piece must be a candidate, the pieces must fill exactly one
 * template, and no two pieces may conflict. Returns the outfit's items, or the
 * reason it was rejected.
 */
export function validateOutfit(
  viewed: CatalogProduct,
  candidates: Candidates,
  pieceIds: string[],
): { items: LookItem[] } | { error: string } {
  if (new Set(pieceIds).size !== pieceIds.length) return { error: "repeated piece" };
  const items: LookItem[] = [];
  for (const id of pieceIds) {
    const found = [...candidates.values()].flat().find((li) => li.item.id === id);
    if (!found) return { error: `piece ${id} is not a compatible owned item` };
    items.push(found);
  }
  const slots = items.map((li) => li.slot).sort();
  const fits = fillableTemplates(viewed, candidates).some(
    (template) => template.length === slots.length && [...template].sort().every((slot, i) => slot === slots[i]),
  );
  if (!fits) return { error: `slots [${slots.join(", ")}] do not complete the product` };
  if (!coherent(items)) return { error: "pieces conflict with each other" };
  return { items };
}

/**
 * Resolves the committed selections for a product into looks, re-validating
 * each one. A selection that no longer validates means the data and the rules
 * have drifted apart, which is an error, not something to hide.
 */
export function resolveLooks(
  viewed: CatalogProduct,
  candidates: Candidates,
  outfits: { pieces: string[]; note: string }[],
): Look[] {
  const looks: Look[] = [];
  const seen = new Set<string>();
  for (const outfit of outfits) {
    const result = validateOutfit(viewed, candidates, outfit.pieces);
    if ("error" in result) throw new Error(`${viewed.id}: committed outfit is invalid: ${result.error}`);
    const key = silhouetteKey(result.items);
    if (seen.has(key)) throw new Error(`${viewed.id}: committed outfits repeat silhouette ${key}`);
    seen.add(key);
    looks.push({ items: result.items, note: outfit.note });
  }
  if (looks.length > MAX_LOOKS) throw new Error(`${viewed.id}: more than ${MAX_LOOKS} committed outfits`);
  return looks;
}
