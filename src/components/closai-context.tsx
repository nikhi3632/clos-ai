"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ClosaiState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const ClosaiContext = createContext<ClosaiState | null>(null);

/**
 * Whether the Closai integration is switched on for this storefront. This is
 * the retailer's before/after control, not a shopper setting. It lives in the
 * root layout, so it survives navigation between pages.
 */
export function ClosaiProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  return <ClosaiContext.Provider value={{ enabled, setEnabled }}>{children}</ClosaiContext.Provider>;
}

export function useClosai(): ClosaiState {
  const ctx = useContext(ClosaiContext);
  if (ctx === null) throw new Error("useClosai must be used inside ClosaiProvider");
  return ctx;
}
