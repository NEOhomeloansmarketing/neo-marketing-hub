"use client";

import { NotificationBell } from "@/components/notifications/NotificationBell";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex h-14 items-center gap-4 px-6"
      style={{
        background: "rgba(6,19,32,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid #1d4368",
      }}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[18px] font-semibold leading-tight tracking-tight text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11.5px]" style={{ color: "#858889" }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right-side actions */}
      <div className="flex shrink-0 items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
