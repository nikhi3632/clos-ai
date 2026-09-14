/**
 * Asks the stylist model to choose outfits for every catalog product, once, and
 * writes the result to src/data/looks.json for the site to read.
 *
 *   npm run select                 regenerate the whole file
 *   npm run select -- TIBI-9992392 print the model's answer for one product, write nothing
 *
 * Division of labour: the engine (src/lib/closai) decides the facts, which
 * owned pieces are compatible with the product and which slots an outfit
 * needs. The model decides taste: which of those pieces make the best two or
 * three outfits, and says why in a line. Every answer is re-validated against
 * the engine's rules before it is written, and a run that cannot produce a
 * valid answer for a product fails instead of falling back.
 *
 * Needs OPENROUTER_API_KEY in .env; OPENROUTER_MODEL overrides the model.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalog, closet } from "../src/lib/data";
import { candidatePieces, fillableTemplates, MAX_LOOKS, silhouetteKey, validateOutfit, type Candidates } from "../src/lib/closai/looks";
import { findSimilar } from "../src/lib/closai/similarity";
import type { CatalogProduct, ProductBase } from "../src/lib/types";
import type { StylistSelections } from "../src/lib/closai/types";

process.loadEnvFile(join(import.meta.dirname, "..", ".env"));
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) throw new Error("OPENROUTER_API_KEY is not set in .env");
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-opus-5";
const PROMPT_VERSION = 1;
const OUT = join(import.meta.dirname, "..", "src", "data", "looks.json");
const CONCURRENCY = 4;

const SYSTEM_PROMPT = `You are a personal stylist working inside a fashion retailer's product page.
A shopper is viewing a product. You are given pieces the shopper already owns that are compatible with it, grouped by outfit slot, with each piece's attributes and the reasons it was judged compatible.

Compose the outfits a good stylist would confidently show this shopper, using only the listed pieces.

Rules:
- An outfit is the viewed product plus exactly one piece for each slot of one of the allowed slot sets. Use piece ids exactly as given.
- Outfits must be genuinely different from one another. No two outfits may use bottoms from the same category (pants, jeans, shorts, skirts count as categories; two pairs of pants is a repeat), and a dress counts as its own category. Vary tops and shoes too wherever the pieces allow.
- Rank the best outfit first. Return up to ${MAX_LOOKS}. If fewer are convincing, return fewer; if none are, return an empty list. Do not pad.
- For each outfit write one note of at most 14 plain words, addressed to the shopper, that explains why it works. Refer only to attributes you were given. No claims about fit, weather, trends, or anything you cannot see.

Respond with JSON only, in this shape:
{"outfits":[{"pieces":["<id>","<id>"],"note":"<text>"}]}`;

function describe(p: ProductBase): string {
  const attrs = [p.category.path, p.colorLabel ?? p.colorFamily, p.fabric, p.print, p.occasion && `for ${p.occasion.toLowerCase()}`].filter(Boolean);
  return `${p.brand} ${p.name} (${attrs.join(", ")})`;
}

function buildPrompt(product: CatalogProduct, candidates: Candidates): string {
  const lines = [`Viewed product: ${describe(product)}`, ""];
  lines.push("Allowed slot sets:");
  for (const template of fillableTemplates(product, candidates)) lines.push(`- ${template.join(" + ")}`);
  lines.push("", "Compatible owned pieces:");
  for (const [slot, items] of candidates) {
    lines.push(`${slot}:`);
    for (const li of items) {
      lines.push(`- id ${li.item.id}: ${describe(li.item)}; compatible because: ${li.reasons.map((r) => r.label.toLowerCase()).join(", ")}`);
    }
  }
  return lines.join("\n");
}

interface ModelAnswer {
  outfits: { pieces: string[]; note: string }[];
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
    if (typeof outfit.note !== "string" || outfit.note.trim() === "") {
      throw new Error(`outfit.note is missing: ${JSON.stringify(outfit)}`);
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

async function askModel(prompt: string): Promise<{ text: string }> {
  return withRetry(() => requestModel(prompt));
}

async function requestModel(prompt: string): Promise<{ text: string }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 4000,
      // Keep reasoning short: the judgment here is small and the answer is a short JSON object.
      reasoning: { effort: "low" },
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
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

/** One product: ask, validate, keep the first MAX_LOOKS valid outfits with distinct silhouettes. */
async function selectFor(product: CatalogProduct, candidates: Candidates) {
  const { text } = await askModel(buildPrompt(product, candidates));
  const answer = parseAnswer(text);
  const kept: { pieces: string[]; note: string }[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  for (const outfit of answer.outfits) {
    const result = validateOutfit(product, candidates, outfit.pieces);
    if ("error" in result) {
      rejected.push(`${outfit.pieces.join("+")}: ${result.error}`);
      continue;
    }
    const key = silhouetteKey(result.items);
    if (seen.has(key)) {
      rejected.push(`${outfit.pieces.join("+")}: repeats silhouette ${key}`);
      continue;
    }
    seen.add(key);
    kept.push({ pieces: outfit.pieces, note: outfit.note.trim() });
    if (kept.length === MAX_LOOKS) break;
  }
  if (kept.length === 0 && answer.outfits.length > 0) {
    throw new Error(`${product.id}: every proposed outfit was rejected:\n  ${rejected.join("\n  ")}`);
  }
  return { kept, rejected, proposed: answer.outfits.length };
}

async function main() {
  const only = process.argv[2];
  const targets = catalog.filter((p) => {
    if (only !== undefined && p.id !== only) return false;
    if (findSimilar(p, closet) !== null) return false;
    return fillableTemplates(p, candidatePieces(p, closet)).length > 0;
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
      const { kept, rejected, proposed } = await selectFor(product, candidates);
      for (const r of rejected) {
        const why = r.slice(r.indexOf(": ") + 2).replace(/piece \S+ is/, "piece is").replace(/silhouette .*/, "silhouette");
        rejections.set(why, (rejections.get(why) ?? 0) + 1);
      }
      products[product.id] = { outfits: kept };
      const flag = rejected.length > 0 ? `  (rejected ${rejected.length} of ${proposed})` : "";
      console.log(`${String(kept.length).padStart(2)} looks  ${product.id.padEnd(28)} ${product.name}${flag}`);
      if (only !== undefined) {
        for (const o of kept) console.log(`   ${o.pieces.join(" + ")}\n   "${o.note}"`);
        for (const r of rejected) console.log(`   rejected ${r}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (only !== undefined) return;
  const selections: StylistSelections = {
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    products: Object.fromEntries(Object.entries(products).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(OUT, JSON.stringify(selections, null, 2) + "\n");
  console.log(`\nwrote ${Object.keys(products).length} products to src/data/looks.json; cost $${totalCost.toFixed(2)}`);
  for (const [why, n] of [...rejections.entries()].sort((a, b) => b[1] - a[1])) console.log(`  rejected ${n}: ${why}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
