"use client";

import Link from "next/link";
import { useClosai } from "./closai-context";

/** The closet is Closai's data; the link to it exists only while Closai is on. */
export function ClosetLink() {
  const { enabled } = useClosai();
  if (!enabled) return null;
  return (
    <Link href="/closet" className="whitespace-nowrap text-[11px] uppercase tracking-[0.14em] hover:underline">
      Your closet
    </Link>
  );
}
