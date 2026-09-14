import Link from "next/link";
import { ClosaiToggle } from "./ClosaiToggle";

const NAV = ["What's New", "Designers", "Clothing", "Dresses", "Shoes", "Bags", "Jewelry & Accessories", "Sale"];

export function Header() {
  return (
    <header className="border-b border-neutral-200">
      <div className="bg-black py-1.5 text-center text-[11px] tracking-wide text-white">
        Free shipping and free returns on every order
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-[0.2em] sm:text-2xl sm:tracking-[0.3em]">
          SHOPBOP
        </Link>
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <Link href="/closet" className="whitespace-nowrap text-[11px] uppercase tracking-[0.14em] hover:underline">
            Your closet
          </Link>
          <ClosaiToggle />
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-7 overflow-x-auto whitespace-nowrap px-6 pb-4 text-[11px] uppercase tracking-[0.14em]">
        {NAV.map((label) => (
          <Link key={label} href="/" className={label === "Sale" ? "text-red-600" : "hover:underline"}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
