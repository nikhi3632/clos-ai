"use client";

import type { ReactNode } from "react";
import { useClosai } from "./closai-context";

/** Shows the closet only while Closai is on; otherwise a one-line note, since the retailer has no closet data on its own. */
export function ClosetGate({ children }: { children: ReactNode }) {
  const { enabled } = useClosai();
  if (enabled) return <>{children}</>;
  return <p className="mt-2 text-[13px] text-neutral-700">Closai is off. Turn it on in the header to see what the shopper owns.</p>;
}
