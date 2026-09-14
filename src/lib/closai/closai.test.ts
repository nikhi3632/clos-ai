/**
 * Product-spec tests for the Closai engine, run against the real demo data.
 * Each case is a behavior the PDP relies on; a change that breaks one is a
 * product regression, not just a code change.
 */
import { describe, expect, it } from "vitest";
import { catalog, closet, getProduct } from "@/lib/data";
import { styledWithCloset } from "./index";
import { fitSignal } from "./fit";
import { classify } from "./slots";

const TIBI_BLAZER = "TIBI-9992392";
const WHITE_GOLD_RING = "ZOE-CHICCO-7532027";
const ASTRO_DRESS = "STAUD-1054322";
const PUFFY_BOOTS = "GIA-BORGHINI-7416676";
const PUFFER_JACKET = "ISABEL-MARAN-4998889";
const CANDLE = "LAFCO-NEW-YO-4801007";
const SERUM = "DR-BARBARA-S-4875832";
const R13_TWEED_JACKET = "R13-2857220";
const TIBI_JEANS = "TIBI-9679470";

function product(id: string) {
  const p = getProduct(id);
  if (!p) throw new Error(`fixture missing from catalog: ${id}`);
  return p;
}

describe("Styled with your closet: Tibi blazer", () => {
  const result = styledWithCloset(product(TIBI_BLAZER), closet);

  it("returns three looks", () => {
    expect(result.state).toBe("looks");
    if (result.state !== "looks") return;
    expect(result.looks).toHaveLength(3);
  });

  it("each look is a full outfit built only from owned pieces", () => {
    if (result.state !== "looks") throw new Error("expected looks");
    for (const look of result.looks) {
      const slots = look.items.map((i) => i.slot);
      expect(slots).toContain("footwear");
      expect(slots.includes("dress") || (slots.includes("top") && slots.includes("bottom"))).toBe(true);
      for (const { item } of look.items) {
        expect(closet.some((c) => c.id === item.id)).toBe(true);
      }
    }
  });

  it("looks are distinct: no bottom category repeats", () => {
    if (result.state !== "looks") throw new Error("expected looks");
    const bottoms = result.looks.map((l) => l.items.find((i) => i.slot === "bottom" || i.slot === "dress"));
    const keys = bottoms.map((b) => (b?.slot === "dress" ? "dress" : b?.item.category.level2));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every piece carries at least two reasons drawn from the fixed vocabulary", () => {
    if (result.state !== "looks") throw new Error("expected looks");
    for (const look of result.looks) {
      for (const { reasons } of look.items) {
        expect(reasons.length).toBeGreaterThanOrEqual(2);
        for (const r of reasons) expect(r.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("never styles a work blazer with active or vacation pieces", () => {
    if (result.state !== "looks") throw new Error("expected looks");
    for (const look of result.looks) {
      for (const { item } of look.items) {
        expect(["Active", "Vacation", "Lounge"]).not.toContain(item.occasion);
      }
    }
  });

  it("is deterministic", () => {
    expect(styledWithCloset(product(TIBI_BLAZER), closet)).toEqual(result);
  });
});

describe("You already own something like this", () => {
  it("flags the white gold thin band ring against the owned gold thin band ring", () => {
    const result = styledWithCloset(product(WHITE_GOLD_RING), closet);
    expect(result.state).toBe("already-own");
    if (result.state !== "already-own") return;
    expect(result.owned.name).toBe("14k Gold Thin Band Ring");
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("flags a black cotton sundress against the owned black cotton sundress", () => {
    const result = styledWithCloset(product(ASTRO_DRESS), closet);
    expect(result.state).toBe("already-own");
    if (result.state !== "already-own") return;
    expect(result.owned.name).toBe("Addie Eyelet Flutter Sleeve Dress");
  });

  it("does not call a solid and a checkerboard the same thing", () => {
    const result = styledWithCloset(product("VINCE-0739643"), closet);
    expect(result.state).not.toBe("already-own");
  });

  it("stays selective: flags fewer than a fifth of the catalog", () => {
    const flipped = catalog.filter((p) => styledWithCloset(p, closet).state === "already-own");
    expect(flipped.length).toBeGreaterThan(5);
    expect(flipped.length).toBeLessThan(catalog.length / 5);
  });
});

describe("Season coherence", () => {
  it("never styles winter boots or a puffer with shorts or sandals", () => {
    for (const id of [PUFFY_BOOTS, PUFFER_JACKET]) {
      const result = styledWithCloset(product(id), closet);
      expect(result.state).toBe("looks");
      if (result.state !== "looks") continue;
      for (const look of result.looks) {
        for (const { item } of look.items) {
          expect(["Shorts", "Sandals", "Espadrilles"]).not.toContain(item.category.level2);
        }
      }
    }
  });
});

describe("Nothing useful: module stays absent", () => {
  it("returns none for a candle", () => {
    expect(styledWithCloset(product(CANDLE), closet).state).toBe("none");
  });

  it("returns none for a skincare serum", () => {
    expect(styledWithCloset(product(SERUM), closet).state).toBe("none");
  });
});

describe("Fit signal", () => {
  it("reports the R13 top size from two owned R13 tops", () => {
    expect(fitSignal(product(R13_TWEED_JACKET), closet)).toEqual({ size: "XS", purchases: 2, agreeing: 2 });
  });

  it("stays silent when owned sizes for the brand and category disagree", () => {
    expect(fitSignal(product(TIBI_JEANS), closet)).toBeNull();
  });
});

describe("Slot classification", () => {
  it("excludes swim, home, beauty, workout accessories and one-size 'footwear'", () => {
    const excluded = closet.filter((c) => classify(c) === null).map((c) => c.category.path);
    expect(excluded).toContain("Home");
    expect(excluded).toContain("Beauty > Skincare");
    expect(excluded).toContain("Accessories > Workout");
    expect(excluded.some((p) => p.startsWith("Tops > Swim"))).toBe(true);
    const socks = closet.find((c) => c.name.includes("Socks"));
    expect(socks && classify(socks)).toBeNull();
  });

  it("classifies outerwear and mid-layers by category", () => {
    const coat = closet.find((c) => c.name === "Camille Long Coat");
    const cardigan = closet.find((c) => c.name === "Distressed Edge Cardigan");
    const tee = closet.find((c) => c.name === "Crew Neck Tess Shirt");
    expect(coat && classify(coat)).toEqual({ slot: "outerwear", layer: "outer" });
    expect(cardigan && classify(cardigan)).toEqual({ slot: "top", layer: "mid" });
    expect(tee && classify(tee)).toEqual({ slot: "top", layer: "base" });
  });
});
