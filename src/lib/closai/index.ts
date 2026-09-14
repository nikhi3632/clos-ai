import type { CatalogProduct, ClosetItem } from "../types";
import { fitSignal } from "./fit";
import { buildLooks } from "./looks";
import { findSimilar } from "./similarity";
import type { ClosaiResult } from "./types";

export type { ClosaiResult, FitSignal, Look, LookItem, Reason, Slot } from "./types";

/**
 * The one question the engine answers: given what the shopper owns, does
 * Closai have something useful to say about this product?
 *
 *   already-own  the shopper has a close substitute; say so instead of styling
 *   looks        outfits from owned pieces, plus a fit hint when there is one
 *   none         nothing worth showing; the page stays a normal retailer page
 */
export function styledWithCloset(product: CatalogProduct, closet: ClosetItem[]): ClosaiResult {
  const similar = findSimilar(product, closet);
  if (similar !== null) return { state: "already-own", ...similar };

  const looks = buildLooks(product, closet);
  if (looks.length === 0) return { state: "none" };

  return { state: "looks", looks, fit: fitSignal(product, closet) };
}
