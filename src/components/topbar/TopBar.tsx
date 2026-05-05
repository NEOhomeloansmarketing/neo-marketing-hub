"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function IconSearch({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconBell({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconHelp({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

interface TopBarProps {
  title: string;
  subtitle?: string;
  primaryAction?: string;
  primaryActionHref?: string;
  onPrimaryAction?: () => void;
}

export function TopBar({ title, subtitle, primaryAction = "+ New", primaryActionHref, onPrimaryAction }: TopBarProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
      {/* Title */}
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

      {/* Search */}
      <div
        className="hidden items-center gap-2 rounded-md px-2.5 py-1.5 md:flex cursor-text"
        style={{
          width: 260,
          background: "#0a2540",
          border: `1px solid ${searchOpen ? "#5bcbf5" : "#1d4368"}`,
          transition: "border-color 0.15s",
        }}
        onClick={() => {
          setSearchOpen(true);
          setTimeout(() => searchRef.current?.focus(), 50);
        }}
      >
        <span style={{ color: "#858889" }}>
          <IconSearch size={14} />
        </span>
        <input
          ref={searchRef}
          placeholder="Search projects, meetings, tools…"
          className="w-full bg-transparent text-[12px] outline-none"
          style={{ color: "#e2e8f0", caretColor: "#5bcbf5" }}
          onBlur={() => setSearchOpen(false)}
        />
        <kbd
          className="rounded px-1 py-[1px] text-[10px] font-medium"
          style={{
            background: "#14375a",
            color: "#a8aaab",
            border: "1px solid #1d4368",
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Help */}
      <button
        className="hidden lg:grid h-8 w-8 place-items-center rounded-md transition hover:bg-white/[0.04]"
        style={{ color: "#858889" }}
        title="Help"
      >
        <IconHelp size={15} />
      </button>

      {/* Notifications */}
      <button
        className="relative grid h-8 w-8 place-items-center rounded-md transition hover:bg-white/[0.04]"
        style={{ color: "#858889" }}
        aria-label="Notifications"
      >
        <IconBell size={15} />
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
          style={{ background: "#5bcbf5", boxShadow: "0 0 0 2px #061320" }}
        />
      </button>

      {/* Primary action */}
      <button
        onClick={() => {
          if (onPrimaryAction) onPrimaryAction();
          else if (primaryActionHref) router.push(primaryActionHref);
        }}
        className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
        style={{
          background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
          boxShadow: "0 4px 14px rgba(91,203,245,0.30)",
        }}
      >
        <IconPlus size={13} /> {primaryAction}
      </button>
    </header>
  );
}
