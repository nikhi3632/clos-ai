import { catalog, FEATURED_IDS } from "@/lib/data";
import { isBrowsable } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  const featured = FEATURED_IDS.map((id) => catalog.find((p) => p.id === id)).filter((p) => p !== undefined);
  const arrivals = catalog.filter((p) => isBrowsable(p) && !FEATURED_IDS.includes(p.id));

  return (
    <div className="space-y-16 pt-10">
      <section>
        <h2 className="mb-6 text-[11px] uppercase tracking-[0.2em] text-neutral-500">Editors&apos; picks</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-6 text-[11px] uppercase tracking-[0.2em] text-neutral-500">New arrivals</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {arrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
