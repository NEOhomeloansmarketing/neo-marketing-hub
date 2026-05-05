"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { Chip } from "@/components/ui/Chip";
import { Drawer, DrawerCloseButton } from "@/components/ui/Drawer";

interface Tool {
  id: string;
  name: string;
  url: string;
  category: string;
  glyph?: string | null;
  color?: string | null;
  seats?: number | null;
  lastAccessed?: string | null;
  notesMd?: string | null;
  credKind: string;
  vaultLink?: string | null;
  mfaMethod?: string | null;
  owner?: {
    id: string;
    name: string;
    color?: string;
    initials?: string;
    role: string;
  } | null;
}

interface ToolsGridProps {
  tools: Tool[];
  categories: string[];
}

const CRED_KIND_MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  SSO: { bg: "#22c55e22", color: "#86efac", border: "#22c55e44", label: "SSO" },
  SHARED: { bg: "#f59e0b22", color: "#fcd34d", border: "#f59e0b44", label: "Shared" },
  VAULT: { bg: "#5bcbf522", color: "#5bcbf5", border: "#5bcbf544", label: "Vault" },
};

function CredBadge({ kind }: { kind: string }) {
  const c = CRED_KIND_MAP[kind] || CRED_KIND_MAP.SHARED;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  );
}

function ToolGlyph({ tool, size = 36 }: { tool: Tool; size?: number }) {
  const bg = (tool.color ?? "#5bcbf5") + "1f";
  const fg = tool.color ?? "#5bcbf5";
  return (
    <div
      className="grid place-items-center rounded-lg font-bold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: bg,
        color: fg,
        border: `1px solid ${fg}33`,
      }}
    >
      {tool.glyph ?? tool.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ToolDrawerContent({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const [passwordShown, setPasswordShown] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <ToolGlyph tool={tool} size={48} />
          <div>
            <div className="text-[16px] font-semibold tracking-tight text-slate-100">
              {tool.name}
            </div>
            <a
              href={`https://${tool.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[12px] hover:underline"
              style={{ color: "#5bcbf5" }}
            >
              {tool.url}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
        <DrawerCloseButton onClose={onClose} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CredBadge kind={tool.credKind} />
        <span
          className="rounded-full px-2 py-[3px] text-[10px] font-medium"
          style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
        >
          {tool.category}
        </span>
        {tool.seats && (
          <span
            className="rounded-full px-2 py-[3px] text-[10px] font-medium"
            style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
          >
            {tool.seats} seats
          </span>
        )}
      </div>

      {tool.notesMd && (
        <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: "#cbd5e1" }}>
          {tool.notesMd}
        </p>
      )}

      {/* Credential reference */}
      <div
        className="mt-5 rounded-lg p-4"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <div
          className="text-[11px] font-semibold uppercase"
          style={{ color: "#858889", letterSpacing: "0.12em" }}
        >
          Credential reference
        </div>
        <div className="mt-3 space-y-2">
          <CredRow label="Username" value="marketing@neohomeloans.com" />
          <CredRow
            label="Password"
            value="See 1Password vault"
            masked
            shown={passwordShown}
            onToggle={() => setPasswordShown((v) => !v)}
          />
          {tool.mfaMethod && (
            <CredRow label="MFA" value={tool.mfaMethod} />
          )}
          {tool.vaultLink && (
            <CredRow label="1Password ref" value={tool.vaultLink} copy />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          className="rounded-md py-2 text-[12px] font-semibold text-white"
          style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}
        >
          Open in 1Password
        </button>
        <button
          className="rounded-md py-2 text-[12px] font-medium"
          style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}
        >
          Request access
        </button>
      </div>

      {/* Owner + last accessed */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div
          className="rounded-lg p-3"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <div
            className="text-[10.5px] font-semibold uppercase"
            style={{ color: "#858889", letterSpacing: "0.12em" }}
          >
            Owner
          </div>
          {tool.owner ? (
            <div className="mt-2 flex items-center gap-2">
              <Avatar name={tool.owner.name} color={tool.owner.color} initials={tool.owner.initials} size={24} />
              <div>
                <div className="text-[12px] font-semibold text-slate-100">{tool.owner.name}</div>
                <div className="text-[10.5px]" style={{ color: "#858889" }}>
                  {tool.owner.role}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[12px]" style={{ color: "#858889" }}>Unassigned</div>
          )}
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <div
            className="text-[10.5px] font-semibold uppercase"
            style={{ color: "#858889", letterSpacing: "0.12em" }}
          >
            Last accessed
          </div>
          <div className="mt-2 text-[13px] font-semibold text-slate-100">
            {tool.lastAccessed ?? "—"}
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div
        className="mt-5 rounded-md p-3 text-[11.5px] leading-relaxed"
        style={{
          background: "rgba(91,203,245,0.06)",
          border: "1px solid rgba(91,203,245,0.25)",
          color: "#cbd5e1",
        }}
      >
        <span className="font-semibold text-slate-100">Credentials live in 1Password.</span>{" "}
        This page indexes tools and access — passwords are never stored here.
      </div>
    </>
  );
}

function CredRow({
  label,
  value,
  masked,
  shown,
  onToggle,
  copy,
}: {
  label: string;
  value: string;
  masked?: boolean;
  shown?: boolean;
  onToggle?: () => void;
  copy?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px]" style={{ color: "#858889" }}>
        {label}
      </div>
      <div
        className="flex-1 rounded-md px-2.5 py-1.5 font-mono text-[11.5px] truncate"
        style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }}
      >
        {masked && !shown ? "•••••••••••••••" : value}
      </div>
      <div className="flex items-center gap-1">
        {masked && (
          <button
            onClick={onToggle}
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ background: "#14375a", color: "#a8aaab" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {shown ? (
                <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
              ) : (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
              )}
            </svg>
          </button>
        )}
        {copy && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ background: "#14375a", color: "#a8aaab" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

const ALL_CATEGORIES = "All";

export function ToolsGrid({ tools: initialTools, categories }: ToolsGridProps) {
  const [tools, setTools] = useState(initialTools);
  const [cat, setCat] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCredKind, setNewCredKind] = useState("SHARED");

  const handleAddTool = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          url: newUrl.trim() || undefined,
          category: newCategory.trim() || "Other",
          credKind: newCredKind,
        }),
      });
      if (res.ok) {
        const tool = await res.json();
        setTools((prev) => [
          {
            id: tool.id,
            name: tool.name,
            url: tool.url ?? "",
            category: tool.category ?? "Other",
            credKind: tool.credKind,
            owner: tool.owner ?? null,
            glyph: tool.glyph ?? null,
            color: tool.color ?? null,
            seats: tool.seats ?? null,
            notesMd: tool.notesMd ?? null,
            vaultLink: tool.vaultLink ?? null,
            mfaMethod: tool.mfaMethod ?? null,
            lastAccessed: tool.lastAccessed ?? null,
          },
          ...prev,
        ]);
      }
    } catch { /* silently fail */ }
    setNewName(""); setNewUrl(""); setNewCategory(""); setComposing(false);
  };

  const filtered = tools.filter((t) => {
    if (cat !== ALL_CATEGORIES && t.category !== cat) return false;
    if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const openTool = tools.find((t) => t.id === openId) ?? null;

  const ssoCount = tools.filter((t) => t.credKind === "SSO").length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Tools tracked" value={String(tools.length)} delta="across all categories" />
        <StatCard span={3} label="SSO-protected" value={String(ssoCount)} delta={`${Math.round((ssoCount / tools.length) * 100)}% of tools`} tone="green" />
        <StatCard span={3} label="Total seats" value={String(tools.reduce((s, t) => s + (t.seats ?? 0), 0))} delta="in use" tone="indigo" />
        <StatCard span={3} label="Renewals next 30d" value="2" delta="check billing" />
      </div>

      {/* Security notice */}
      <div
        className="flex items-start gap-3 rounded-lg p-3.5"
        style={{
          background: "rgba(91,203,245,0.06)",
          border: "1px solid rgba(91,203,245,0.25)",
        }}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
          style={{ background: "#5bcbf522", color: "#5bcbf5" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </span>
        <div className="text-[12px] leading-relaxed" style={{ color: "#cbd5e1" }}>
          <span className="font-semibold text-slate-100">Credentials live in 1Password.</span>{" "}
          This page indexes tools and access — passwords are never stored here.
        </div>
      </div>

      {/* Category filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={cat === ALL_CATEGORIES} onClick={() => setCat(ALL_CATEGORIES)}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex h-9 items-center gap-2 rounded-md px-2.5"
            style={{ background: "#0a2540", border: "1px solid #1d4368", width: 220 }}
          >
            <span style={{ color: "#858889" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools…"
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
              style={{ color: "#e2e8f0" }}
            />
          </div>
          <button
            onClick={() => setComposing(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.25)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Add tool
          </button>
        </div>
      </div>

      {/* Add tool compose form */}
      {composing && (
        <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid rgba(91,203,245,0.45)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.1em" }}>Tool name *</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setComposing(false); }}
                placeholder="e.g. Salesforce"
                className="w-full rounded-md px-3 py-2 text-[12.5px] outline-none"
                style={{ background: "#14375a", border: "1px solid #1d4368", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.1em" }}>URL</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="e.g. salesforce.com"
                className="w-full rounded-md px-3 py-2 text-[12.5px] outline-none"
                style={{ background: "#14375a", border: "1px solid #1d4368", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.1em" }}>Category</label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. CRM"
                className="w-full rounded-md px-3 py-2 text-[12.5px] outline-none"
                style={{ background: "#14375a", border: "1px solid #1d4368", color: "#e2e8f0" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.1em" }}>Credentials</label>
              <select value={newCredKind} onChange={(e) => setNewCredKind(e.target.value)}
                className="w-full rounded-md px-3 py-2 text-[12.5px] outline-none"
                style={{ background: "#14375a", border: "1px solid #1d4368", color: "#e2e8f0" }}>
                <option value="SHARED">Shared login</option>
                <option value="SSO">SSO</option>
                <option value="VAULT">1Password Vault</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setComposing(false)} className="rounded-md px-3 py-1.5 text-[11.5px] font-medium"
              style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}>Cancel</button>
            <button onClick={handleAddTool} disabled={!newName.trim()} className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}>Add tool</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-12 gap-3">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => setOpenId(t.id)}
            className="col-span-12 md:col-span-6 lg:col-span-4 rounded-lg p-4 text-left transition hover:-translate-y-0.5"
            style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
          >
            <div className="flex items-start gap-3">
              <ToolGlyph tool={t} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-slate-100">
                  {t.name}
                </div>
                <div
                  className="mt-0.5 truncate text-[11px]"
                  style={{ color: "#858889" }}
                >
                  {t.url}
                </div>
              </div>
              <CredBadge kind={t.credKind} />
            </div>
            {t.notesMd && (
              <p
                className="mt-3 text-[12px] leading-relaxed"
                style={{
                  color: "#a8aaab",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {t.notesMd}
              </p>
            )}
            <div
              className="mt-3 flex items-center justify-between text-[11px]"
              style={{ color: "#a8aaab" }}
            >
              <span className="flex items-center gap-3">
                {t.seats && (
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                    {t.seats} seats
                  </span>
                )}
                {t.lastAccessed && (
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {t.lastAccessed}
                  </span>
                )}
              </span>
              {t.owner && (
                <Avatar name={t.owner.name} color={t.owner.color} initials={t.owner.initials} size={18} />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Drawer */}
      <Drawer open={!!openId} onClose={() => setOpenId(null)} width={480}>
        {openTool && (
          <ToolDrawerContent tool={openTool} onClose={() => setOpenId(null)} />
        )}
      </Drawer>
    </div>
  );
}
