"use client";

import { useClosai } from "./closai-context";

export function ClosaiToggle() {
  const { enabled, setEnabled } = useClosai();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]"
      title="Toggle the Closai integration on this storefront"
    >
      <span className={enabled ? "text-black" : "text-neutral-400"}>Closai</span>
      <span
        className={`relative inline-block h-4 w-7 rounded-full transition-colors ${enabled ? "bg-black" : "bg-neutral-300"}`}
      >
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] ${enabled ? "left-3.5" : "left-0.5"}`} />
      </span>
      <span className="hidden min-w-6 text-neutral-500 sm:inline">{enabled ? "On" : "Off"}</span>
    </button>
  );
}
