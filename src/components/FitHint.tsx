"use client";

import type { FitSignal } from "@/lib/closai";
import { useClosai } from "./closai-context";
import { ClosaiMark } from "./ClosaiMark";

/** Sits under the size selector: what size the shopper has bought from this brand before. */
export function FitHint({ fit, brand }: { fit: FitSignal | null; brand: string }) {
  const { enabled } = useClosai();
  if (!enabled || fit === null) return null;
  const basis =
    fit.agreeing === fit.purchases
      ? `based on ${fit.purchases} past ${fit.purchases === 1 ? "purchase" : "purchases"}`
      : `${fit.agreeing} of ${fit.purchases} past purchases`;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-neutral-700">
      <span>
        <span className="font-semibold">
          Your {brand} size is {fit.size}
        </span>
        <span className="text-neutral-500"> · {basis}</span>
      </span>
      <ClosaiMark />
    </p>
  );
}
