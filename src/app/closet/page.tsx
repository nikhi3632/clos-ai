import Image from "next/image";
import { closet } from "@/lib/data";
import { formatPurchaseDate } from "@/lib/format";

export default function ClosetPage() {
  const items = [...closet].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  return (
    <div className="pt-10">
      <h1 className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Your closet</h1>
      <p className="mt-2 text-[13px] text-neutral-700">
        {items.length} pieces you have bought across Shopbop, Bergdorf Goodman and Nordstrom. This is what Closai knows about you.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <figure key={item.id}>
            <div className="aspect-[564/1000] overflow-hidden bg-neutral-100">
              <Image src={item.image} alt={item.name} width={564} height={1000} className="h-full w-full object-cover" sizes="(min-width: 1024px) 16vw, 50vw" />
            </div>
            <figcaption className="mt-2 space-y-0.5 text-[12px] leading-snug">
              <p className="font-semibold">{item.brand}</p>
              <p className="text-neutral-700">{item.name}</p>
              <p className="text-neutral-400">
                {formatPurchaseDate(item.purchasedAt)} · {item.retailer}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
