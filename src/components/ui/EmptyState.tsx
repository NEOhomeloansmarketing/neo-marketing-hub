interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

function PatternIcon() {
  return (
    <div
      className="grid h-16 w-16 place-items-center rounded-2xl"
      style={{
        background: "#0a2540",
        border: "1px solid #1d4368",
        boxShadow: "0 12px 32px -12px rgba(91,203,245,0.25)",
      }}
    >
      <div
        className="h-7 w-7 rounded-md"
        style={{
          background:
            "repeating-linear-gradient(135deg, #1d4368 0 6px, transparent 6px 12px)",
          border: "1px solid #1d4368",
        }}
      />
    </div>
  );
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center">
      <PatternIcon />
      <div className="mt-5 text-[15px] font-semibold tracking-tight text-slate-100">
        {title}
      </div>
      {description && (
        <div
          className="mt-1 max-w-sm text-[12.5px]"
          style={{ color: "#858889" }}
        >
          {description}
        </div>
      )}
      {action && (
        <div className="mt-5">
          <button
            onClick={action.onClick}
            className="rounded-md px-4 py-2 text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
