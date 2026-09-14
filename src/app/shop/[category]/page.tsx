import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog } from "@/lib/data";
import { getShopCategory, isBrowsable, isInCategory, SHOP_CATEGORIES } from "@/lib/shop";
import { ProductCard } from "@/components/ProductCard";

export function generateStaticParams() {
  return SHOP_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  const shop = getShopCategory(category);
  return { title: shop ? `${shop.label} | Shopbop` : "Not found | Shopbop" };
}

export default async function ShopCategoryPage(props: PageProps<"/shop/[category]">) {
  const { category } = await props.params;
  const shop = getShopCategory(category);
  if (!shop) notFound();

  const products = catalog.filter((p) => isBrowsable(p) && isInCategory(p, shop));

  return (
    <div className="pt-10">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{shop.label}</h1>
        <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
          {products.length} {products.length === 1 ? "item" : "items"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
