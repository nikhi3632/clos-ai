import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-32 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">Page not found</p>
      <h1 className="mt-3 text-2xl font-medium tracking-tight">We couldn&apos;t find that item.</h1>
      <Link href="/" className="mt-6 inline-block border-b border-black text-[12px] uppercase tracking-[0.2em]">
        Back to shopping
      </Link>
    </div>
  );
}
