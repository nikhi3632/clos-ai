import type { CatalogProduct } from "./types";
import { isVariant } from "./data";

/**
 * The storefront's browse categories. Each one is backed by real catalog rows;
 * labels a Shopbop-style nav shows but this catalog cannot fill (Bags, Designers, What's New)
 * are deliberately absent rather than linked to nothing.
 */
export interface ShopCategory {
  slug: string;
  label: string;
  /** Catalog top-level categories this page shows. Empty for Sale, which is price-based. */
  departments: readonly string[];
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  { slug: "clothing", label: "Clothing", departments: ["Tops", "Bottoms"] },
  { slug: "dresses", label: "Dresses", departments: ["Dresses"] },
  { slug: "shoes", label: "Shoes", departments: ["Footwear"] },
  { slug: "jewelry-accessories", label: "Jewelry & Accessories", departments: ["Jewelry", "Eyewear", "Hats", "Accessories"] },
  { slug: "home-beauty", label: "Home & Beauty", departments: ["Home", "Beauty"] },
  { slug: "sale", label: "Sale", departments: [] },
];

export function isInCategory(product: CatalogProduct, category: ShopCategory): boolean {
  if (category.slug === "sale") return product.priceSale < product.priceMsrp;
  return category.departments.includes(product.category.level1);
}

export function getShopCategory(slug: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.slug === slug);
}

/** The browse category a product's breadcrumb points to. */
export function categoryForProduct(product: CatalogProduct): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.departments.includes(product.category.level1));
}

/** What the grids show: purchasable base products, not color variants. */
export function isBrowsable(product: CatalogProduct): boolean {
  return product.availability === "IN_STOCK" && !isVariant(product.id);
}
