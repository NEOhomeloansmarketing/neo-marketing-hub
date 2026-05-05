"use client";

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  dot?: string;
}

export function Chip({ active, onClick, children, dot }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition"
      style={{
        background: active ? "rgba(91,203,245,0.14)" : "#0a2540",
        border: `1px solid ${active ? "#5bcbf5" : "#1d4368"}`,
        color: active ? "#e2e8f0" : "#cbd5e1",
      }}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: dot }}
        />
      )}
      {children}
    </button>
  );
}
