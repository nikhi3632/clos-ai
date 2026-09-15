# Closai × North & Main

A mock retailer storefront, Shopbop-style as the brief asks, under a fictional name, with one Closai-powered module on the product page.

Live: https://clos-ai-theta.vercel.app

## The question

Can Closai make a retailer's product page better because it knows what the shopper already owns?

Retailers know what they sell. Closai knows what the customer already has. This prototype puts that knowledge on a retailer's product page in one module, and shows a retailer what changes when it's there.

## Three signals

| On the page | What it says | Why a retailer cares |
|---|---|---|
| **Styled with your closet** | Complete outfits built from the product plus pieces the shopper already owns, each with a stylist's title and one-line note | Conversion. The biggest doubt about a $695 blazer is "will I wear it?" Outfits from the shopper's own closet answer it. |
| **Your size** | "Your R13 size is XS · based on 2 past purchases", under the size selector | Returns. Sizing drives most fashion returns, and the closet already knows the answer. |
| **You already own something like this** | The close substitute in the closet, and why it matched | Trust. Closai isn't always trying to sell. That is what makes the rest credible. |

The module has a fourth behaviour: **absence**. For a candle, a serum, or a garment the closet can't dress, it doesn't render, and the page is a normal retailer page. Closai earns the right to appear.

## What's in the demo

- One retailer, North & Main, with a Shopbop-style aesthetic: homepage, six real category pages, a product page for all 129 catalog items, and a closet page. The dataset labels the catalog retailer "Shopbop"; the site presents it under the fictional name.
- One shopper, hardcoded. The closet is their 58 purchases, most from this retailer and a few from others. Those few are the point: the retailer would never know about them on its own.
- A **Closai on/off** switch in the header. It's the retailer's before/after control, not a shopper setting.
- No login, no database, no API calls from the site. Everything is static and prerendered.

## How it works

### Facts are code, taste is the model

```
catalog + closet  ──►  rules (facts)  ──►  candidate pieces  ──►  stylist model (taste)  ──►  rules again (validate)  ──►  looks.json  ──►  page
```

**The rules** (`src/lib/closai/`) decide only things that are true or false:

- Which owned items are garments at all. Home, beauty, swim and workout gear are never styled.
- Which pieces cannot be worn with the product or with each other: clashing occasions (Active with Work), two competing prints, obviously opposite seasons (a puffer with sandals), a cardigan under a coat, two pieces on the same part of the body, a dress with a bottom.
- Whether the closet holds a close substitute: same category at every level, prints that agree, and at least two independent signals among colour, designer, name and fabric.
- The fit hint: owned sizes for the same brand and category, shown only when they agree.

Every rule that matches a piece also emits a fixed-vocabulary reason ("Same occasion", "Neutral palette", "Also Tibi", "Matching set", "Layers underneath"). Those appear under the piece on the page as evidence. They never gate anything.

**The stylist model** decides what the rules can't: what makes a complete outfit around this product, which owned pieces belong in it, how many outfits are worth showing, and why. `npm run select` sends each product's candidate pieces, with attributes and matched reasons, to the model and asks for every outfit a good stylist would confidently show, with a lookbook title and a note of at most 14 words that refers only to attributes it was given. The model cannot add a piece, and cannot use one the rules excluded.

**Validation.** Every proposed outfit is checked against the same rules before it is kept. If any are rejected the model gets one round of feedback with the reasons and returns a corrected list. What survives is written to `src/data/looks.json` and committed, with the model id and timestamp. The site reads that file. A test re-validates every committed outfit, so the file and the rules can't drift apart silently.

The committed file records which model produced it and when. `npm run looks` prints the current state of every product, and `npm run looks -- <id>` prints one product's outfits as text.

### Where the LLM is, and isn't

It is not in the site. The deployed pages never call a model. It is not in the facts: ownership, substitutes, sizing and hard conflicts are code, and would be wrong to delegate. It is in exactly one place, styling judgment, because "which of these valid combinations are good outfits" is not a rule anyone can write down. An earlier version of this prototype tried, with a formality table and weighted reasons, and produced outfits that were compatible but tasteless. The split above is the honest one: the rules guarantee nothing impossible is shown, the model is responsible for whether what's shown is good, and the page shows both the model's note and the rules' evidence.

Selection is not deterministic run to run. The page is, because the file is.

## Key decisions

- **Closet-only outfits.** The brief allows mixing retailer inventory into the looks. I didn't, because the moment retailer items appear it reads as another recommendation engine. "Here is the thing you're looking at, and here are the ways to wear it with what you own" is the distinctive Closai demonstration.
- **Already-own beats looks.** If the shopper has a close substitute, the module says so and doesn't style the product. That is the counterexample that makes the positive case credible.
- **Absence is a state.** A meaningful share of the catalog shows nothing (see `npm run looks` for the current split). No "Closai couldn't find anything" copy.
- **Static data.** The brief specifies hardcoded mock data, the dataset is tiny, and nothing writes. `scripts/build-data.ts` converts the CSVs to typed JSON once, keeps only fields the app reads, and fails loudly on a missing image, duplicate id, or bad value. It is the one seam where a real product store would plug in.
- **Nav that works or doesn't exist.** Nav labels the catalog can't back (Designers, What's New, Bags) are absent rather than linked to the homepage.

## Trade-offs and known limits

- **The data is thin in places.** Some owned items have no occasion or print recorded, and there is no season, formality or silhouette field. Rules treat missing attributes as neutral rather than guessing.
- **Season and similarity are conservative.** Only obvious season pairs conflict. Similarity requires the exact same leaf category, so a puffer and a shearling coat are never "something like this".
- **Fit is same-brand, same top-level category.** Trouser sizes never inform a blazer, so the blazer has no fit line and the R13 jacket does.
- **Variants are detected by id suffix** (`-01`, `-02`). A real catalog has a variant field.
- **The two inert buttons.** Add to Bag and Add to Wish List do nothing. A cart is out of scope.

## What I'd build next

- **"See it on".** A rendered image per look of a person wearing the outfit, generated at build time from the real piece photos with the person taken from the product photo, shown in a modal with a few views and labelled as an AI preview. Designed, not built: fidelity to the real garments is the risk, and the tile rows with real photos would stay regardless.
- **Retailer items to complete a look** when the closet can't, marked as such. The upsell path, deliberately left out of this version.
- **The full closet.** The rules and the selection script are indifferent to closet size; the model call is per product and the file is per product. A real closet mostly changes how many candidates the model sees.

## Running it

Requires Node 20.11 or later.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine and data tests against the real data
npm run typecheck
npm run lint
npm run build      # prerenders every page
```

Useful scripts:

```bash
npm run looks                  # every product's Closai state, one line each
npm run looks -- TIBI-9992392  # one product's outfits as text
npm run build:data             # regenerate src/data/*.json from data/*.csv
npm run select                 # regenerate src/data/looks.json (needs OPENROUTER_API_KEY in .env)
npm run select -- TIBI-9992392 # ask the model about one product, write nothing
```

`OPENROUTER_MODEL` in `.env` overrides the stylist model. A clone runs without any key: the selections are committed.

## Layout

```
data/                    raw CSVs and images, untouched
scripts/build-data.ts    CSV → typed JSON, fails loudly
scripts/select-looks.ts  stylist model run, validated, written once
scripts/print-looks.ts   text view of any product's result
src/data/                catalog.json, closet.json, looks.json (all committed)
src/lib/closai/          the rules: slots, conflicts, similarity, fit, validation
src/lib/closai/closai.test.ts  product-spec tests against the real data
src/app/                 homepage, /shop/[category], /products/[id], /closet
src/components/          module, fit hint, toggle, header, cards
```
