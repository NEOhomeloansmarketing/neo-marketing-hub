"use client";

import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  month: number;
  year: number;
  dudaTemplate: string | null;
  emailBlasts: string | null;
  smsBlasts: string | null;
  canvaLink1: string | null;
  canvaLink2: string | null;
  canvaLink3: string | null;
  videoScript: string | null;
  launched: boolean;
  launchedAt: string | null;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  dudaTemplate: "",
  emailBlasts: "",
  smsBlasts: "",
  canvaLink1: "",
  canvaLink2: "",
  canvaLink3: "",
  videoScript: "",
};

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconRocket({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
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

function IconTrash({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

function IconLink({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; rows?: number;
}) {
  const base = {
    background: "#061320",
    border: "1px solid #1d4368",
    color: "#e2e8f0",
    borderRadius: 6,
    fontSize: 13,
    width: "100%",
    outline: "none",
    padding: "8px 12px",
  };
  return (
    <div className="space-y-1.5">
      <label className="block text-[11.5px] font-semibold" style={{ color: "#858889" }}>{label}</label>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...base, resize: "vertical" }}
          onFocus={(e) => (e.target.style.borderColor = "#5bcbf5")}
          onBlur={(e) => (e.target.style.borderColor = "#1d4368")}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={base}
          onFocus={(e) => (e.target.style.borderColor = "#5bcbf5")}
          onBlur={(e) => (e.target.style.borderColor = "#1d4368")}
        />
      )}
    </div>
  );
}

function CampaignModal({ month, year, initial, onClose, onSave }: {
  month: number; year: number; initial?: Campaign;
  onClose: () => void; onSave: (c: Campaign) => void;
}) {
  const [form, setForm] = useState(initial ? {
    title: initial.title,
    description: initial.description ?? "",
    dudaTemplate: initial.dudaTemplate ?? "",
    emailBlasts: initial.emailBlasts ?? "",
    smsBlasts: initial.smsBlasts ?? "",
    canvaLink1: initial.canvaLink1 ?? "",
    canvaLink2: initial.canvaLink2 ?? "",
    canvaLink3: initial.canvaLink3 ?? "",
    videoScript: initial.videoScript ?? "",
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        month,
        year,
        canvaLink1: form.canvaLink1 || null,
        canvaLink2: form.canvaLink2 || null,
        canvaLink3: form.canvaLink3 || null,
      };
      const res = initial
        ? await fetch(`/api/campaigns/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      onSave(await res.json());
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-xl shadow-2xl"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1d4368" }}>
          <div>
            <div className="text-[16px] font-bold text-slate-100">
              {initial ? "Edit Campaign" : "Add Monthly Campaign"}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "#858889" }}>
              {MONTHS[month - 1]} {year}
            </div>
          </div>
          <button onClick={onClose} className="text-[20px] leading-none" style={{ color: "#5d6566" }}>✕</button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <Field label="Campaign Title *" value={form.title} onChange={set("title")} placeholder="e.g. HELOCs — Spring Push" />
          <Field label="Description" value={form.description} onChange={set("description")} placeholder="What is this campaign about?" rows={3} />

          <div style={{ borderTop: "1px solid #1d4368" }} className="pt-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#5bcbf5" }}>Assets & Content</div>
            <Field label="Duda Template" value={form.dudaTemplate} onChange={set("dudaTemplate")} placeholder="Template name or URL" />
            <Field label="Email Blasts" value={form.emailBlasts} onChange={set("emailBlasts")} placeholder="Describe or link the email blasts" rows={2} />
            <Field label="SMS Blasts" value={form.smsBlasts} onChange={set("smsBlasts")} placeholder="Describe or link the SMS blasts" rows={2} />
          </div>

          <div style={{ borderTop: "1px solid #1d4368" }} className="pt-4 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#a855f7" }}>Social Media Content</div>
            <div className="text-[11.5px]" style={{ color: "#5d6566" }}>Paste up to 3 Canva links for social content</div>
            <Field label="Canva Link 1" value={form.canvaLink1} onChange={set("canvaLink1")} placeholder="https://www.canva.com/..." />
            <Field label="Canva Link 2" value={form.canvaLink2} onChange={set("canvaLink2")} placeholder="https://www.canva.com/..." />
            <Field label="Canva Link 3" value={form.canvaLink3} onChange={set("canvaLink3")} placeholder="https://www.canva.com/..." />
          </div>

          <div style={{ borderTop: "1px solid #1d4368" }} className="pt-4">
            <Field label="Video Script" value={form.videoScript} onChange={set("videoScript")} placeholder="Paste or write the video script here…" rows={5} />
          </div>

          {error && <p className="text-[12px]" style={{ color: "#f43f5e" }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #1d4368" }}>
          <button onClick={onClose} className="rounded-md px-4 py-2 text-[13px] font-medium transition hover:bg-white/5" style={{ color: "#a8aaab" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 rounded-md px-5 py-2 text-[13px] font-semibold text-white transition disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.25)" }}>
            {saving ? "Saving…" : initial ? "Save Changes" : "Add Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ campaign, onEdit, onDelete, onToggleLaunch }: {
  campaign: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLaunch: () => void;
}) {
  const [launching, setLaunching] = useState(false);

  async function handleLaunch() {
    setLaunching(true);
    await onToggleLaunch();
    setLaunching(false);
  }

  const canvaLinks = [campaign.canvaLink1, campaign.canvaLink2, campaign.canvaLink3].filter(Boolean);

  return (
    <div className="rounded-lg p-5 space-y-4" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-bold text-slate-100">{campaign.title}</h3>
            {campaign.launched && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                <IconRocket size={10} /> LAUNCHED
              </span>
            )}
          </div>
          {campaign.description && (
            <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: "#858889" }}>{campaign.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="text-[11px] font-medium px-2.5 py-1 rounded transition hover:bg-white/5" style={{ color: "#a8aaab" }}>
            Edit
          </button>
          <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded transition hover:bg-white/5" style={{ color: "#5d6566" }}>
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campaign.dudaTemplate && (
          <div className="rounded-md p-3 space-y-1" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#5bcbf5" }}>Duda Template</div>
            <div className="text-[12.5px] text-slate-100 break-all">{campaign.dudaTemplate}</div>
          </div>
        )}
        {campaign.emailBlasts && (
          <div className="rounded-md p-3 space-y-1" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Email Blasts</div>
            <div className="text-[12.5px] whitespace-pre-wrap" style={{ color: "#a8aaab" }}>{campaign.emailBlasts}</div>
          </div>
        )}
        {campaign.smsBlasts && (
          <div className="rounded-md p-3 space-y-1" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#22c55e" }}>SMS Blasts</div>
            <div className="text-[12.5px] whitespace-pre-wrap" style={{ color: "#a8aaab" }}>{campaign.smsBlasts}</div>
          </div>
        )}
        {canvaLinks.length > 0 && (
          <div className="rounded-md p-3 space-y-2" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#a855f7" }}>Social Media (Canva)</div>
            {canvaLinks.map((link, i) => (
              <a key={i} href={link!} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] hover:underline"
                style={{ color: "#a855f7" }}>
                <IconLink /> Link {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>

      {campaign.videoScript && (
        <div className="rounded-md p-3 space-y-2" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#6366f1" }}>Video Script</div>
          <p className="text-[12.5px] whitespace-pre-wrap leading-relaxed" style={{ color: "#a8aaab" }}>{campaign.videoScript}</p>
        </div>
      )}

      {/* Launch button */}
      <div className="flex items-center justify-between pt-1">
        {campaign.launched && campaign.launchedAt && (
          <span className="text-[11px]" style={{ color: "#5d6566" }}>
            Launched {new Date(campaign.launchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
        {!campaign.launched && <span />}
        <button
          onClick={handleLaunch}
          disabled={launching}
          className="flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold transition disabled:opacity-50"
          style={campaign.launched
            ? { background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }
            : { background: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }
          }
        >
          <IconRocket size={13} />
          {campaign.launched ? "Mark as Not Launched" : "Mark as Launched"}
        </button>
      </div>
    </div>
  );
}

export function CampaignsView({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [openMonths, setOpenMonths] = useState<Set<string>>(
    new Set([`${currentYear}-${currentMonth}`])
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [modal, setModal] = useState<{ month: number; year: number; campaign?: Campaign } | null>(null);

  const years = Array.from(new Set([currentYear - 1, currentYear, currentYear + 1]));

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  async function toggleLaunch(campaign: Campaign) {
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ launched: !campaign.launched }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
  }

  function onSave(saved: Campaign) {
    setCampaigns((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
    setModal(null);
  }

  const monthsForYear = MONTHS.map((name, i) => {
    const month = i + 1;
    const key = `${selectedYear}-${month}`;
    const monthCampaigns = campaigns.filter((c) => c.year === selectedYear && c.month === month);
    const isOpen = openMonths.has(key);
    const isCurrent = selectedYear === currentYear && month === currentMonth;
    const isPast = selectedYear < currentYear || (selectedYear === currentYear && month < currentMonth);

    return { name, month, key, monthCampaigns, isOpen, isCurrent, isPast };
  });

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        {years.map((y) => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className="rounded-md px-4 py-1.5 text-[13px] font-semibold transition"
            style={selectedYear === y
              ? { background: "#5bcbf5", color: "#061320" }
              : { background: "#0e2b48", color: "#a8aaab", border: "1px solid #1d4368" }}>
            {y}
          </button>
        ))}
      </div>

      {/* Month accordions */}
      <div className="space-y-2">
        {monthsForYear.map(({ name, month, key, monthCampaigns, isOpen, isCurrent, isPast }) => (
          <div key={key} className="rounded-lg overflow-hidden"
            style={{ border: isCurrent ? "1px solid #5bcbf5" : "1px solid #1d4368" }}>

            {/* Month header */}
            <button
              onClick={() => toggleMonth(key)}
              className="flex w-full items-center justify-between px-5 py-3.5 transition hover:bg-white/[0.02]"
              style={{ background: "#0e2b48" }}>
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold" style={{ color: isCurrent ? "#5bcbf5" : "#cbd5e1" }}>
                  {name} {selectedYear}
                </span>
                {isCurrent && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(91,203,245,0.15)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.3)" }}>
                    Current
                  </span>
                )}
                {monthCampaigns.length > 0 && (
                  <span className="text-[11px] font-medium" style={{ color: "#5d6566" }}>
                    {monthCampaigns.length} campaign{monthCampaigns.length !== 1 ? "s" : ""}
                    {monthCampaigns.some((c) => c.launched) && (
                      <span style={{ color: "#22c55e" }}> · {monthCampaigns.filter((c) => c.launched).length} launched</span>
                    )}
                  </span>
                )}
              </div>
              <span style={{ color: "#5d6566" }}><IconChevron open={isOpen} /></span>
            </button>

            {/* Month body */}
            {isOpen && (
              <div className="px-5 pb-5 pt-3 space-y-3" style={{ background: "#061320" }}>
                {monthCampaigns.length === 0 && (
                  <p className="text-[12.5px]" style={{ color: "#5d6566" }}>
                    No campaigns added for {name} yet.
                  </p>
                )}
                {monthCampaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onEdit={() => setModal({ month, year: selectedYear, campaign: c })}
                    onDelete={() => deleteCampaign(c.id)}
                    onToggleLaunch={() => toggleLaunch(c)}
                  />
                ))}
                <button
                  onClick={() => { setModal({ month, year: selectedYear }); setOpenMonths((p) => new Set([...p, key])); }}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-[12.5px] font-semibold transition hover:brightness-110"
                  style={{ background: "#0e2b48", color: "#5bcbf5", border: "1px solid #1d4368" }}>
                  <IconPlus /> Add Monthly Campaign
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <CampaignModal
          month={modal.month}
          year={modal.year}
          initial={modal.campaign}
          onClose={() => setModal(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}
