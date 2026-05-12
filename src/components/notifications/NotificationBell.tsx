"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface NotifActor {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
  actor?: NotifActor | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActorAvatar({ actor }: { actor?: NotifActor | null }) {
  const initials = actor?.initials || actor?.name?.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
      style={{ background: actor?.color ?? "#5bcbf5" }}
    >
      {initials}
    </div>
  );
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifs = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch { /* silent */ }
  };

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications([]);
  };

  const dismiss = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.06]"
        style={{ color: unreadCount > 0 ? "#5bcbf5" : "#858889", border: "1px solid #1d4368" }}
        title="Notifications"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full px-0.5 text-[9px] font-bold tabular-nums"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 flex flex-col rounded-xl overflow-hidden"
          style={{
            width: 320,
            maxHeight: "80vh",
            background: "#0b1f35",
            border: "1px solid #1d4368",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Panel header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #1d4368", background: "#0e2b48" }}
          >
            <div>
              <div className="text-[13px] font-bold text-slate-100">Notifications</div>
              {unreadCount > 0 && (
                <div className="text-[10.5px]" style={{ color: "#858889" }}>{unreadCount} unread</div>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold transition hover:underline"
                style={{ color: "#5bcbf5" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <div className="text-[24px]">🔔</div>
                <div className="text-[13px] font-semibold" style={{ color: "#858889" }}>You&apos;re all caught up</div>
                <div className="text-[11px]" style={{ color: "#5d6566" }}>Mentions and comments will appear here</div>
              </div>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    className="flex gap-3 px-4 py-3 transition hover:bg-white/[0.03] cursor-pointer"
                    style={{ borderBottom: "1px solid #0e2340", background: n.read ? "transparent" : "rgba(91,203,245,0.04)" }}
                    onClick={() => dismiss(n.id)}
                  >
                    {/* Unread dot */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                      <ActorAvatar actor={n.actor} />
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#5bcbf5" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] leading-snug" style={{ color: n.read ? "#a8aaab" : "#e2e8f0" }}>
                        {n.message}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase"
                          style={{ background: "rgba(91,203,245,0.1)", color: "#5bcbf5" }}
                        >
                          {n.type === "MENTION" ? "@mention" : n.type.toLowerCase()}
                        </span>
                        <span className="text-[10px]" style={{ color: "#5d6566" }}>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { dismiss(n.id); setOpen(false); }}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
