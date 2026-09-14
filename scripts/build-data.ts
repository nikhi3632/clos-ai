/**
 * One-time conversion of the raw CSVs in data/ into the typed JSON the app imports.
 *
 *   npm run build:data
 *
 * Deliberately not a data-cleaning step: values are copied as-is, only the fields
 * the app reads are kept, and any structural problem (missing image, duplicate id,
 * unknown availability, unparseable number or date) fails the run instead of being
 * skipped.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import type { Availability, CatalogProduct, ClosetItem, ProductBase } from "../src/lib/types";

const ROOT = join(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "data");
const IMAGE_DIR = join(ROOT, "public", "images");
const OUT_DIR = join(ROOT, "src", "data");

const AVAILABILITY: readonly Availability[] = ["IN_STOCK", "OUT_OF_STOCK", "BACKORDER", "PREORDER"];

function isAvailability(value: string): value is Availability {
  return (AVAILABILITY as readonly string[]).includes(value);
}

type Row = Record<string, string>;

function readCsv(name: string): Row[] {
  // csv-parse rejects rows whose field count differs from the header.
  return parse(readFileSync(join(DATA_DIR, name)), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });
}

function requiredField(row: Row, key: string, label: string): string {
  const value = row[key];
  if (value === undefined || value === "") {
    throw new Error(`${label}: missing required field "${key}"`);
  }
  return value;
}

function optionalField(row: Row, key: string): string | null {
  const value = row[key];
  return value === undefined || value === "" ? null : value;
}

function numberField(row: Row, key: string, label: string): number {
  const value = Number(requiredField(row, key, label));
  if (Number.isNaN(value)) throw new Error(`${label}: "${key}" is not a number`);
  return value;
}

function dateField(row: Row, key: string, label: string): string {
  const value = requiredField(row, key, label);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${label}: "${key}" is not a date`);
  return value;
}

function baseProduct(row: Row, id: string, label: string): ProductBase {
  const imageFilename = requiredField(row, "image_filename", label);
  if (!existsSync(join(IMAGE_DIR, imageFilename))) {
    throw new Error(`${label}: image not found: ${imageFilename}`);
  }
  return {
    id,
    name: requiredField(row, "name", label),
    brand: requiredField(row, "brand", label),
    retailer: requiredField(row, "retailer", label),
    category: {
      level1: requiredField(row, "category_level_1", label),
      level2: optionalField(row, "category_level_2"),
      level3: optionalField(row, "category_level_3"),
      path: requiredField(row, "category_path", label),
    },
    description: requiredField(row, "description", label),
    colorFamily: optionalField(row, "primary_color_family"),
    colorHex: optionalField(row, "primary_hex_color"),
    colorLabel: optionalField(row, "original_color"),
    occasion: optionalField(row, "attr_occasion"),
    fabric: optionalField(row, "attr_fabric"),
    print: optionalField(row, "attr_print"),
    size: optionalField(row, "size"),
    image: `/images/${imageFilename}`,
  };
}

function assertUniqueIds(items: { id: string }[], label: string) {
  const seen = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id)) throw new Error(`${label}: duplicate id ${id}`);
    seen.add(id);
  }
}

const catalog: CatalogProduct[] = readCsv("affiliate_products.csv").map((row, i) => {
  const label = `affiliate_products.csv row ${i + 2}`;
  const availability = requiredField(row, "availability", label);
  if (!isAvailability(availability)) {
    throw new Error(`${label}: unknown availability "${availability}"`);
  }
  return {
    ...baseProduct(row, requiredField(row, "affiliate_product_id", label), label),
    priceMsrp: numberField(row, "price_msrp", label),
    priceSale: numberField(row, "price_sale", label),
    availability,
  };
});

const closet: ClosetItem[] = readCsv("products.csv").map((row, i) => {
  const label = `products.csv row ${i + 2}`;
  return {
    ...baseProduct(row, requiredField(row, "product_id", label), label),
    pricePaid: numberField(row, "price_paid", label),
    purchasedAt: dateField(row, "purchased_at", label),
  };
});

assertUniqueIds(catalog, "catalog");
assertUniqueIds(closet, "closet");

writeFileSync(join(OUT_DIR, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
writeFileSync(join(OUT_DIR, "closet.json"), JSON.stringify(closet, null, 2) + "\n");

console.log(`catalog: ${catalog.length} products -> src/data/catalog.json`);
console.log(`closet:  ${closet.length} items    -> src/data/closet.json`);
