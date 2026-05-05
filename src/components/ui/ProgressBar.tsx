interface ProgressBarProps {
  done: number;
  total: number;
}

export function ProgressBar({ done, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1 flex-1 overflow-hidden rounded-full"
        style={{ background: "#14375a" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: pct + "%",
            background: pct === 100 ? "#22c55e" : "#5bcbf5",
          }}
        />
      </div>
      <span
        className="text-[11px] font-medium tabular-nums"
        style={{ color: "#a8aaab" }}
      >
        {done}/{total}
      </span>
    </div>
  );
}
