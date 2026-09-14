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

/**
 * Small stable hash used only to break ties. Seeding it with the viewed
 * product means equally supported pieces are drawn differently on different
 * product pages instead of the same three every time, while each page stays
 * deterministic.
 */
function tieBreak(seed: string, key: string): number {
  let h = 2166136261;
  for (const ch of seed + "|" + key) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((x) => [...prefix, x])), [[]]);
}

function coherent(items: LookItem[]): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (conflicts(items[i].item, items[j].item)) return false;
    }
  }
  return true;
}

/** The piece that defines an outfit's silhouette: the bottom, or the dress. */
function silhouetteKey(look: Look): string {
  const dress = look.items.find((i) => i.slot === "dress");
  if (dress) return "dress";
  const bottom = look.items.find((i) => i.slot === "bottom");
  if (bottom) return `bottom:${bottom.item.category.level2 ?? bottom.item.category.level1}`;
  const top = look.items.find((i) => i.slot === "top");
  return top ? `top:${top.item.category.level2 ?? top.item.category.level1}` : "";
}

function itemId(look: Look, slot: Slot): string | null {
  return look.items.find((i) => i.slot === slot)?.item.id ?? null;
}

/**
 * Picks up to MAX_LOOKS from ranked looks. A different silhouette is required
 * every time; different footwear and a different top are preferred, relaxed
 * only when nothing else qualifies. Relative selection is deliberate here: a
 * second look earns its place by being different, not by being second best.
 */
function selectDiverse(ranked: Look[]): Look[] {
  const chosen: Look[] = [];
  const used = { key: new Set<string>(), footwear: new Set<string | null>(), top: new Set<string | null>() };
  const passes: (readonly ("footwear" | "top")[])[] = [["footwear", "top"], ["footwear"], []];
  for (const distinct of passes) {
    for (const look of ranked) {
      if (chosen.length >= MAX_LOOKS) break;
      const key = silhouetteKey(look);
      if (used.key.has(key)) continue;
      if (distinct.some((slot) => itemId(look, slot) !== null && used[slot].has(itemId(look, slot)))) continue;
      chosen.push(look);
      used.key.add(key);
      used.footwear.add(itemId(look, "footwear"));
      used.top.add(itemId(look, "top"));
    }
  }
  return chosen;
}

/**
 * Builds every valid outfit around the viewed product from owned pieces that
 * clear the compatibility bar, checks each outfit for internal coherence,
 * ranks by total evidence, then selects a diverse few. Bags and accessories
 * are never styled: with one closet they repeated across every look.
 */
export function buildLooks(viewed: CatalogProduct, closet: ClosetItem[]): Look[] {
  const viewedClass = classify(viewed);
  if (viewedClass === null) return [];

  const candidates = new Map<Slot, LookItem[]>();
  for (const item of closet) {
    const cls = classify(item);
    if (cls === null) continue;
    const c = compatibility(viewed, item);
    if (!passes(c)) continue;
    const list = candidates.get(cls.slot) ?? [];
    list.push({ item, slot: cls.slot, reasons: c.reasons });
    candidates.set(cls.slot, list);
  }
  const score = (li: LookItem) => compatibility(viewed, li.item).score;

  const looks: Look[] = [];
  for (const template of TEMPLATES[viewedClass.slot]) {
    const lists = template.map((slot) => candidates.get(slot) ?? []);
    if (lists.some((l) => l.length === 0)) continue;
    for (const items of cartesian(lists)) {
      if (!coherent(items)) continue;
      looks.push({ items, score: items.reduce((sum, li) => sum + score(li), 0) });
    }
  }

  const key = (look: Look) => look.items.map((i) => i.item.id).join(",");
  looks.sort((a, b) => b.score - a.score || tieBreak(viewed.id, key(a)) - tieBreak(viewed.id, key(b)));
  return selectDiverse(looks);
}
