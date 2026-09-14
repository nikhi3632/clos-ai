import type { ProductBase } from "../types";
import type { Layer, Slot } from "./types";

export interface Classified {
  slot: Slot;
  layer: Layer;
}

export type Season = "warm" | "cold" | "any";

const COLD_CATEGORIES = new Set(["Puffers & Parkas", "Fur/Shearling", "Boots & Booties"]);
const WARM_CATEGORIES = new Set(["Shorts", "Sandals", "Espadrilles", "Flip Flops", "Sundresses", "Tank Tops", "Crop Tops", "Rompers", "Sarongs"]);

/**
 * Whether a piece belongs to warm or cold weather, derived from category since
 * the dataset has no season field. Most pieces are "any" and never conflict.
 */
export function season(product: ProductBase): Season {
  const { level2, level3 } = product.category;
  for (const c of [level2, level3]) {
    if (c !== null && COLD_CATEGORIES.has(c)) return "cold";
    if (c !== null && WARM_CATEGORIES.has(c)) return "warm";
  }
  return "any";
}

const EXCLUDED_LEVEL1 = new Set(["Home", "Beauty", "Accessories"]);
const EXCLUDED_LEVEL2 = new Set(["Swim", "Intimates"]);
const MID_LAYER_LEVEL2 = new Set(["Sweatshirts"]);
const ACCESSORY_LEVEL1 = new Set(["Belts", "Jewelry", "Hats", "Eyewear"]);

/**
 * Maps a product's category onto an outfit slot. Returns null for things that
 * are never styled (home, beauty, swim, workout gear). Layer is derived from
 * category because the dataset's own layer attribute is mostly empty.
 */
export function classify(product: ProductBase): Classified | null {
  const { level1, level2, level3 } = product.category;
  if (EXCLUDED_LEVEL1.has(level1)) return null;
  if (level2 !== null && EXCLUDED_LEVEL2.has(level2)) return null;

  switch (level1) {
    case "Tops":
      if (level2 === "Jackets & Coats") return { slot: "outerwear", layer: "outer" };
      if (level3 === "Cardigans" || (level2 !== null && MID_LAYER_LEVEL2.has(level2))) {
        return { slot: "top", layer: "mid" };
      }
      return { slot: "top", layer: "base" };
    case "Bottoms":
      return { slot: "bottom", layer: "base" };
    case "Dresses":
    case "Jumpsuits":
      return { slot: "dress", layer: "base" };
    case "Footwear":
      // Shoes come in sizes; a one-size "footwear" row is socks, not a shoe.
      return product.size === "One Size" ? null : { slot: "footwear", layer: "base" };
    case "Bags":
      return { slot: "bag", layer: "base" };
    default:
      return ACCESSORY_LEVEL1.has(level1) ? { slot: "accessory", layer: "base" } : null;
  }
}

