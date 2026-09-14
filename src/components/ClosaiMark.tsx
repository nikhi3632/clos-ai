/** The small attribution that marks every Closai-powered element on the retailer page. */
export function ClosaiMark({ label = "Closai" }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-neutral-400">
      <span aria-hidden="true">✦</span>
      {label}
    </span>
  );
}
