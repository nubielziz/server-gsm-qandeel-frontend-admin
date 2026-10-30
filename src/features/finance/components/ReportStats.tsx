// ReportStats: a row of key figures at the top of a report, split by hairlines (a report sits inside the page's panel, so
// it is not a panel of its own). The figures are the server's totals; nothing is added up here.
export type ReportStat = { label: string; value: string; sub?: string; className?: string };

// Full class names so Tailwind can see them; any other count falls back to four columns.
const COLUMNS: Record<number, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

export function ReportStats({ stats, label }: { stats: readonly ReportStat[]; label: string }) {
  return (
    <section
      aria-label={label}
      className={`grid grid-cols-2 border-b border-line ${COLUMNS[stats.length] ?? 'md:grid-cols-4'} [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-line md:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-line md:[&>*:nth-child(n+2)]:border-s md:[&>*:nth-child(n+2)]:border-line`}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 p-3.5">
          <p className="text-xs text-ink3">{stat.label}</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums tracking-tight ${stat.className ?? ''}`}>
            {stat.value}
          </p>
          {stat.sub && <p className="mt-0.5 truncate text-xs text-ink3">{stat.sub}</p>}
        </div>
      ))}
    </section>
  );
}
