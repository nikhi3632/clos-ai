import type { CatalogProduct, ClosetItem } from "../types";
import { fitSignal } from "./fit";
import { candidatePieces, resolveLooks } from "./looks";
import { findSimilar } from "./similarity";
import { classify } from "./slots";
import type { ClosaiResult, StylistSelections } from "./types";

export type { ClosaiResult, FitSignal, Look, LookItem, Reason, Slot, StylistSelections } from "./types";

/**
 * The one question the engine answers: given what the shopper owns, does
 * Closai have something useful to say about this product?
 *
 *   already-own  the shopper has a close substitute; say so instead of styling
 *   looks        outfits from owned pieces, composed by the stylist model from
 *                the pieces the rules allow, plus a fit hint when there is one
 *   none         nothing worth showing; the page stays a normal retailer page
 *
 * Facts (ownership, substitutes, fit, what cannot be worn together) are decided
 * here in code. Taste (what makes a complete outfit, how many are worth
 * showing, and why) was decided once by the stylist model and committed; see
 * scripts/select-looks.ts.
 */
export function styledWithCloset(product: CatalogProduct, closet: ClosetItem[], selections: StylistSelections): ClosaiResult {
  const similar = findSimilar(product, closet);
  if (similar !== null) return { state: "already-own", ...similar };

  if (classify(product) === null) return { state: "none" };
  const candidates = candidatePieces(product, closet);
  if (candidates.length === 0) return { state: "none" };

  const selection = selections.products[product.id];
  if (selection === undefined) {
    throw new Error(`${product.id}: has compatible pieces but no stylist selection; run \`npm run select\``);
  }
  const looks = resolveLooks(product, candidates, selection.outfits);
  if (looks.length === 0) return { state: "none" };

  return { state: "looks", looks, fit: fitSignal(product, closet) };
}
