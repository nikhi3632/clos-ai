import type { ClosetItem } from "../types";

/** Where a garment sits in an outfit. Items with no slot are never styled. */
export type Slot = "top" | "bottom" | "dress" | "outerwear" | "footwear" | "bag" | "accessory";

/** How a top layers: a base top sits under outerwear, a mid-layer does not. */
export type Layer = "base" | "mid" | "outer";

/**
 * The fixed vocabulary of reasons. Every reason is emitted by the same rule
 * that produced the match, so the explanation is the evidence.
 */
export type ReasonCode =
  // compatibility (styling)
  | "same-occasion"
  | "everyday-staple"
  | "neutral-palette"
  | "neutral-pairing"
  | "matching-palette"
  | "same-brand"
  | "matching-set"
  | "layers-under"
  // similarity (already own)
  | "same-category"
  | "same-color"
  | "same-designer"
  | "similar-style"
  | "same-fabric";

export interface Reason {
  code: ReasonCode;
  /** Display text, e.g. "Same occasion", "Also Tibi". */
  label: string;
}

export interface LookItem {
  item: ClosetItem;
  slot: Slot;
  reasons: Reason[];
}

export interface Look {
  items: LookItem[];
  /** The stylist's one-line note for this outfit, written by the selection model. */
  note: string;
}

/**
 * Outfits chosen by the selection model, generated once by scripts/select-looks.ts
 * and committed. The engine only ever shows an outfit that appears here and that
 * re-validates against its own rules.
 */
export interface StylistSelections {
  model: string;
  generatedAt: string;
  products: Record<string, { outfits: { pieces: string[]; note: string }[] }>;
}

export interface FitSignal {
  size: string;
  /** Owned items of this brand and category with a size. */
  purchases: number;
  /** How many of those are in `size`. */
  agreeing: number;
}

/**
 * What Closai has to say about a retailer product, given the shopper's closet.
 * The engine decides whether there is something useful to say; the UI decides
 * how to present it. `none` means the page stays a normal retailer page.
 */
export type ClosaiResult =
  | { state: "looks"; looks: Look[]; fit: FitSignal | null }
  | { state: "already-own"; owned: ClosetItem; reasons: Reason[] }
  | { state: "none" };
