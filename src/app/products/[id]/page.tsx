import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { styledWithCloset } from "@/lib/closai";
import { catalog, closet, getProduct, isVariant, STORE } from "@/lib/data";
import { stylistSelections } from "@/lib/selections";
import { formatPrice } from "@/lib/format";
import { categoryForProduct } from "@/lib/shop";
import { ClosaiModule } from "@/components/ClosaiModule";
import { FitHint } from "@/components/FitHint";
import { ProductCard } from "@/components/ProductCard";

const AVAILABILITY_LABEL = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Sold out",
  BACKORDER: "Backordered",
  PREORDER: "Pre-order",
} as const;

export function generateStaticParams() {
  return catalog.map((p) => ({ id: p.id }));
}

export async function generateMetadata(props: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const product = getProduct(id);
  return { title: product ? `${product.brand} ${product.name} | ${STORE.name}` : `Not found | ${STORE.name}` };
}

export default async function ProductPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  const product = getProduct(id);
  if (!product) notFound();

  const result = styledWithCloset(product, closet, stylistSelections);
  const fit = result.state === "looks" ? result.fit : null;
  const onSale = product.priceSale < product.priceMsrp;
  const moreFromBrand = catalog.filter((p) => p.brand === product.brand && p.id !== product.id && !isVariant(p.id)).slice(0, 4);
  const shop = categoryForProduct(product);
  const crumbs = [product.category.level1, product.category.level2, product.category.level3].filter((c) => c !== null);

  return (
    <div className="pt-6">
      <nav className="mb-6 text-[11px] uppercase tracking-[0.14em] text-neutral-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {shop && (
          <>
            {" "}
            ›{" "}
            <Link href={`/shop/${shop.slug}`} className="hover:underline">
              {shop.label}
            </Link>
          </>
        )}
        {crumbs.map((c) => (
          <span key={c}>
            {" "}
            › <span>{c}</span>
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="aspect-[564/1000] w-full min-w-0 bg-neutral-100 lg:max-h-[calc(100vh-10rem)] lg:w-auto">
          <Image
            src={product.image}
            alt={product.name}
            width={564}
            height={1000}
            priority
            className="h-full w-full object-contain"
            sizes="(min-width: 1024px) 55vw, 100vw"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em]">{product.brand}</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">{product.name}</h1>
          <p className="mt-3 text-lg">
            {onSale ? (
              <>
                <span className="text-neutral-400 line-through">{formatPrice(product.priceMsrp)}</span>{" "}
                <span className="text-red-600">{formatPrice(product.priceSale)}</span>
              </>
            ) : (
              formatPrice(product.priceMsrp)
            )}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">Free shipping and returns · {AVAILABILITY_LABEL[product.availability]}</p>

          {product.colorLabel && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Color</p>
              <p className="mt-2 flex items-center gap-2 text-[13px]">
                <span className="inline-block h-5 w-5 rounded-full border border-neutral-300" style={{ backgroundColor: product.colorHex ?? "#ffffff" }} />
                {product.colorLabel}
              </p>
            </div>
          )}

          {product.size && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Brand sizing: US</p>
              <div className="mt-2 flex gap-2">
                <span className="inline-flex min-w-11 items-center justify-center border border-black px-3 py-2 text-[13px]">{product.size}</span>
              </div>
              <FitHint fit={fit} brand={product.brand} />
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button type="button" className="w-full bg-black py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800">
              Add to Bag
            </button>
            <button type="button" className="w-full border border-black py-3.5 text-[12px] uppercase tracking-[0.2em] transition-colors hover:bg-neutral-50">
              + Add to Wish List
            </button>
          </div>

          <ClosaiModule product={product} result={result} />

          <dl className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200 text-[13px]">
            <div className="py-4">
              <dt className="text-[11px] uppercase tracking-[0.14em]">Details</dt>
              <dd className="mt-2 space-y-1 text-neutral-700">
                <p>{product.description}</p>
                <ul className="list-disc pl-5">
                  {product.fabric && <li>Fabric: {product.fabric}</li>}
                  {product.print && <li>Print: {product.print}</li>}
                  {product.occasion && <li>Occasion: {product.occasion}</li>}
                  <li>Style #{product.id}</li>
                </ul>
              </dd>
            </div>
            <div className="py-4">
              <dt className="text-[11px] uppercase tracking-[0.14em]">Shipping &amp; Returns</dt>
              <dd className="mt-2 text-neutral-700">Free shipping on all orders. Free returns within 30 days.</dd>
            </div>
          </dl>
        </div>
      </div>

      {moreFromBrand.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-[11px] uppercase tracking-[0.2em] text-neutral-500">More from {product.brand}</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {moreFromBrand.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
