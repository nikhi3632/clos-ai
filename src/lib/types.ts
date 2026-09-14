/**
 * Domain types shared by the data build script and the app.
 *
 * Only the fields the storefront and the Closai engine actually read are kept.
 * The raw CSVs in data/ remain the source of truth for everything else.
 */

export type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "BACKORDER" | "PREORDER";

export interface Category {
  level1: string;
  level2: string | null;
  level3: string | null;
  /** Human-readable path, e.g. "Tops > Jackets & Coats > Blazers". */
  path: string;
}

export interface ProductBase {
  id: string;
  name: string;
  brand: string;
  retailer: string;
  category: Category;
  description: string;
  /** Normalized color family, e.g. "Black", "Cream". Null when unknown. */
  colorFamily: string | null;
  /** Primary swatch hex, e.g. "#221615". Null when unknown. */
  colorHex: string | null;
  /** Retailer's own color label, e.g. "Timberwolf/White". */
  colorLabel: string | null;
  occasion: string | null;
  fabric: string | null;
  print: string | null;
  size: string | null;
  /** Public URL path of the product image, e.g. "/images/farrah-coat.jpg". */
  image: string;
}

/** An item the retailer sells. */
export interface CatalogProduct extends ProductBase {
  priceMsrp: number;
  priceSale: number;
  availability: Availability;
}

/** An item the demo shopper already owns. */
export interface ClosetItem extends ProductBase {
  pricePaid: number;
  /** ISO 8601 timestamp of the purchase. */
  purchasedAt: string;
}
