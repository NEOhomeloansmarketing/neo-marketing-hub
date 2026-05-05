"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { Chip } from "@/components/ui/Chip";
import { Drawer, DrawerCloseButton } from "@/components/ui/Drawer";

interface AdvisorChannel {
  id: string;
  platform: string;
  url: string;
  label?: string | null;
}

interface Advisor {
  id: string;
  name: string;
  nmlsNumber: string;
  brand?: string | null;
  leader?: string | null;
  city?: string | null;
  state?: string | null;
  color: string;
  initials: string;
  auditFormUrl?: string | null;
  matrixUrl?: string | null;
  canvaUrl?: string | null;
  socialToolUrl?: string | null;
  status: string;
  channels: AdvisorChannel[];
  openIssues: number;
}

interface AdvisorTableProps {
  advisors: Advisor[];
  leaders: string[];
}

const CHANNEL_DEFS = [
  { key: "FACEBOOK", label: "FB", full: "Facebook", color: "#818cf8" },
  { key: "INSTAGRAM", label: "IG", full: "Instagram", color: "#f472b6" },
  { key: "LINKEDIN", label: "in", full: "LinkedIn", color: "#60a5fa" },
  { key: "TIKTOK", label: "TT", full: "TikTok", color: "#ec4899" },
  { key: "YOUTUBE", label: "YT", full: "YouTube", color: "#ef4444" },
  { key: "GOOGLE_BUSINESS", label: "GB", full: "Google Business", color: "#fbbf24" },
  { key: "X", label: "X", full: "X / Twitter", color: "#cbd5e1" },
  { key: "THREADS", label: "Th", full: "Threads", color: "#a3a3a3" },
];

function ChannelChip({ def, channel }: { def: (typeof CHANNEL_DEFS)[0]; channel?: AdvisorChannel }) {
  const present = !!channel;
  return (
    <a
      href={present ? channel.url : undefined}
      target={present ? "_blank" : undefined}
      rel="noopener"
      title={present ? `${def.full} · ${channel.label ?? channel.url}` : `${def.full} · not set`}
      onClick={(e) => { if (!present) e.preventDefault(); e.stopPropagation(); }}
      className="grid place-items-center rounded font-bold transition"
      style={{
        width: 22,
        height: 22,
        fontSize: 10,
        background: present ? def.color + "22" : "#0a2540",
        color: present ? def.color : "#5d6566",
        border: `1px solid ${present ? def.color + "44" : "#1d4368"}`,
        cursor: present ? "pointer" : "default",
      }}
    >
      {def.label}
    </a>
  );
}

function CheckCell({ checked, label }: { checked: boolean; label?: string }) {
  return (
    <span
      className="grid h-5 w-5 place-items-center rounded"
      title={label}
      style={{
        background: checked ? "#22c55e22" : "#0a2540",
        border: `1px solid ${checked ? "#22c55e44" : "#1d4368"}`,
        color: checked ? "#86efac" : "#5d6566",
      }}
    >
      {checked && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

function AdvisorDrawerContent({ advisor, onClose }: { advisor: Advisor; onClose: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Avatar name={advisor.name} color={advisor.color} initials={advisor.initials} size={48} />
          <div>
            <div className="text-[18px] font-semibold tracking-tight text-slate-100">
              {advisor.name}
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: "#a8aaab" }}>
              {advisor.brand} · {advisor.city}, {advisor.state}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className="rounded-full px-2 py-[3px] text-[10.5px] font-medium font-mono"
                style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}
              >
                NMLS {advisor.nmlsNumber}
              </span>
              {advisor.leader && (
                <span
                  className="rounded-full px-2 py-[3px] text-[10.5px] font-medium"
                  style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}
                >
                  Lead: {advisor.leader}
                </span>
              )}
            </div>
          </div>
        </div>
        <DrawerCloseButton onClose={onClose} />
      </div>

      {/* Onboarding checklist */}
      <div
        className="mt-5 rounded-lg p-4"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <div
          className="mb-3 text-[11px] font-semibold uppercase"
          style={{ color: "#858889", letterSpacing: "0.12em" }}
        >
          Onboarding checklist
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Audit Form", checked: !!advisor.auditFormUrl },
            { label: "Matrix", checked: !!advisor.matrixUrl },
            { label: "Canva", checked: !!advisor.canvaUrl },
            { label: "Social Tool", checked: !!advisor.socialToolUrl },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg p-3"
              style={{
                background: "#0e2b48",
                border: `1px solid ${item.checked ? "#22c55e44" : "#1d4368"}`,
              }}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-md"
                style={{
                  background: item.checked ? "#22c55e1f" : "#14375a",
                  color: item.checked ? "#86efac" : "#5d6566",
                  border: `1px solid ${item.checked ? "#22c55e44" : "#1d4368"}`,
                }}
              >
                {item.checked ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="text-[10px]">—</span>
                )}
              </span>
              <div>
                <div className="text-[12.5px] font-semibold text-slate-100">{item.label}</div>
                <div className="text-[10.5px]" style={{ color: item.checked ? "#86efac" : "#858889" }}>
                  {item.checked ? "Has access" : "Not set up"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social channels */}
      <div
        className="mt-5 rounded-lg p-4"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <div
          className="mb-3 text-[11px] font-semibold uppercase"
          style={{ color: "#858889", letterSpacing: "0.12em" }}
        >
          Social channels
        </div>
        <div className="space-y-1.5">
          {CHANNEL_DEFS.map((def) => {
            const ch = advisor.channels.find((c) => c.platform === def.key);
            return (
              <div
                key={def.key}
                className="flex items-center gap-3 rounded-md px-2.5 py-2"
                style={{ background: "#0a2540", border: "1px solid #1d4368" }}
              >
                <span
                  className="grid place-items-center rounded font-bold shrink-0"
                  style={{
                    width: 26, height: 26, fontSize: 11,
                    background: ch ? def.color + "22" : "#14375a",
                    color: ch ? def.color : "#5d6566",
                    border: `1px solid ${ch ? def.color + "44" : "#1d4368"}`,
                  }}
                >
                  {def.label}
                </span>
                <span className="w-32 shrink-0 text-[12px] font-medium text-slate-200">
                  {def.full}
                </span>
                {ch ? (
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener"
                    className="flex flex-1 min-w-0 items-center gap-1.5 truncate text-[12px] hover:underline"
                    style={{ color: "#5bcbf5" }}
                  >
                    <span className="truncate">{ch.label ?? ch.url}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ) : (
                  <span className="flex-1 text-[12px]" style={{ color: "#5d6566" }}>
                    — not set —
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-5 rounded-md p-3 text-[11.5px] leading-relaxed"
        style={{
          background: "rgba(91,203,245,0.06)",
          border: "1px solid rgba(91,203,245,0.25)",
          color: "#cbd5e1",
        }}
      >
        <span className="font-semibold text-slate-100">Tip:</span> Use the Audit Form column to
        attach the most recent compliance review for this advisor.
      </div>
    </>
  );
}

export function AdvisorTable({ advisors, leaders }: AdvisorTableProps) {
  const [leaderFilter, setLeaderFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = advisors.filter((a) => {
    if (leaderFilter !== "all" && a.leader !== leaderFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !(a.name + a.brand + a.nmlsNumber + a.city + a.state)
          .toLowerCase()
          .includes(q)
      )
        return false;
    }
    return true;
  });

  const openAdvisor = advisors.find((a) => a.id === openId) ?? null;

  const totalSocials = advisors.reduce(
    (s, a) => s + a.channels.filter((c) => CHANNEL_DEFS.some((d) => d.key === c.platform)).length,
    0
  );
  const totalWebsites = advisors.reduce(
    (s, a) => s + a.channels.filter((c) => c.platform === "WEBSITE").length,
    0
  );
  const missingAudit = advisors.filter((a) => !a.auditFormUrl).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Advisors" value={String(advisors.length)} delta="across divisions" />
        <StatCard span={3} label="Websites tracked" value={String(totalWebsites)} delta="incl. microsites" tone="indigo" />
        <StatCard span={3} label="Social accounts" value={String(totalSocials)} delta="8 channels" />
        <StatCard
          span={3}
          label="Missing audit form"
          value={String(missingAudit)}
          delta={missingAudit === 0 ? "All complete" : "Pending review"}
          tone={missingAudit === 0 ? "green" : "default"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={leaderFilter === "all"} onClick={() => setLeaderFilter("all")}>
          All divisions
        </Chip>
        {leaders.map((l) => (
          <Chip key={l} active={leaderFilter === l} onClick={() => setLeaderFilter(l)}>
            {l}
          </Chip>
        ))}
        <div
          className="ml-auto flex h-9 items-center gap-2 rounded-md px-2.5"
          style={{ background: "#0a2540", border: "1px solid #1d4368", width: 280 }}
        >
          <span style={{ color: "#858889" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, brand, NMLS, city…"
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
            style={{ color: "#e2e8f0" }}
          />
        </div>
      </div>

      {/* Directory table */}
      <div
        className="overflow-x-auto rounded-lg"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <div style={{ minWidth: 900 }}>
          <div
            className="grid items-center gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase"
            style={{
              gridTemplateColumns: "1.4fr 1.2fr 0.8fr 0.9fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 1.6fr 24px",
              borderBottom: "1px solid #1d4368",
              color: "#858889",
              background: "#0a2540",
              letterSpacing: "0.1em",
            }}
          >
            <div>Name</div>
            <div>Brand</div>
            <div>NMLS #</div>
            <div>Division Lead</div>
            <div>Location</div>
            <div className="text-center">Audit</div>
            <div className="text-center">Matrix</div>
            <div className="text-center">Canva</div>
            <div className="text-center">Social Tool</div>
            <div>Social Channels</div>
            <div />
          </div>

          {filtered.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setOpenId(a.id)}
              className="grid w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: "1.4fr 1.2fr 0.8fr 0.9fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 1.6fr 24px",
                borderBottom: i === filtered.length - 1 ? "none" : "1px solid #1d4368",
                display: "grid",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={a.name} color={a.color} initials={a.initials} size={28} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-slate-100">
                    {a.name}
                  </div>
                </div>
              </div>
              <div className="truncate text-[12px]" style={{ color: "#cbd5e1" }}>
                {a.brand ?? "—"}
              </div>
              <div
                className="font-mono text-[11.5px] tabular-nums"
                style={{ color: "#a8aaab" }}
              >
                {a.nmlsNumber}
              </div>
              <div className="truncate text-[12px]" style={{ color: "#cbd5e1" }}>
                {a.leader ?? "—"}
              </div>
              <div className="truncate text-[11.5px]" style={{ color: "#a8aaab" }}>
                {a.city && a.state ? `${a.city}, ${a.state}` : "—"}
              </div>
              <div className="flex justify-center">
                <CheckCell checked={!!a.auditFormUrl} label="Audit Form" />
              </div>
              <div className="flex justify-center">
                <CheckCell checked={!!a.matrixUrl} label="Matrix" />
              </div>
              <div className="flex justify-center">
                <CheckCell checked={!!a.canvaUrl} label="Canva" />
              </div>
              <div className="flex justify-center">
                <CheckCell checked={!!a.socialToolUrl} label="Social Tool" />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {CHANNEL_DEFS.map((def) => {
                  const ch = a.channels.find((c) => c.platform === def.key);
                  return <ChannelChip key={def.key} def={def} channel={ch} />;
                })}
              </div>
              <div style={{ color: "#858889" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer open={!!openId} onClose={() => setOpenId(null)} width={640}>
        {openAdvisor && (
          <AdvisorDrawerContent advisor={openAdvisor} onClose={() => setOpenId(null)} />
        )}
      </Drawer>
    </div>
  );
}
