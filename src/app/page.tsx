import { catalog } from "@/lib/data";
import { isBrowsable } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  const products = catalog.filter(isBrowsable);
  return (
    <div className="pt-10">
      <h2 className="mb-6 text-[11px] uppercase tracking-[0.2em] text-neutral-500">New arrivals</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
