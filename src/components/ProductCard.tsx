import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const onSale = product.priceSale < product.priceMsrp;
  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="aspect-[564/1000] w-full overflow-hidden bg-neutral-100">
        <Image
          src={product.image}
          alt={product.name}
          width={564}
          height={1000}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
      </div>
      <div className="mt-3 space-y-0.5 text-[13px] leading-snug">
        <p className="font-semibold">{product.brand}</p>
        <p className="text-neutral-700 group-hover:underline">{product.name}</p>
        <p>
          {onSale ? (
            <>
              <span className="text-neutral-400 line-through">{formatPrice(product.priceMsrp)}</span>{" "}
              <span className="text-red-600">{formatPrice(product.priceSale)}</span>
            </>
          ) : (
            formatPrice(product.priceMsrp)
          )}
        </p>
      </div>
    </Link>
  );
}
