"use client";

import { useEffect, useState } from "react";
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
  openCompose?: boolean;
  onComposeClose?: () => void;
}

const CHANNEL_DEFS = [
  { key: "WEBSITE", label: "W", full: "Website", color: "#5bcbf5" },
  { key: "FACEBOOK", label: "FB", full: "Facebook", color: "#818cf8" },
  { key: "INSTAGRAM", label: "IG", full: "Instagram", color: "#f472b6" },
  { key: "LINKEDIN", label: "in", full: "LinkedIn", color: "#60a5fa" },
  { key: "TIKTOK", label: "TT", full: "TikTok", color: "#ec4899" },
  { key: "YOUTUBE", label: "YT", full: "YouTube", color: "#ef4444" },
  { key: "GOOGLE_BUSINESS", label: "GB", full: "Google Business", color: "#fbbf24" },
  { key: "ZILLOW", label: "Zi", full: "Zillow", color: "#06b6d4" },
  { key: "YELP", label: "Yp", full: "Yelp", color: "#f97316" },
  { key: "X", label: "X", full: "X / Twitter", color: "#cbd5e1" },
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

function AdvisorDrawerContent({
  advisor: initialAdvisor,
  onClose,
  onUpdate,
}: {
  advisor: Advisor;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Advisor>) => void;
}) {
  const [advisor, setAdvisor] = useState(initialAdvisor);
  const [channels, setChannels] = useState<AdvisorChannel[]>(initialAdvisor.channels);
  // Map of platform -> current input value for editing
  const [channelInputs, setChannelInputs] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const ch of initialAdvisor.channels) m[ch.platform] = ch.url;
    return m;
  });
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  // Extra custom links
  const [customLinks, setCustomLinks] = useState<AdvisorChannel[]>(
    initialAdvisor.channels.filter((c) => !CHANNEL_DEFS.find((d) => d.key === c.platform))
  );
  const [addingCustom, setAddingCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const toggleChecklist = async (field: "auditFormUrl" | "matrixUrl" | "canvaUrl" | "socialToolUrl") => {
    const current = advisor[field];
    const newVal = current ? null : "DONE";
    setAdvisor((a) => ({ ...a, [field]: newVal }));
    onUpdate(advisor.id, { [field]: newVal });
    await fetch(`/api/advisors/${advisor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newVal }),
    });
  };

  const saveChannel = async (platform: string) => {
    const url = channelInputs[platform] ?? "";
    setSavingChannel(platform);
    const res = await fetch(`/api/advisors/${advisor.id}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, url }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.deleted) {
        setChannels((prev) => prev.filter((c) => c.platform !== platform));
        setChannelInputs((m) => { const n = { ...m }; delete n[platform]; return n; });
        onUpdate(advisor.id, { channels: channels.filter((c) => c.platform !== platform) });
      } else {
        const exists = channels.find((c) => c.platform === platform);
        const next = exists
          ? channels.map((c) => (c.platform === platform ? data : c))
          : [...channels, data];
        setChannels(next);
        setChannelInputs((m) => ({ ...m, [platform]: data.url }));
        onUpdate(advisor.id, { channels: next });
      }
    }
    setSavingChannel(null);
  };

  const addCustomLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const res = await fetch(`/api/advisors/${advisor.id}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "OTHER", url: customUrl.trim(), label: customLabel.trim() || undefined }),
    });
    if (res.ok) {
      const ch = await res.json();
      setCustomLinks((prev) => [...prev, ch]);
      setChannels((prev) => [...prev, ch]);
      setCustomLabel("");
      setCustomUrl("");
      setAddingCustom(false);
      onUpdate(advisor.id, { channels: [...channels, ch] });
    }
  };

  const deleteCustomLink = async (chId: string) => {
    await fetch(`/api/advisors/${advisor.id}/channels/${chId}`, { method: "DELETE" });
    setCustomLinks((prev) => prev.filter((c) => c.id !== chId));
    setChannels((prev) => prev.filter((c) => c.id !== chId));
    onUpdate(advisor.id, { channels: channels.filter((c) => c.id !== chId) });
  };

  const CHECKLIST = [
    { label: "Audit Form", field: "auditFormUrl" as const },
    { label: "Matrix", field: "matrixUrl" as const },
    { label: "Canva", field: "canvaUrl" as const },
    { label: "Social Tool", field: "socialToolUrl" as const },
  ];

  const drawerInputStyle: React.CSSProperties = {
    background: "#061320",
    border: "1px solid #1d4368",
    borderRadius: 6,
    color: "#e2e8f0",
    fontSize: 12,
    padding: "5px 9px",
    outline: "none",
    width: "100%",
  };

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Avatar name={advisor.name} color={advisor.color} initials={advisor.initials} size={48} />
          <div>
            <div className="text-[18px] font-semibold tracking-tight text-slate-100">{advisor.name}</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "#a8aaab" }}>
              {advisor.brand} · {advisor.city}, {advisor.state}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full px-2 py-[3px] text-[10.5px] font-medium font-mono" style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}>
                NMLS {advisor.nmlsNumber}
              </span>
              {advisor.leader && (
                <span className="rounded-full px-2 py-[3px] text-[10.5px] font-medium" style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}>
                  Lead: {advisor.leader}
                </span>
              )}
            </div>
          </div>
        </div>
        <DrawerCloseButton onClose={onClose} />
      </div>

      {/* Onboarding checklist — clickable */}
      <div className="mt-5 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-3 text-[11px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.12em" }}>
          Onboarding checklist
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CHECKLIST.map(({ label, field }) => {
            const checked = !!advisor[field];
            return (
              <button
                key={field}
                onClick={() => toggleChecklist(field)}
                className="flex items-center gap-3 rounded-lg p-3 text-left transition hover:brightness-110"
                style={{ background: "#0a2540", border: `1px solid ${checked ? "#22c55e44" : "#1d4368"}` }}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition"
                  style={{
                    background: checked ? "#22c55e1f" : "#14375a",
                    color: checked ? "#86efac" : "#5d6566",
                    border: `1px solid ${checked ? "#22c55e44" : "#1d4368"}`,
                  }}
                >
                  {checked ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-[10px]">—</span>
                  )}
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold text-slate-100">{label}</div>
                  <div className="text-[10.5px]" style={{ color: checked ? "#86efac" : "#858889" }}>
                    {checked ? "Complete" : "Not set up"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Social channels — editable */}
      <div className="mt-5 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-3 text-[11px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.12em" }}>
          Social channels
        </div>
        <div className="space-y-1.5">
          {CHANNEL_DEFS.map((def) => {
            const ch = channels.find((c) => c.platform === def.key);
            const inputVal = channelInputs[def.key] ?? "";
            const saving = savingChannel === def.key;
            return (
              <div key={def.key} className="flex items-center gap-2 rounded-md px-2.5 py-2" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                <span
                  className="grid shrink-0 place-items-center rounded font-bold"
                  style={{ width: 26, height: 26, fontSize: 11, background: ch ? def.color + "22" : "#14375a", color: ch ? def.color : "#5d6566", border: `1px solid ${ch ? def.color + "44" : "#1d4368"}` }}
                >
                  {def.label}
                </span>
                <span className="w-28 shrink-0 text-[11.5px] font-medium text-slate-200">{def.full}</span>
                <input
                  value={inputVal}
                  onChange={(e) => setChannelInputs((m) => ({ ...m, [def.key]: e.target.value }))}
                  onBlur={() => saveChannel(def.key)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
                  placeholder="Paste URL…"
                  style={drawerInputStyle}
                />
                {ch && (
                  <a href={ch.url} target="_blank" rel="noopener" className="shrink-0 transition hover:opacity-80" style={{ color: "#5bcbf5" }} title="Open link">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
                {saving && <span className="shrink-0 text-[10px]" style={{ color: "#5d6566" }}>…</span>}
              </div>
            );
          })}

          {/* Custom / other links */}
          {customLinks.map((ch) => (
            <div key={ch.id} className="group flex items-center gap-2 rounded-md px-2.5 py-2" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
              <span className="grid shrink-0 place-items-center rounded font-bold text-[9px]" style={{ width: 26, height: 26, background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}>
                ↗
              </span>
              <span className="flex-1 truncate text-[12px]" style={{ color: "#cbd5e1" }}>
                {ch.label ?? ch.url}
              </span>
              <a href={ch.url} target="_blank" rel="noopener" className="shrink-0" style={{ color: "#5bcbf5" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <button onClick={() => deleteCustomLink(ch.id)} className="shrink-0 opacity-0 transition group-hover:opacity-100" style={{ color: "#5d6566" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add custom link */}
          {addingCustom ? (
            <form onSubmit={addCustomLink} className="space-y-2 rounded-md p-2.5" style={{ background: "#061320", border: "1px solid #1d4368" }}>
              <input autoFocus value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Label (e.g. Mortgage website)" style={drawerInputStyle} />
              <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://..." style={drawerInputStyle} />
              <div className="flex gap-2">
                <button type="submit" disabled={!customUrl.trim()} className="flex-1 rounded py-1 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50" style={{ background: "#5bcbf5", color: "#061320" }}>Add link</button>
                <button type="button" onClick={() => setAddingCustom(false)} className="rounded px-2 py-1 text-[11px]" style={{ background: "#14375a", color: "#a8aaab" }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingCustom(true)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[11.5px] font-medium transition hover:brightness-110"
              style={{ color: "#5bcbf5", background: "rgba(91,203,245,0.06)", border: "1px dashed rgba(91,203,245,0.3)" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add another link
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const ADVISOR_COLORS = ["#5bcbf5", "#6366f1", "#f59e0b", "#22c55e", "#f43f5e", "#a855f7", "#14b8a6", "#fb923c"];

const inputStyle: React.CSSProperties = { background: "#0a2540", border: "1px solid #1d4368", color: "#e2e8f0", outline: "none" };

export function AdvisorTable({ advisors: initialAdvisors, leaders, openCompose, onComposeClose }: AdvisorTableProps) {
  const [advisors, setAdvisors] = useState(initialAdvisors);
  const [leaderFilter, setLeaderFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (openCompose) { setComposing(true); onComposeClose?.(); }
  }, [openCompose]);

  // New advisor form state
  const [newName, setNewName] = useState("");
  const [newNmls, setNewNmls] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newLeader, setNewLeader] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newLinkedin, setNewLinkedin] = useState("");
  const [newFacebook, setNewFacebook] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [newGmb, setNewGmb] = useState("");
  const [newYoutube, setNewYoutube] = useState("");
  const [newTiktok, setNewTiktok] = useState("");
  const [newZillow, setNewZillow] = useState("");
  const [newYelp, setNewYelp] = useState("");
  const [newColor, setNewColor] = useState(ADVISOR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const resetForm = () => {
    setNewName(""); setNewNmls(""); setNewBrand(""); setNewLeader(""); setNewCity(""); setNewState("");
    setNewWebsite(""); setNewLinkedin(""); setNewFacebook(""); setNewInstagram(""); setNewGmb("");
    setNewYoutube(""); setNewTiktok(""); setNewZillow(""); setNewYelp(""); setNewColor(ADVISOR_COLORS[0]);
    setSaveError("");
  };

  const handleAddAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/advisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(), nmlsNumber: newNmls.trim(), brand: newBrand.trim() || undefined,
          leader: newLeader.trim() || undefined, city: newCity.trim() || undefined, state: newState.trim() || undefined,
          color: newColor, website: newWebsite.trim() || undefined, linkedinUrl: newLinkedin.trim() || undefined,
          facebookUrl: newFacebook.trim() || undefined, instagramUrl: newInstagram.trim() || undefined,
          gmbUrl: newGmb.trim() || undefined, youtubeUrl: newYoutube.trim() || undefined,
          tiktokUrl: newTiktok.trim() || undefined, zillowUrl: newZillow.trim() || undefined, yelpUrl: newYelp.trim() || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      const advisor = await res.json();
      setAdvisors(prev => [...prev, {
        id: advisor.id, name: advisor.name, nmlsNumber: advisor.nmlsNumber, brand: advisor.brand,
        leader: advisor.leader, city: advisor.city, state: advisor.state, color: advisor.color,
        initials: advisor.initials, auditFormUrl: advisor.auditFormUrl, matrixUrl: advisor.matrixUrl,
        canvaUrl: advisor.canvaUrl, socialToolUrl: advisor.socialToolUrl, status: advisor.status,
        channels: advisor.channels.map((c: any) => ({ id: c.id, platform: c.platform, url: c.url, label: c.label })),
        openIssues: 0,
      }]);
      resetForm();
      setComposing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add advisor");
    } finally {
      setSaving(false);
    }
  };

  const allLeaders = Array.from(new Set([...leaders, ...advisors.map(a => a.leader).filter(Boolean) as string[]])).sort();

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

      {/* Add advisor form */}
      {composing && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setComposing(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
          <div className="relative ml-auto flex h-full w-full max-w-[600px] flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}>
            <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
              <div>
                <div className="text-[16px] font-bold tracking-tight text-slate-100">Add Advisor</div>
                <div className="mt-0.5 text-[11px]" style={{ color: "#858889" }}>Fill in what you know — you can edit later</div>
              </div>
              <button onClick={() => setComposing(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddAdvisor} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Preferred name *</label>
                  <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Aaron Thomas"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Brand / team name</label>
                  <input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="e.g. The Welty Team"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>NMLS #</label>
                  <input value={newNmls} onChange={e => setNewNmls(e.target.value)} placeholder="e.g. 1713681"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Divisional leader</label>
                  <input value={newLeader} onChange={e => setNewLeader(e.target.value)} placeholder="e.g. Josh Mettle"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>City</label>
                  <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="e.g. Round Rock"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>State</label>
                  <input value={newState} onChange={e => setNewState(e.target.value)} placeholder="e.g. TX"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Color</div>
                <div className="flex gap-2">
                  {ADVISOR_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewColor(c)}
                      className="h-6 w-6 rounded-full transition"
                      style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px #061320, 0 0 0 4px ${c}` : "none" }} />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Links & social profiles</div>
                <div className="space-y-2">
                  {[
                    { label: "Website", value: newWebsite, onChange: setNewWebsite, placeholder: "https://..." },
                    { label: "LinkedIn", value: newLinkedin, onChange: setNewLinkedin, placeholder: "https://linkedin.com/in/..." },
                    { label: "Facebook", value: newFacebook, onChange: setNewFacebook, placeholder: "https://facebook.com/..." },
                    { label: "Instagram", value: newInstagram, onChange: setNewInstagram, placeholder: "https://instagram.com/..." },
                    { label: "Google Business", value: newGmb, onChange: setNewGmb, placeholder: "https://share.google/..." },
                    { label: "YouTube", value: newYoutube, onChange: setNewYoutube, placeholder: "https://youtube.com/..." },
                    { label: "TikTok", value: newTiktok, onChange: setNewTiktok, placeholder: "https://tiktok.com/@..." },
                    { label: "Zillow", value: newZillow, onChange: setNewZillow, placeholder: "https://zillow.com/lender-profile/..." },
                    { label: "Yelp", value: newYelp, onChange: setNewYelp, placeholder: "https://yelp.com/..." },
                  ].map(({ label, value, onChange, placeholder }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-32 shrink-0 text-[11.5px] font-medium" style={{ color: "#a8aaab" }}>{label}</div>
                      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                        className="flex-1 rounded-lg px-3 py-2 text-[12px]" style={inputStyle} />
                    </div>
                  ))}
                </div>
              </div>

              {saveError && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{saveError}</p>}
            </form>
            <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}>
              <button type="button" onClick={() => { setComposing(false); resetForm(); }}
                className="rounded-lg px-4 py-2 text-[12.5px] font-semibold hover:bg-white/[0.04]" style={{ color: "#a8aaab" }}>
                Cancel
              </button>
              <button onClick={handleAddAdvisor} disabled={saving || !newName.trim()}
                className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 18px rgba(91,203,245,0.35)" }}>
                {saving ? "Saving…" : "Add advisor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={leaderFilter === "all"} onClick={() => setLeaderFilter("all")}>
          All divisions
        </Chip>
        {allLeaders.map((l) => (
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
          <AdvisorDrawerContent
            advisor={openAdvisor}
            onClose={() => setOpenId(null)}
            onUpdate={(id, patch) =>
              setAdvisors((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
            }
          />
        )}
      </Drawer>
    </div>
  );
}
