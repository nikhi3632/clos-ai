/**
 * Prints what Closai would say about a catalog product, as text.
 *
 *   npm run looks -- TIBI-9992392
 *   npm run looks            (summary of every catalog product)
 */
import { catalog, closet, getProduct } from "../src/lib/data";
import { styledWithCloset } from "../src/lib/closai";

const id = process.argv[2];

if (id === undefined) {
  const counts = { looks: 0, "already-own": 0, none: 0 };
  for (const p of catalog) {
    const r = styledWithCloset(p, closet);
    counts[r.state]++;
    const detail = r.state === "looks" ? `${r.looks.length} looks` : r.state === "already-own" ? `own: ${r.owned.name}` : "";
    console.log(`${r.state.padEnd(12)} ${p.id.padEnd(28)} ${p.name}  ${detail}`);
  }
  console.log(`\n${counts.looks} looks, ${counts["already-own"]} already-own, ${counts.none} none of ${catalog.length}`);
} else {
  const product = getProduct(id);
  if (!product) throw new Error(`no catalog product with id ${id}`);
  const line = (p: { name: string; brand: string; category: { path: string }; colorFamily: string | null; occasion: string | null }) =>
    `${p.brand} ${p.name}  [${p.category.path} · ${p.colorFamily ?? "?"} · ${p.occasion ?? "?"}]`;
  console.log(`VIEWING  ${line(product)}\n`);
  const r = styledWithCloset(product, closet);
  if (r.state === "none") console.log("→ none (module absent)");
  if (r.state === "already-own") {
    console.log(`→ already own: ${line(r.owned)}`);
    console.log(`  ${r.reasons.map((x) => x.label).join(" · ")}`);
  }
  if (r.state === "looks") {
    console.log(`→ ${r.looks.length} ways to wear it with what you own`);
    if (r.fit) console.log(`  fit: your ${product.brand} size is ${r.fit.size} · based on ${r.fit.purchases} purchase(s)`);
    r.looks.forEach((look, i) => {
      console.log(`\n  Look ${i + 1}  (score ${look.score})`);
      for (const li of look.items) {
        console.log(`    ${li.slot.padEnd(10)} ${line(li.item)}`);
        console.log(`    ${"".padEnd(10)} ${li.reasons.map((x) => x.label).join(" · ")}`);
      }
    });
  }
}
