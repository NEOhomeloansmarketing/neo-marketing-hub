interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "green" | "indigo" | "danger";
  span?: 3 | 4 | 6 | 12;
}

const SPAN_CLASS: Record<number, string> = {
  3: "col-span-12 md:col-span-3",
  4: "col-span-12 md:col-span-4",
  6: "col-span-12 md:col-span-6",
  12: "col-span-12",
};

export function StatCard({ label, value, delta, tone = "default", span = 3 }: StatCardProps) {
  const deltaColor =
    tone === "green"
      ? "#86efac"
      : tone === "indigo"
        ? "#5bcbf5"
        : tone === "danger"
          ? "#fca5a5"
          : "#a8aaab";

  return (
    <div
      className={(SPAN_CLASS[span] || SPAN_CLASS[3]) + " rounded-lg p-4"}
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase"
        style={{ color: "#858889", letterSpacing: "0.12em" }}
      >
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-[24px] font-semibold tracking-tight tabular-nums text-slate-100">
          {value}
        </div>
        {delta && (
          <div className="text-[11px] font-medium" style={{ color: deltaColor }}>
            {delta}
          </div>
        )}
      </div>
    </div>
  );
}
