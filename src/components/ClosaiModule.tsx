"use client";

import Image from "next/image";
import Link from "next/link";
import type { ClosaiResult, Look, LookItem, Reason } from "@/lib/closai";
import type { CatalogProduct, ClosetItem } from "@/lib/types";
import { useClosai } from "./closai-context";
import { ClosaiMark } from "./ClosaiMark";

/**
 * The one Closai surface on the PDP. The engine decided what there is to say;
 * this component only presents it. When the engine said "none", or the
 * retailer switched Closai off, the page is a normal retailer page.
 */
export function ClosaiModule({ product, result }: { product: CatalogProduct; result: ClosaiResult }) {
  const { enabled } = useClosai();
  if (!enabled || result.state === "none") return null;

  return (
    <section className="mt-10 border-t border-neutral-200 pt-8" aria-label="Closai">
      {result.state === "looks" ? <Looks product={product} looks={result.looks} /> : <AlreadyOwn owned={result.owned} reasons={result.reasons} />}
    </section>
  );
}

function ModuleHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-[13px] text-neutral-600">{subtitle}</p>
      </div>
      <ClosaiMark label="Powered by Closai" />
    </div>
  );
}

function Looks({ product, looks }: { product: CatalogProduct; looks: Look[] }) {
  const n = looks.length;
  return (
    <>
      <ModuleHeading
        title="Styled with your closet"
        subtitle={`${n} ${n === 1 ? "way" : "ways"} to wear it with what you already own`}
      />
      <ol className="space-y-8">
        {looks.map((look, i) => (
          <li key={i}>
            <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Look {i + 1}</p>
            <p className="mb-3 text-[14px] leading-snug">{look.note}</p>
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
              <Tile image={product.image} brand={product.brand} name={product.name} tag="This item" emphasis />
              {look.items.map((li) => (
                <OwnedTile key={li.item.id} lookItem={li} />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[12px] text-neutral-500">
        Every piece comes from{" "}
        <Link href="/closet" className="underline">
          your closet
        </Link>
        . Under each piece: the rules that matched it.
      </p>
    </>
  );
}

function AlreadyOwn({ owned, reasons }: { owned: ClosetItem; reasons: Reason[] }) {
  return (
    <>
      <ModuleHeading title="You already own something like this" subtitle="A close match is in your closet." />
      <div className="flex gap-3 md:grid md:grid-cols-4">
        <Tile image={owned.image} brand={owned.brand} name={owned.name} tag="In your closet" reasons={reasons} />
      </div>
      <p className="mt-6 text-[12px] text-neutral-500">
        Closai flags this so you can decide with the full picture. See{" "}
        <Link href="/closet" className="underline">
          your closet
        </Link>
        .
      </p>
    </>
  );
}

function OwnedTile({ lookItem }: { lookItem: LookItem }) {
  return <Tile image={lookItem.item.image} brand={lookItem.item.brand} name={lookItem.item.name} tag="In your closet" reasons={lookItem.reasons} />;
}

function Tile({
  image,
  brand,
  name,
  tag,
  reasons,
  emphasis = false,
}: {
  image: string;
  brand: string;
  name: string;
  tag: string;
  reasons?: Reason[];
  emphasis?: boolean;
}) {
  return (
    <figure className="w-32 shrink-0 md:w-auto md:min-w-0">
      <div className={`aspect-[564/1000] overflow-hidden bg-neutral-100 ${emphasis ? "ring-1 ring-black ring-offset-2" : ""}`}>
        <Image src={image} alt={name} width={564} height={1000} className="h-full w-full object-cover" sizes="(min-width: 768px) 12vw, 128px" />
      </div>
      <figcaption className="mt-2 space-y-0.5 text-[12px] leading-snug">
        <p className={`text-[10px] uppercase tracking-[0.14em] ${emphasis ? "text-black" : "text-neutral-400"}`}>{tag}</p>
        <p className="font-semibold">{brand}</p>
        <p className="text-neutral-700">{name}</p>
        {reasons && reasons.length > 0 && (
          <p className="pt-1 text-[11px] text-neutral-500">{reasons.slice(0, 3).map((r) => r.label).join(" · ")}</p>
        )}
      </figcaption>
    </figure>
  );
}
