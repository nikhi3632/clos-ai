/**
 * Asks the stylist model to choose outfits for every catalog product, once, and
 * writes the result to src/data/looks.json for the site to read.
 *
 *   npm run select                 regenerate the whole file
 *   npm run select -- TIBI-9992392 print the model's answer for one product, write nothing
 *
 * Division of labour: the engine (src/lib/closai) decides the facts, which
 * owned pieces can be worn with the product and which pieces cannot be worn
 * together. The model decides taste: what makes a complete outfit, how many
 * are worth showing, and why, in a line each. Every answer is re-validated against
 * the engine's rules before it is written, and a run that cannot produce a
 * valid answer for a product fails instead of falling back.
 *
 * Needs OPENROUTER_API_KEY in .env; OPENROUTER_MODEL overrides the model.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalog, closet } from "../src/lib/data";
import { candidatePieces, outfitKey, validateOutfit } from "../src/lib/closai/looks";
import { findSimilar } from "../src/lib/closai/similarity";
import { classify } from "../src/lib/closai/slots";
import type { CatalogProduct, ProductBase } from "../src/lib/types";
import type { LookItem, StylistSelections } from "../src/lib/closai/types";

process.loadEnvFile(join(import.meta.dirname, "..", ".env"));
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) throw new Error("OPENROUTER_API_KEY is not set in .env");
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-5";
const OUT = join(import.meta.dirname, "..", "src", "data", "looks.json");
const CONCURRENCY = 4;

const SYSTEM_PROMPT = `You are a personal stylist working inside a fashion retailer's product page.
A shopper is viewing a product. You are given every piece the shopper already owns that could be worn with it, with each piece's attributes and, where the retailer's rules found one, the reason it goes with the product.

Compose the outfits a good stylist would confidently show this shopper, built from the viewed product plus owned pieces only.

Rules:
- Each outfit is complete and wearable as described: the viewed product plus whatever owned pieces it needs, and nothing it does not. Add outerwear, a bag or an accessory only when it improves the outfit.
- "pieces" lists owned pieces only, by their ids exactly as given. The viewed product is always part of the outfit; do not list it. Never invent a piece.
- Return every outfit you would confidently show, and none you would not. Different outfits must be genuinely different, not the same idea with one piece swapped. There is no target number: some products deserve one outfit, some six, some none. Do not pad.
- Order the outfits best first.
- Give each outfit a title of two to four words, the way a lookbook names a look: "The full suit", "Weekend tailoring", "Dressed-down denim". No product names in titles.
- For each outfit write one note of at most 14 plain words, addressed to the shopper, that explains why it works. Refer only to attributes you were given. No claims about fit, weather, trends, or anything you cannot see.

Respond with JSON only, in this shape:
{"outfits":[{"pieces":["<id>","<id>"],"title":"<text>","note":"<text>"}]}`;

function describe(p: ProductBase): string {
  const attrs = [p.category.path, p.colorLabel ?? p.colorFamily, p.fabric, p.print, p.occasion && `for ${p.occasion.toLowerCase()}`].filter(Boolean);
  return `${p.brand} ${p.name} (${attrs.join(", ")})`;
}

function buildPrompt(product: CatalogProduct, candidates: LookItem[]): string {
  const lines = [`Viewed product: ${describe(product)}`, "", "Owned pieces that can be worn with it:"];
  for (const li of candidates) {
    const why = li.reasons.length > 0 ? `; goes with it because: ${li.reasons.map((r) => r.label.toLowerCase()).join(", ")}` : "";
    lines.push(`- id ${li.item.id} [${li.slot}]: ${describe(li.item)}${why}`);
  }
  return lines.join("\n");
}

interface ModelAnswer {
  outfits: { pieces: string[]; title: string; note: string }[];
}

function parseAnswer(text: string): ModelAnswer {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`no JSON object in model reply: ${text.slice(0, 200)}`);
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as ModelAnswer).outfits)) {
    throw new Error(`reply is not {outfits: [...]}: ${text.slice(0, 200)}`);
  }
  for (const outfit of (parsed as ModelAnswer).outfits) {
    if (!Array.isArray(outfit.pieces) || !outfit.pieces.every((id) => typeof id === "string")) {
      throw new Error(`outfit.pieces is not a string array: ${JSON.stringify(outfit)}`);
    }
    for (const field of ["title", "note"] as const) {
      if (typeof outfit[field] !== "string" || outfit[field].trim() === "") {
        throw new Error(`outfit.${field} is missing: ${JSON.stringify(outfit)}`);
      }
    }
  }
  return parsed as ModelAnswer;
}

let totalCost = 0;

/** Retries transport failures and rate limits; a bad answer is never retried. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const transient = /fetch failed|OpenRouter (429|5\d\d)|ECONNRESET|ETIMEDOUT/.test(message);
      if (!transient || attempt === attempts) throw error;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** (attempt - 1)));
    }
  }
}

type Turn = { role: "assistant" | "user"; content: string };

async function askModel(prompt: string, followUp: Turn[] = []): Promise<{ text: string }> {
  return withRetry(() => requestModel(prompt, followUp));
}

async function requestModel(prompt: string, followUp: Turn[]): Promise<{ text: string }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 6000,
      // Keep reasoning short: the judgment here is small and the answer is a short JSON object.
      reasoning: { effort: "low" },
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }, ...followUp],
    }),
  });
  const body = (await response.json()) as {
    error?: { message: string };
    choices?: { message: { content: string }; finish_reason?: string }[];
    usage?: { cost?: number };
  };
  if (!response.ok || body.error) throw new Error(`OpenRouter ${response.status}: ${body.error?.message ?? "unknown error"}`);
  const choice = body.choices?.[0];
  if (!choice) throw new Error("OpenRouter returned no choices");
  if (choice.finish_reason === "length") throw new Error("model reply was cut off by max_tokens");
  if (typeof choice.message.content !== "string" || choice.message.content === "") {
    throw new Error("model reply had no text content");
  }
  totalCost += body.usage?.cost ?? 0;
  return { text: choice.message.content };
}

function checkProposals(candidates: LookItem[], answer: ModelAnswer) {
  const kept: { pieces: string[]; title: string; note: string }[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  for (const outfit of answer.outfits) {
    const result = validateOutfit(candidates, outfit.pieces);
    if ("error" in result) {
      rejected.push(`${outfit.pieces.join("+")}: ${result.error}`);
      continue;
    }
    const key = outfitKey(outfit.pieces);
    if (seen.has(key)) {
      rejected.push(`${outfit.pieces.join("+")}: duplicate outfit`);
      continue;
    }
    seen.add(key);
    kept.push({ pieces: outfit.pieces, title: outfit.title.trim(), note: outfit.note.trim() });
  }
  return { kept, rejected, proposed: answer.outfits.length };
}

/**
 * One product: ask, check every proposal against the facts, and if any were
 * rejected give the model one round of feedback so it can correct itself.
 * What survives the second round is final; a product where nothing survives
 * simply has no outfits, which the page renders as nothing.
 */
async function selectFor(product: CatalogProduct, candidates: LookItem[]) {
  const prompt = buildPrompt(product, candidates);
  const first = await askModel(prompt);
  let result = checkProposals(candidates, parseAnswer(first.text));
  if (result.rejected.length === 0) return { ...result, rounds: 1 };

  const feedback = [
    "Some of those outfits were rejected by the retailer's rules:",
    ...result.rejected.map((r) => `- ${r}`),
    "",
    "Return your corrected full list of outfits in the same JSON shape, keeping the ones that were fine.",
  ].join("\n");
  const second = await askModel(prompt, [
    { role: "assistant", content: first.text },
    { role: "user", content: feedback },
  ]);
  result = checkProposals(candidates, parseAnswer(second.text));
  return { ...result, rounds: 2 };
}

async function main() {
  const only = process.argv[2];
  const targets = catalog.filter((p) => {
    if (only !== undefined && p.id !== only) return false;
    if (findSimilar(p, closet) !== null || classify(p) === null) return false;
    return candidatePieces(p, closet).length > 0;
  });
  if (only !== undefined && targets.length === 0) throw new Error(`${only}: not a catalog product with compatible pieces`);
  console.log(`${targets.length} products to style with ${MODEL}`);

  const products: StylistSelections["products"] = {};
  let next = 0;
  const rejections = new Map<string, number>();
  async function worker() {
    while (next < targets.length) {
      const product = targets[next++];
      const candidates = candidatePieces(product, closet);
      const { kept, rejected, proposed, rounds } = await selectFor(product, candidates);
      for (const r of rejected) {
        const why = r.slice(r.indexOf(": ") + 2).replace(/piece \S+ is/, "piece is").replace(/^.* cannot be worn together$/, "pieces cannot be worn together");
        rejections.set(why, (rejections.get(why) ?? 0) + 1);
      }
      products[product.id] = { outfits: kept };
      const flag = rounds === 2 ? `  (corrected once; ${rejected.length} of ${proposed} still rejected)` : "";
      console.log(`${String(kept.length).padStart(2)} looks  ${product.id.padEnd(28)} ${product.name}${flag}`);
      if (only !== undefined) {
        for (const o of kept) console.log(`   ${o.title}: ${o.pieces.join(" + ")}\n   "${o.note}"`);
        for (const r of rejected) console.log(`   rejected ${r}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (only !== undefined) return;
  const selections: StylistSelections = {
    model: MODEL,
    generatedAt: new Date().toISOString(),
    products: Object.fromEntries(Object.entries(products).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(OUT, JSON.stringify(selections, null, 2) + "\n");
  console.log(`\nwrote ${Object.keys(products).length} products to src/data/looks.json; cost $${totalCost.toFixed(2)}`);
  for (const [why, n] of [...rejections.entries()].sort((a, b) => b[1] - a[1])) console.log(`  still rejected after feedback ${n}: ${why}`);
  const empty = Object.entries(products).filter(([, p]) => p.outfits.length === 0).map(([id]) => id);
  if (empty.length > 0) console.log(`  no valid outfits (page shows nothing): ${empty.join(", ")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
