"use client";

import { useRef, useState } from "react";
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
  email?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  region?: string | null;
  licenseStates?: string[];
  nextAuditDue?: string | null;
  photoUrl?: string | null;
  color: string;
  initials: string;
  auditFormUrl?: string | null;
  matrixUrl?: string | null;
  canvaUrl?: string | null;
  socialToolUrl?: string | null;
  napFormUrl?: string | null;
  napNotes?: string | null;
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

type ChecklistField = "auditFormUrl" | "matrixUrl" | "canvaUrl" | "socialToolUrl";
const CHECKLIST: { label: string; field: ChecklistField }[] = [
  { label: "Audit Form", field: "auditFormUrl" },
  { label: "Matrix", field: "matrixUrl" },
  { label: "Canva", field: "canvaUrl" },
  { label: "Social Tool", field: "socialToolUrl" },
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
        width: 22, height: 22, fontSize: 10,
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

function AdvisorDrawerContent({
  advisor: initialAdvisor,
  onClose,
  onUpdate,
  onDelete,
}: {
  advisor: Advisor;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Advisor>) => void;
  onDelete: (id: string) => void;
}) {
  const [advisor, setAdvisor] = useState(initialAdvisor);
  const [channels, setChannels] = useState<AdvisorChannel[]>(initialAdvisor.channels);
  const [channelInputs, setChannelInputs] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const ch of initialAdvisor.channels) m[ch.platform] = ch.url;
    return m;
  });
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [customLinks, setCustomLinks] = useState<AdvisorChannel[]>(
    initialAdvisor.channels.filter((c) => !CHANNEL_DEFS.find((d) => d.key === c.platform))
  );
  const [addingCustom, setAddingCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [uploadingNap, setUploadingNap] = useState(false);
  const napFileRef = useRef<HTMLInputElement>(null);

  const patch = async (data: Partial<Advisor>) => {
    setAdvisor((a) => ({ ...a, ...data }));
    onUpdate(advisor.id, data);
    await fetch(`/api/advisors/${advisor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const toggleChecklist = (field: ChecklistField) => {
    const newVal = advisor[field] ? null : "DONE";
    patch({ [field]: newVal } as Partial<Advisor>);
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
        const next = exists ? channels.map((c) => (c.platform === platform ? data : c)) : [...channels, data];
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
      setCustomLabel(""); setCustomUrl(""); setAddingCustom(false);
      onUpdate(advisor.id, { channels: [...channels, ch] });
    }
  };

  const deleteCustomLink = async (chId: string) => {
    await fetch(`/api/advisors/${advisor.id}/channels/${chId}`, { method: "DELETE" });
    setCustomLinks((prev) => prev.filter((c) => c.id !== chId));
    setChannels((prev) => prev.filter((c) => c.id !== chId));
    onUpdate(advisor.id, { channels: channels.filter((c) => c.id !== chId) });
  };

  const handleNapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNap(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/advisors/${advisor.id}/upload`, { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setAdvisor((a) => ({ ...a, napFormUrl: url }));
      onUpdate(advisor.id, { napFormUrl: url });
    }
    setUploadingNap(false);
    if (napFileRef.current) napFileRef.current.value = "";
  };

  const downloadPdf = () => {
    const fullAddress = [
      advisor.streetAddress,
      advisor.city && advisor.state ? `${advisor.city}, ${advisor.state}` : advisor.city ?? advisor.state,
      advisor.zip,
    ].filter(Boolean).join(", ");

    const channelLines = CHANNEL_DEFS.map((def) => {
      const ch = channels.find((c) => c.platform === def.key);
      return ch ? `<tr><td style="color:#888;padding:3px 12px 3px 0;font-size:12px">${def.full}</td><td style="font-size:12px"><a href="${ch.url}">${ch.url}</a></td></tr>` : "";
    }).filter(Boolean).join("");

    const checkItems = CHECKLIST.map(({ label, field }) =>
      `<tr><td style="font-size:12px;padding:3px 12px 3px 0;color:#888">${label}</td><td style="font-size:12px">${advisor[field] ? "✓ Complete" : "Not set up"}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><title>${advisor.name} – Advisor Profile</title>
<style>
  body{font-family:-apple-system,sans-serif;padding:32px;color:#111;max-width:700px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#666;font-size:13px;margin-bottom:24px}
  .section{margin-top:24px}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#888;border-bottom:1px solid #e5e5e5;padding-bottom:5px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse}
  td{vertical-align:top;padding:4px 12px 4px 0}
  a{color:#0070f3}
  @media print{body{padding:20px}}
</style></head><body>
<h1>${advisor.name}</h1>
<div class="sub">${[advisor.brand, `NMLS ${advisor.nmlsNumber}`, advisor.status].filter(Boolean).join(" · ")}</div>

<div class="section"><div class="section-title">Profile</div>
<table>
  <tr><td style="color:#888;width:160px;font-size:12px">Name</td><td style="font-size:12px">${advisor.name}</td></tr>
  <tr><td style="color:#888;font-size:12px">NMLS #</td><td style="font-size:12px">${advisor.nmlsNumber}</td></tr>
  ${advisor.brand ? `<tr><td style="color:#888;font-size:12px">Brand / Team</td><td style="font-size:12px">${advisor.brand}</td></tr>` : ""}
  ${advisor.leader ? `<tr><td style="color:#888;font-size:12px">Division Lead</td><td style="font-size:12px">${advisor.leader}</td></tr>` : ""}
  ${advisor.email ? `<tr><td style="color:#888;font-size:12px">Email</td><td style="font-size:12px">${advisor.email}</td></tr>` : ""}
  ${advisor.phone ? `<tr><td style="color:#888;font-size:12px">Phone</td><td style="font-size:12px">${advisor.phone}</td></tr>` : ""}
  ${fullAddress ? `<tr><td style="color:#888;font-size:12px">Address</td><td style="font-size:12px">${fullAddress}</td></tr>` : ""}
  ${advisor.region ? `<tr><td style="color:#888;font-size:12px">Region</td><td style="font-size:12px">${advisor.region}</td></tr>` : ""}
  ${advisor.licenseStates?.length ? `<tr><td style="color:#888;font-size:12px">License States</td><td style="font-size:12px">${advisor.licenseStates.join(", ")}</td></tr>` : ""}
</table></div>

<div class="section"><div class="section-title">Onboarding Checklist</div>
<table>${checkItems}</table></div>

${channelLines ? `<div class="section"><div class="section-title">Social Channels</div><table>${channelLines}</table></div>` : ""}

${advisor.napNotes ? `<div class="section"><div class="section-title">NAP Notes</div><p style="font-size:12px;white-space:pre-wrap">${advisor.napNotes}</p></div>` : ""}

<div style="margin-top:40px;color:#aaa;font-size:10px">Generated ${new Date().toLocaleDateString()} · NEO Marketing Hub</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const inp: React.CSSProperties = {
    background: "#061320", border: "1px solid #1d4368", borderRadius: 6,
    color: "#e2e8f0", fontSize: 12, padding: "5px 9px", outline: "none", width: "100%",
  };

  const Field = ({
    label, value, field, placeholder, type = "text", multiline = false,
  }: {
    label: string;
    value: string | null | undefined;
    field: keyof Advisor;
    placeholder?: string;
    type?: string;
    multiline?: boolean;
  }) => {
    const [local, setLocal] = useState(value ?? "");
    const handleBlur = () => {
      const trimmed = local.trim();
      if (trimmed !== (value ?? "")) patch({ [field]: trimmed || null } as Partial<Advisor>);
    };
    return (
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{label}</label>
        {multiline ? (
          <textarea
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={3}
            style={{ ...inp, resize: "vertical" }}
          />
        ) : (
          <input
            type={type}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            style={inp}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Avatar name={advisor.name} color={advisor.color} initials={advisor.initials} size={48} />
          <div>
            <div className="text-[18px] font-semibold tracking-tight text-slate-100">{advisor.name}</div>
            <div className="mt-0.5 text-[12px]" style={{ color: "#a8aaab" }}>
              {[advisor.brand, advisor.city && advisor.state ? `${advisor.city}, ${advisor.state}` : advisor.city ?? advisor.state].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2 py-[2px] text-[10.5px] font-medium font-mono" style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}>
                NMLS {advisor.nmlsNumber}
              </span>
              {advisor.leader && (
                <span className="rounded-full px-2 py-[2px] text-[10.5px] font-medium" style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}>
                  Lead: {advisor.leader}
                </span>
              )}
              <span className="rounded-full px-2 py-[2px] text-[10.5px] font-medium" style={{
                background: advisor.status === "ACTIVE" ? "#22c55e1a" : "#0a2540",
                color: advisor.status === "ACTIVE" ? "#86efac" : "#5d6566",
                border: `1px solid ${advisor.status === "ACTIVE" ? "#22c55e44" : "#1d4368"}`,
              }}>
                {advisor.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadPdf}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition hover:brightness-110"
            style={{ background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }}
            title="Download PDF"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            PDF
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Delete ${advisor.name}? This cannot be undone.`)) return;
              await fetch(`/api/advisors/${advisor.id}`, { method: "DELETE" });
              onDelete(advisor.id); onClose();
            }}
            className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-red-500/10"
            style={{ color: "#5d6566", border: "1px solid #1d4368" }}
            title="Delete advisor"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
          <DrawerCloseButton onClose={onClose} />
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-5 rounded-lg p-4 space-y-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="text-[11px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.12em" }}>Profile Info</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name" field="name" value={advisor.name} placeholder="Advisor name" />
          <Field label="NMLS #" field="nmlsNumber" value={advisor.nmlsNumber} placeholder="e.g. 1713681" />
          <Field label="Brand / Team Name" field="brand" value={advisor.brand} placeholder="e.g. The Thomas Team" />
          <Field label="Divisional Leader" field="leader" value={advisor.leader} placeholder="e.g. Josh Mettle" />
          <Field label="Email" field="email" value={advisor.email} placeholder="advisor@email.com" type="email" />
          <Field label="Phone" field="phone" value={advisor.phone} placeholder="(555) 000-0000" type="tel" />
          <div className="col-span-2">
            <Field label="Street Address" field="streetAddress" value={advisor.streetAddress} placeholder="123 Main St" />
          </div>
          <Field label="City" field="city" value={advisor.city} placeholder="Round Rock" />
          <Field label="State" field="state" value={advisor.state} placeholder="TX" />
          <Field label="Zip Code" field="zip" value={advisor.zip} placeholder="78664" />
          <Field label="Region" field="region" value={advisor.region} placeholder="Southwest" />
          <div className="col-span-2">
            <Field label="License States (comma-separated)" field="licenseStates" value={advisor.licenseStates?.join(", ") ?? ""} placeholder="TX, CA, AZ" />
          </div>
        </div>
        {/* Status toggle */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Status</label>
          <div className="flex gap-2">
            {["ACTIVE", "INACTIVE"].map((s) => (
              <button
                key={s}
                onClick={() => patch({ status: s as "ACTIVE" | "INACTIVE" } as Partial<Advisor>)}
                className="rounded-full px-3 py-1 text-[11px] font-semibold transition"
                style={{
                  background: advisor.status === s ? (s === "ACTIVE" ? "#22c55e22" : "#ef444422") : "#0a2540",
                  color: advisor.status === s ? (s === "ACTIVE" ? "#86efac" : "#fca5a5") : "#5d6566",
                  border: `1px solid ${advisor.status === s ? (s === "ACTIVE" ? "#22c55e44" : "#ef444444") : "#1d4368"}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* NAP Section */}
      <div className="mt-4 rounded-lg p-4 space-y-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.12em" }}>NAP Info</div>
          <span className="text-[10px]" style={{ color: "#5d6566" }}>Name · Address · Phone</span>
        </div>
        <div className="rounded-md p-3 text-[12px]" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
          <div className="font-semibold text-slate-100">{advisor.name}</div>
          {advisor.streetAddress && <div style={{ color: "#a8aaab" }}>{advisor.streetAddress}</div>}
          {(advisor.city || advisor.state || advisor.zip) && (
            <div style={{ color: "#a8aaab" }}>
              {[advisor.city, advisor.state].filter(Boolean).join(", ")}{advisor.zip ? ` ${advisor.zip}` : ""}
            </div>
          )}
          {advisor.phone && <div style={{ color: "#a8aaab" }}>{advisor.phone}</div>}
          {advisor.email && <div style={{ color: "#5bcbf5" }}>{advisor.email}</div>}
        </div>
        <Field label="NAP Notes" field="napNotes" value={advisor.napNotes} placeholder="Notes about business listing consistency, discrepancies found…" multiline />
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Uploaded NAP Form</label>
          <div className="flex items-center gap-2">
            {advisor.napFormUrl ? (
              <a href={advisor.napFormUrl} target="_blank" rel="noopener"
                className="flex-1 truncate rounded-md px-2.5 py-2 text-[11.5px] transition hover:brightness-110"
                style={{ background: "#0a2540", border: "1px solid #22c55e44", color: "#86efac" }}>
                ↗ View uploaded form
              </a>
            ) : (
              <span className="flex-1 rounded-md px-2.5 py-2 text-[11.5px]" style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#5d6566" }}>
                No form uploaded
              </span>
            )}
            <input ref={napFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleNapUpload} />
            <button
              onClick={() => napFileRef.current?.click()}
              disabled={uploadingNap}
              className="shrink-0 rounded-md px-3 py-2 text-[11.5px] font-semibold transition hover:brightness-110 disabled:opacity-50"
              style={{ background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }}
            >
              {uploadingNap ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </div>

      {/* Onboarding checklist */}
      <div className="mt-4 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
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
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition"
                  style={{ background: checked ? "#22c55e1f" : "#14375a", color: checked ? "#86efac" : "#5d6566", border: `1px solid ${checked ? "#22c55e44" : "#1d4368"}` }}>
                  {checked ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : <span className="text-[10px]">—</span>}
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

      {/* Social channels */}
      <div className="mt-4 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-3 text-[11px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.12em" }}>Social channels</div>
        <div className="space-y-1.5">
          {CHANNEL_DEFS.map((def) => {
            const ch = channels.find((c) => c.platform === def.key);
            const inputVal = channelInputs[def.key] ?? "";
            const saving = savingChannel === def.key;
            return (
              <div key={def.key} className="flex items-center gap-2 rounded-md px-2.5 py-2" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                <span className="grid shrink-0 place-items-center rounded font-bold"
                  style={{ width: 26, height: 26, fontSize: 11, background: ch ? def.color + "22" : "#14375a", color: ch ? def.color : "#5d6566", border: `1px solid ${ch ? def.color + "44" : "#1d4368"}` }}>
                  {def.label}
                </span>
                <span className="w-28 shrink-0 text-[11.5px] font-medium text-slate-200">{def.full}</span>
                <input
                  value={inputVal}
                  onChange={(e) => setChannelInputs((m) => ({ ...m, [def.key]: e.target.value }))}
                  onBlur={() => saveChannel(def.key)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  placeholder="Paste URL…"
                  style={inp}
                />
                {ch && (
                  <a href={ch.url} target="_blank" rel="noopener" className="shrink-0 transition hover:opacity-80" style={{ color: "#5bcbf5" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
                {saving && <span className="shrink-0 text-[10px]" style={{ color: "#5d6566" }}>…</span>}
              </div>
            );
          })}

          {customLinks.map((ch) => (
            <div key={ch.id} className="group flex items-center gap-2 rounded-md px-2.5 py-2" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
              <span className="grid shrink-0 place-items-center rounded font-bold text-[9px]" style={{ width: 26, height: 26, background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}>↗</span>
              <span className="flex-1 truncate text-[12px]" style={{ color: "#cbd5e1" }}>{ch.label ?? ch.url}</span>
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

          {addingCustom ? (
            <form onSubmit={addCustomLink} className="space-y-2 rounded-md p-2.5" style={{ background: "#061320", border: "1px solid #1d4368" }}>
              <input autoFocus value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Label (e.g. Mortgage website)" style={inp} />
              <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://..." style={inp} />
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Inline checklist toggle without opening drawer
  const toggleInlineChecklist = async (advisorId: string, field: ChecklistField, e: React.MouseEvent) => {
    e.stopPropagation();
    const advisor = advisors.find((a) => a.id === advisorId);
    if (!advisor) return;
    const newVal = advisor[field] ? null : "DONE";
    setAdvisors((prev) => prev.map((a) => a.id === advisorId ? { ...a, [field]: newVal } : a));
    await fetch(`/api/advisors/${advisorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newVal }),
    });
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = (filteredIds: string[], e: React.MouseEvent) => {
    e.stopPropagation();
    const allSelected = filteredIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(filteredIds));
  };

  const bulkDelete = async () => {
    const names = advisors.filter((a) => selected.has(a.id)).map((a) => a.name);
    if (!confirm(`Delete ${selected.size} advisor${selected.size !== 1 ? "s" : ""}?\n\n${names.join(", ")}\n\nThis cannot be undone.`)) return;
    setBulkDeleting(true);
    await Promise.all(Array.from(selected).map((id) => fetch(`/api/advisors/${id}`, { method: "DELETE" })));
    setAdvisors((prev) => prev.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
    setBulkDeleting(false);
  };

  // New advisor form state
  const [newName, setNewName] = useState("");
  const [newNmls, setNewNmls] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newLeader, setNewLeader] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
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

  // Remove openCompose side-effect
  const prevCompose = useRef(false);
  if (openCompose && !prevCompose.current) { setComposing(true); onComposeClose?.(); }
  prevCompose.current = openCompose ?? false;

  const resetForm = () => {
    setNewName(""); setNewNmls(""); setNewBrand(""); setNewLeader(""); setNewEmail(""); setNewPhone("");
    setNewStreet(""); setNewCity(""); setNewState(""); setNewZip("");
    setNewWebsite(""); setNewLinkedin(""); setNewFacebook(""); setNewInstagram(""); setNewGmb("");
    setNewYoutube(""); setNewTiktok(""); setNewZillow(""); setNewYelp(""); setNewColor(ADVISOR_COLORS[0]);
    setSaveError("");
  };

  const handleAddAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/advisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(), nmlsNumber: newNmls.trim(), brand: newBrand.trim() || undefined,
          leader: newLeader.trim() || undefined, email: newEmail.trim() || undefined, phone: newPhone.trim() || undefined,
          streetAddress: newStreet.trim() || undefined, city: newCity.trim() || undefined,
          state: newState.trim() || undefined, zip: newZip.trim() || undefined,
          color: newColor, website: newWebsite.trim() || undefined, linkedinUrl: newLinkedin.trim() || undefined,
          facebookUrl: newFacebook.trim() || undefined, instagramUrl: newInstagram.trim() || undefined,
          gmbUrl: newGmb.trim() || undefined, youtubeUrl: newYoutube.trim() || undefined,
          tiktokUrl: newTiktok.trim() || undefined, zillowUrl: newZillow.trim() || undefined, yelpUrl: newYelp.trim() || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      const advisor = await res.json();
      setAdvisors((prev) => [...prev, {
        id: advisor.id, name: advisor.name, nmlsNumber: advisor.nmlsNumber, brand: advisor.brand,
        leader: advisor.leader, email: advisor.email, phone: advisor.phone, streetAddress: advisor.streetAddress,
        city: advisor.city, state: advisor.state, zip: advisor.zip, region: advisor.region,
        licenseStates: advisor.licenseStates, nextAuditDue: advisor.nextAuditDue, photoUrl: advisor.photoUrl,
        color: advisor.color, initials: advisor.initials,
        auditFormUrl: advisor.auditFormUrl, matrixUrl: advisor.matrixUrl,
        canvaUrl: advisor.canvaUrl, socialToolUrl: advisor.socialToolUrl,
        napFormUrl: advisor.napFormUrl, napNotes: advisor.napNotes, status: advisor.status,
        channels: advisor.channels?.map((c: AdvisorChannel) => ({ id: c.id, platform: c.platform, url: c.url, label: c.label })) ?? [],
        openIssues: 0,
      }]);
      resetForm(); setComposing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add advisor");
    } finally {
      setSaving(false);
    }
  };

  const allLeaders = Array.from(new Set([...leaders, ...advisors.map((a) => a.leader).filter(Boolean) as string[]])).sort();
  const filtered = advisors.filter((a) => {
    if (leaderFilter !== "all" && a.leader !== leaderFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!(a.name + (a.brand ?? "") + a.nmlsNumber + (a.city ?? "") + (a.state ?? "")).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openAdvisor = advisors.find((a) => a.id === openId) ?? null;
  const totalSocials = advisors.reduce((s, a) => s + a.channels.filter((c) => CHANNEL_DEFS.some((d) => d.key === c.platform)).length, 0);
  const totalWebsites = advisors.reduce((s, a) => s + a.channels.filter((c) => c.platform === "WEBSITE").length, 0);
  const missingAudit = advisors.filter((a) => !a.auditFormUrl).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Advisors" value={String(advisors.length)} delta="across divisions" />
        <StatCard span={3} label="Websites tracked" value={String(totalWebsites)} delta="incl. microsites" tone="indigo" />
        <StatCard span={3} label="Social accounts" value={String(totalSocials)} delta="8 channels" />
        <StatCard span={3} label="Missing audit form" value={String(missingAudit)}
          delta={missingAudit === 0 ? "All complete" : "Pending review"} tone={missingAudit === 0 ? "green" : "default"} />
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
                <div className="mt-0.5 text-[11px]" style={{ color: "#858889" }}>Fill in what you know — you can edit everything later</div>
              </div>
              <button onClick={() => setComposing(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddAdvisor} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Preferred name *", value: newName, onChange: setNewName, placeholder: "e.g. Aaron Thomas", autoFocus: true },
                  { label: "Brand / team name", value: newBrand, onChange: setNewBrand, placeholder: "e.g. The Welty Team" },
                  { label: "NMLS #", value: newNmls, onChange: setNewNmls, placeholder: "e.g. 1713681" },
                  { label: "Divisional leader", value: newLeader, onChange: setNewLeader, placeholder: "e.g. Josh Mettle" },
                  { label: "Email", value: newEmail, onChange: setNewEmail, placeholder: "advisor@email.com" },
                  { label: "Phone", value: newPhone, onChange: setNewPhone, placeholder: "(555) 000-0000" },
                ].map(({ label, value, onChange, placeholder, autoFocus }) => (
                  <div key={label}>
                    <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{label}</label>
                    <input autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                      className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Street Address</label>
                  <input value={newStreet} onChange={(e) => setNewStreet(e.target.value)} placeholder="123 Main St"
                    className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                </div>
                {[
                  { label: "City", value: newCity, onChange: setNewCity, placeholder: "Round Rock" },
                  { label: "State", value: newState, onChange: setNewState, placeholder: "TX" },
                  { label: "Zip", value: newZip, onChange: setNewZip, placeholder: "78664" },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{label}</label>
                    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                      className="w-full rounded-lg px-3 py-2.5 text-[12.5px]" style={inputStyle} />
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Color</div>
                <div className="flex gap-2">
                  {ADVISOR_COLORS.map((c) => (
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
                    { label: "Website", value: newWebsite, onChange: setNewWebsite },
                    { label: "LinkedIn", value: newLinkedin, onChange: setNewLinkedin },
                    { label: "Facebook", value: newFacebook, onChange: setNewFacebook },
                    { label: "Instagram", value: newInstagram, onChange: setNewInstagram },
                    { label: "Google Business", value: newGmb, onChange: setNewGmb },
                    { label: "YouTube", value: newYoutube, onChange: setNewYoutube },
                    { label: "TikTok", value: newTiktok, onChange: setNewTiktok },
                    { label: "Zillow", value: newZillow, onChange: setNewZillow },
                    { label: "Yelp", value: newYelp, onChange: setNewYelp },
                  ].map(({ label, value, onChange }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-32 shrink-0 text-[11.5px] font-medium" style={{ color: "#a8aaab" }}>{label}</div>
                      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..."
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
        <Chip active={leaderFilter === "all"} onClick={() => setLeaderFilter("all")}>All divisions</Chip>
        {allLeaders.map((l) => (
          <Chip key={l} active={leaderFilter === l} onClick={() => setLeaderFilter(l)}>{l}</Chip>
        ))}
        <div className="ml-auto flex h-9 items-center gap-2 rounded-md px-2.5" style={{ background: "#0a2540", border: "1px solid #1d4368", width: 280 }}>
          <span style={{ color: "#858889" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, brand, NMLS, city…"
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500" style={{ color: "#e2e8f0" }} />
        </div>
      </div>

      {/* Directory table */}
      <div className="overflow-x-auto rounded-lg" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div style={{ minWidth: 980 }}>
          {/* Header */}
          <div className="grid items-center gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase"
            style={{
              gridTemplateColumns: "20px 1.4fr 1.2fr 0.8fr 0.9fr 0.9fr 0.6fr 0.6fr 0.6fr 0.6fr 1.6fr 24px",
              borderBottom: "1px solid #1d4368", color: "#858889", background: "#0a2540", letterSpacing: "0.1em",
            }}>
            <button
              onClick={(e) => toggleSelectAll(filtered.map((a) => a.id), e)}
              className="grid h-4 w-4 place-items-center rounded transition"
              title="Select all"
              style={{
                background: filtered.length > 0 && filtered.every((a) => selected.has(a.id)) ? "#5bcbf5" : "#14375a",
                border: "1px solid #1d4368",
              }}
            >
              {filtered.length > 0 && filtered.every((a) => selected.has(a.id)) && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#061320" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {filtered.length > 0 && filtered.some((a) => selected.has(a.id)) && !filtered.every((a) => selected.has(a.id)) && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
            <div>Name</div><div>Brand</div><div>NMLS #</div><div>Division Lead</div><div>Location</div>
            <div className="text-center">Audit</div><div className="text-center">Matrix</div>
            <div className="text-center">Canva</div><div className="text-center">Social Tool</div>
            <div>Channels</div><div />
          </div>

          {filtered.map((a, i) => {
            const isSelected = selected.has(a.id);
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(a.id)}
                onKeyDown={(e) => { if (e.key === "Enter") setOpenId(a.id); }}
                className="grid w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
                style={{
                  gridTemplateColumns: "20px 1.4fr 1.2fr 0.8fr 0.9fr 0.9fr 0.6fr 0.6fr 0.6fr 0.6fr 1.6fr 24px",
                  borderBottom: i === filtered.length - 1 ? "none" : "1px solid #1d4368",
                  background: isSelected ? "rgba(91,203,245,0.04)" : undefined,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleSelect(a.id, e)}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded transition hover:scale-110"
                  title={isSelected ? "Deselect" : "Select"}
                  style={{
                    background: isSelected ? "#5bcbf5" : "#14375a",
                    border: `1px solid ${isSelected ? "#5bcbf5" : "#1d4368"}`,
                  }}
                >
                  {isSelected && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#061320" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={a.name} color={a.color} initials={a.initials} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-100">{a.name}</div>
                    {a.email && <div className="truncate text-[10.5px]" style={{ color: "#5d6566" }}>{a.email}</div>}
                  </div>
                </div>
                <div className="truncate text-[12px]" style={{ color: "#cbd5e1" }}>{a.brand ?? "—"}</div>
                <div className="font-mono text-[11.5px] tabular-nums" style={{ color: "#a8aaab" }}>{a.nmlsNumber}</div>
                <div className="truncate text-[12px]" style={{ color: "#cbd5e1" }}>{a.leader ?? "—"}</div>
                <div className="truncate text-[11.5px]" style={{ color: "#a8aaab" }}>
                  {a.city && a.state ? `${a.city}, ${a.state}` : (a.city ?? a.state ?? "—")}
                </div>
                {/* Inline-clickable checklist cells */}
                {CHECKLIST.map(({ field, label }) => {
                  const checked = !!a[field];
                  return (
                    <div key={field} className="flex justify-center">
                      <button
                        onClick={(e) => toggleInlineChecklist(a.id, field, e)}
                        title={`${label}: ${checked ? "Complete — click to uncheck" : "Not set — click to mark complete"}`}
                        className="grid h-5 w-5 place-items-center rounded transition hover:scale-110"
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
                      </button>
                    </div>
                  );
                })}
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 shadow-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368", minWidth: 320 }}
        >
          <span className="text-[13px] font-semibold text-slate-100">
            {selected.size} advisor{selected.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto rounded-md px-3 py-1.5 text-[11.5px] font-medium transition hover:brightness-110"
            style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
          >
            Deselect
          </button>
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
            {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        </div>
      )}

      {/* Detail drawer */}
      <Drawer open={!!openId} onClose={() => setOpenId(null)} width={640}>
        {openAdvisor && (
          <AdvisorDrawerContent
            advisor={openAdvisor}
            onClose={() => setOpenId(null)}
            onUpdate={(id, patch) => setAdvisors((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))}
            onDelete={(id) => { setAdvisors((prev) => prev.filter((a) => a.id !== id)); setOpenId(null); }}
          />
        )}
      </Drawer>
    </div>
  );
}
