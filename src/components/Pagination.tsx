import Link from "next/link";

export default function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) params.set(k, v);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 text-sm ${page === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}
      >
        Prev
      </Link>
      {pages.map((p, idx) => (
        <span key={p} className="flex items-center gap-2">
          {idx > 0 && pages[idx - 1] !== p - 1 && <span className="text-slate-400">...</span>}
          <Link
            href={hrefFor(p)}
            className={`rounded-lg px-3 py-1.5 text-sm ${p === page ? "bg-violet-700 text-white" : "border border-slate-300 hover:bg-slate-100"}`}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 text-sm ${page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}
      >
        Next
      </Link>
    </div>
  );
}
