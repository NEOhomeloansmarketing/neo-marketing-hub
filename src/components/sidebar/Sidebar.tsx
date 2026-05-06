"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import { useState } from "react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.FC<{ size?: number }>;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// SVG Icon components
const IconDashboard = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconTasks = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const IconProjects = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);
const IconCalendar = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconMeetings = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconActionItems = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconTools = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);
const IconShield = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCampaigns = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconAnalytics = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconLightbulb = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
  </svg>
);
const IconMembers = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconTeams = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="6" height="13" rx="1" /><rect x="9" y="3" width="6" height="17" rx="1" /><rect x="16" y="10" width="6" height="10" rx="1" />
  </svg>
);
const IconSettings = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const IconLogout = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconChevronDown = ({ size = 14, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const NAV_SECTIONS: NavSection[] = [
  {
    label: "General",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: IconDashboard },
      { id: "tasks", label: "My Tasks", href: "/tasks", icon: IconTasks },
      { id: "projects", label: "Projects", href: "/projects", icon: IconProjects },
      { id: "calendar", label: "Calendar", href: "/calendar", icon: IconCalendar },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "meetings", label: "Meetings", href: "/meetings", icon: IconMeetings },
      { id: "actions", label: "Action Items", href: "/actions", icon: IconActionItems },
      { id: "tools", label: "Tools & Logins", href: "/tools", icon: IconTools },
      { id: "advisors", label: "Advisor Compliance", href: "/advisors", icon: IconShield },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "campaigns", label: "Campaigns", href: "/campaigns", icon: IconCampaigns },
      { id: "analytics", label: "Analytics", href: "/analytics", icon: IconAnalytics },
      { id: "ideas", label: "Ideas", href: "/ideas", icon: IconLightbulb },
    ],
  },
  {
    label: "Team",
    items: [
      { id: "teams", label: "Teams", href: "/teams", icon: IconTeams },
      { id: "members", label: "Members", href: "/members", icon: IconMembers },
      { id: "settings", label: "Settings", href: "/settings", icon: IconSettings },
    ],
  },
];

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    role: string;
    color: string;
    initials: string;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const isActive = (item: NavItem) => pathname.startsWith(item.href);

  const initials =
    user?.initials ||
    (user?.name
      ? user.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?");

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col"
      style={{
        width: 220,
        background: "#061320",
        borderRight: "1px solid #1d4368",
      }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-2.5 px-4 shrink-0"
        style={{ borderBottom: "1px solid #1d4368" }}
      >
        <Image
          src="/neo-icon.jpg"
          alt="NEO"
          width={32}
          height={32}
          style={{
            borderRadius: 6,
            objectFit: "cover",
            boxShadow: "0 4px 14px rgba(91,203,245,0.20)",
          }}
        />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-slate-100">
            NEO Marketing
          </div>
          <div
            className="text-[10px] font-medium uppercase"
            style={{ color: "#858889", letterSpacing: "0.12em" }}
          >
            System · v1.0
          </div>
        </div>
      </div>

      {/* Workspace switcher */}
      <button
        className="mx-3 mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-white/[0.03] shrink-0"
        style={{ border: "1px solid #1d4368", background: "#0a2540" }}
      >
        <div
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-[10px] font-bold text-slate-100"
          style={{ background: "#14375a" }}
        >
          NH
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-[12px] font-semibold text-slate-100">
            Neo Workspace
          </div>
          <div className="text-[10px]" style={{ color: "#858889" }}>
            NEO Home Loans
          </div>
        </div>
        <IconChevronDown size={14} />
      </button>

      {/* Nav */}
      <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div
              className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase"
              style={{ color: "#858889", letterSpacing: "0.14em" }}
            >
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition"
                    style={{
                      backgroundColor: active
                        ? "rgba(91,203,245,0.10)"
                        : undefined,
                      color: active ? "#e2e8f0" : "#94a3b8",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(255,255,255,0.03)";
                        e.currentTarget.style.color = "#e2e8f0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "";
                        e.currentTarget.style.color = "#94a3b8";
                      }
                    }}
                  >
                    {/* Active left accent */}
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      style={{
                        background: active ? "#5bcbf5" : "transparent",
                        boxShadow: active
                          ? "0 0 12px rgba(91,203,245,0.55)"
                          : "none",
                        transition: "all 0.15s",
                      }}
                    />
                    <Icon size={16} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge != null && (
                      <span
                        className="rounded-full px-1.5 py-[1px] text-[10px] font-semibold leading-4 tabular-nums"
                        style={{
                          background: active ? "#5bcbf5" : "#14375a",
                          color: active ? "#061320" : "#cbd5e1",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="relative mx-3 mb-3 shrink-0">
        {menuOpen && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 rounded-md p-1 z-50"
            style={{
              background: "#0a2540",
              border: "1px solid #1d4368",
              boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            }}
          >
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[12px] text-left hover:bg-white/[0.04]"
              style={{ color: "#cbd5e1" }}
              onClick={() => setMenuOpen(false)}
            >
              <IconSettings size={13} /> Account settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[12px] text-left hover:bg-white/[0.04]"
              style={{ color: "#fca5a5" }}
            >
              <IconLogout size={13} /> Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition hover:bg-white/[0.03]"
          style={{ border: "1px solid #1d4368", background: "#0a2540" }}
        >
          <div className="relative">
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: user?.color ?? "#5bcbf5" }}
            >
              {initials}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
              style={{
                background: "#22c55e",
                boxShadow: "0 0 0 2px #0a2540",
              }}
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12px] font-semibold text-slate-100">
              {user?.name ?? "Team Member"}
            </div>
            <div
              className="truncate text-[10px]"
              style={{ color: "#858889" }}
            >
              {user?.role ?? "Member"}
            </div>
          </div>
          <IconChevronDown
            size={14}
            style={{
              transform: menuOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </button>
      </div>
    </aside>
  );
}
