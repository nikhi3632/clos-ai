import type { CatalogProduct, ClosetItem } from "../types";
import { compatibility, conflicts } from "./compatibility";
import { classify } from "./slots";
import type { Look, LookItem } from "./types";

/**
 * Every owned garment that could be worn with the viewed product: it has a
 * slot, and it does not conflict with the product on any hard rule. This is
 * the whole universe the stylist model composes from. It cannot add a piece,
 * and it cannot use one that is excluded here. Reasons are evidence shown
 * under the piece, not a filter.
 */
export function candidatePieces(viewed: CatalogProduct, closet: ClosetItem[]): LookItem[] {
  const pieces: LookItem[] = [];
  for (const item of closet) {
    const cls = classify(item);
    if (cls === null) continue;
    const c = compatibility(viewed, item);
    if (c.conflict) continue;
    pieces.push({ item, slot: cls.slot, reasons: c.reasons });
  }
  return pieces;
}

/** Order-independent identity of an outfit, for spotting duplicates. */
export function outfitKey(pieceIds: readonly string[]): string {
  return [...pieceIds].sort().join("+");
}

/**
 * Checks an outfit proposed by the stylist model against the facts: every
 * piece must be a candidate, and no two pieces may conflict with each other.
 * Nothing here judges whether the outfit is good, complete, or different
 * enough from another; that was the model's job.
 */
export function validateOutfit(candidates: LookItem[], pieceIds: string[]): { items: LookItem[] } | { error: string } {
  if (pieceIds.length === 0) return { error: "empty outfit" };
  if (new Set(pieceIds).size !== pieceIds.length) return { error: "repeated piece" };
  const items: LookItem[] = [];
  for (const id of pieceIds) {
    const found = candidates.find((li) => li.item.id === id);
    if (!found) return { error: `piece ${id} is not a compatible owned item` };
    items.push(found);
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (conflicts(items[i].item, items[j].item)) {
        return { error: `${items[i].item.name} and ${items[j].item.name} cannot be worn together` };
      }
    }
  }
  return { items };
}

/**
 * Resolves the committed selections for a product into looks, re-validating
 * each one. A selection that no longer validates means the data and the rules
 * have drifted apart, which is an error, not something to hide.
 */
export function resolveLooks(viewed: CatalogProduct, candidates: LookItem[], outfits: { pieces: string[]; note: string }[]): Look[] {
  const looks: Look[] = [];
  const seen = new Set<string>();
  for (const outfit of outfits) {
    const result = validateOutfit(candidates, outfit.pieces);
    if ("error" in result) throw new Error(`${viewed.id}: committed outfit is invalid: ${result.error}`);
    const key = outfitKey(outfit.pieces);
    if (seen.has(key)) throw new Error(`${viewed.id}: committed outfit ${key} is duplicated`);
    seen.add(key);
    looks.push({ items: result.items, note: outfit.note });
  }
  return looks;
}
