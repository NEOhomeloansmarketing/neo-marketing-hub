"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

type RequestStatus = "NEW" | "IN_REVIEW" | "IN_PRODUCTION" | "READY_FOR_REVIEW" | "DELIVERED" | "ARCHIVED";
type RequestType = "SOCIAL_POST" | "FLYER" | "EMAIL" | "VIDEO" | "GRAPHIC" | "HEADSHOT" | "BIO" | "OTHER";
type Priority = "LOW" | "MEDIUM" | "HIGH";

interface Assignee {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface MarketingRequest {
  id: string;
  title: string;
  description?: string | null;
  requestType: RequestType;
  status: RequestStatus;
  priority: Priority;
  advisorName?: string | null;
  advisorEmail?: string | null;
  advisorNmls?: string | null;
  assigneeId?: string | null;
  assignee?: Assignee | null;
  dueDate?: string | null;
  notes?: string | null;
  formData?: Record<string, string> | null;
  submissionId?: string | null;
  createdAt: string;
}

interface RequestsViewProps {
  requests: MarketingRequest[];
  teamMembers: Assignee[];
}

const COLUMNS: { id: RequestStatus; label: string; color: string; accent: string }[] = [
  { id: "NEW", label: "New", color: "#5bcbf5", accent: "rgba(91,203,245,0.12)" },
  { id: "IN_REVIEW", label: "In Review", color: "#f59e0b", accent: "rgba(245,158,11,0.12)" },
  { id: "IN_PRODUCTION", label: "In Production", color: "#6366f1", accent: "rgba(99,102,241,0.12)" },
  { id: "READY_FOR_REVIEW", label: "Ready to Review", color: "#a855f7", accent: "rgba(168,85,247,0.12)" },
  { id: "DELIVERED", label: "Delivered", color: "#22c55e", accent: "rgba(34,197,94,0.12)" },
];

const TYPE_LABELS: Record<RequestType, string> = {
  SOCIAL_POST: "Social Post",
  FLYER: "Flyer",
  EMAIL: "Email",
  VIDEO: "Video",
  GRAPHIC: "Graphic",
  HEADSHOT: "Headshot",
  BIO: "Bio",
  OTHER: "Other",
};

const TYPE_COLOR: Record<RequestType, string> = {
  SOCIAL_POST: "#5bcbf5",
  FLYER: "#f59e0b",
  EMAIL: "#6366f1",
  VIDEO: "#f43f5e",
  GRAPHIC: "#a855f7",
  HEADSHOT: "#14b8a6",
  BIO: "#fb923c",
  OTHER: "#858889",
};

const PRIORITY_STYLE: Record<Priority, { color: string; bg: string; border: string }> = {
  HIGH:   { color: "#fca5a5", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  MEDIUM: { color: "#fcd34d", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  LOW:    { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)" },
};

const REQUEST_TYPES: RequestType[] = ["SOCIAL_POST", "FLYER", "EMAIL", "VIDEO", "GRAPHIC", "HEADSHOT", "BIO", "OTHER"];
const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];

const inputStyle: React.CSSProperties = {
  background: "#0a2540",
  border: "1px solid #1d4368",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 12.5,
  padding: "7px 11px",
  outline: "none",
  width: "100%",
};

function TypeChip({ type }: { type: RequestType }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-semibold"
      style={{ background: TYPE_COLOR[type] + "22", color: TYPE_COLOR[type], border: `1px solid ${TYPE_COLOR[type]}44` }}>
      {TYPE_LABELS[type]}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  const s = PRIORITY_STYLE[priority];
  return <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} title={priority} />;
}

function RequestCard({ req, onClick }: { req: MarketingRequest; onClick: () => void }) {
  const overdue = req.dueDate && new Date(req.dueDate) < new Date() && req.status !== "DELIVERED";
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg p-3 text-left transition hover:brightness-110"
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
    >
      <div className="flex items-start gap-2">
        <PriorityDot priority={req.priority} />
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold leading-snug text-slate-100 line-clamp-2">{req.title}</div>
          {req.advisorName && (
            <div className="mt-1 text-[11px]" style={{ color: "#858889" }}>{req.advisorName}</div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TypeChip type={req.requestType} />
        {req.dueDate && (
          <span className="text-[10.5px] font-medium" style={{ color: overdue ? "#fca5a5" : "#858889" }}>
            {overdue ? "⚠ " : ""}Due {new Date(req.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {(req.assignee || req.description) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {req.description && (
            <p className="flex-1 truncate text-[11px] leading-snug" style={{ color: "#858889" }}>
              {req.description}
            </p>
          )}
          {req.assignee && (
            <Avatar name={req.assignee.name} color={req.assignee.color} initials={req.assignee.initials} size={18} />
          )}
        </div>
      )}
    </button>
  );
}

function RequestDetailPanel({
  req,
  teamMembers,
  onClose,
  onUpdate,
  onDelete,
}: {
  req: MarketingRequest;
  teamMembers: Assignee[];
  onClose: () => void;
  onUpdate: (updated: MarketingRequest) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<RequestStatus>(req.status);
  const [title, setTitle] = useState(req.title);
  const [description, setDescription] = useState(req.description ?? "");
  const [requestType, setRequestType] = useState<RequestType>(req.requestType);
  const [priority, setPriority] = useState<Priority>(req.priority);
  const [assigneeId, setAssigneeId] = useState(req.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(req.dueDate ? req.dueDate.slice(0, 10) : "");
  const [notes, setNotes] = useState(req.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const patch = async (patch: Partial<MarketingRequest>) => {
    const res = await fetch(`/api/requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate({ ...req, ...updated });
    }
  };

  const moveStatus = async (s: RequestStatus) => {
    setStatus(s);
    await patch({ status: s });
  };

  const handleSave = async () => {
    setSaving(true);
    await patch({ title, description: description || undefined, requestType, priority, assigneeId: assigneeId || undefined, dueDate: dueDate || undefined, notes: notes || undefined });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this request? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/requests/${req.id}`, { method: "DELETE" });
    onDelete(req.id);
    onClose();
  };

  const SL = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{children}</div>
  );

  const col = COLUMNS.find((c) => c.id === status);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
      <div
        className="relative ml-auto flex h-full w-full max-w-[600px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
          <div className="flex items-center gap-2.5">
            <TypeChip type={requestType} />
            <span className="rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold" style={{ background: col?.accent ?? "#14375a", color: col?.color ?? "#a8aaab", border: `1px solid ${col?.color ?? "#1d4368"}44` }}>
              {col?.label ?? status}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} disabled={deleting} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-red-500/10 disabled:opacity-50" style={{ color: "#5d6566" }} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={2}
            className="w-full resize-none bg-transparent text-[20px] font-bold tracking-tight outline-none placeholder:text-slate-600"
            style={{ color: "#f1f5f9" }}
          />

          {/* Pipeline */}
          <div>
            <SL>Move to stage</SL>
            <div className="flex flex-wrap gap-1.5">
              {COLUMNS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => moveStatus(c.id)}
                  className="rounded-full px-3 py-1 text-[11.5px] font-semibold transition hover:brightness-110"
                  style={{
                    background: status === c.id ? c.accent : "#0a2540",
                    color: status === c.id ? c.color : "#5d6566",
                    border: `1px solid ${status === c.id ? c.color + "66" : "#1d4368"}`,
                  }}
                >
                  {c.label}
                </button>
              ))}
              <button
                onClick={() => moveStatus("ARCHIVED")}
                className="rounded-full px-3 py-1 text-[11.5px] font-semibold transition hover:brightness-110"
                style={{ background: status === "ARCHIVED" ? "rgba(107,114,128,0.2)" : "#0a2540", color: status === "ARCHIVED" ? "#9ca3af" : "#5d6566", border: "1px solid #1d4368" }}
              >
                Archive
              </button>
            </div>
          </div>

          {/* Advisor info (read-only if from JotForm) */}
          {(req.advisorName || req.advisorEmail || req.advisorNmls) && (
            <div className="rounded-lg p-4 space-y-1" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#858889" }}>From advisor</div>
              {req.advisorName && <div className="text-[13px] font-semibold text-slate-100">{req.advisorName}</div>}
              {req.advisorEmail && <div className="text-[12px]" style={{ color: "#5bcbf5" }}>{req.advisorEmail}</div>}
              {req.advisorNmls && <div className="text-[11px] font-mono" style={{ color: "#a8aaab" }}>NMLS {req.advisorNmls}</div>}
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SL>Type</SL>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType)} style={inputStyle}>
                {REQUEST_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <SL>Priority</SL>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => {
                  const s = PRIORITY_STYLE[p];
                  return (
                    <button key={p} onClick={() => setPriority(p)} className="flex-1 rounded-lg py-2 text-[11px] font-bold transition"
                      style={{ background: priority === p ? s.bg : "#0a2540", color: priority === p ? s.color : "#5d6566", border: `1.5px solid ${priority === p ? s.border : "#1d4368"}` }}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <SL>Assignee</SL>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={inputStyle}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <SL>Due date</SL>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
          </div>

          {/* Description */}
          <div>
            <SL>Request details</SL>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the request…"
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }} />
          </div>

          {/* Internal notes */}
          <div>
            <SL>Internal notes</SL>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes for the team…"
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }} />
          </div>

          {/* Raw form data from JotForm */}
          {req.formData && Object.keys(req.formData).length > 0 && (
            <div>
              <SL>JotForm submission data</SL>
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1d4368" }}>
                {Object.entries(req.formData)
                  .filter(([k]) => !["submissionID", "formID", "formTitle", "pretty", "rawRequest"].includes(k))
                  .map(([k, v], i, arr) => (
                    <div key={k} className="flex gap-3 px-3 py-2 text-[11.5px]"
                      style={{ borderBottom: i < arr.length - 1 ? "1px solid #1d4368" : "none", background: i % 2 === 0 ? "#0a2540" : "#0e2b48" }}>
                      <span className="w-40 shrink-0 font-medium" style={{ color: "#858889" }}>
                        {k.replace(/^q\d+_/, "").replace(/_/g, " ")}
                      </span>
                      <span className="flex-1 break-words" style={{ color: "#cbd5e1" }}>{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12.5px] font-semibold hover:bg-white/[0.04]" style={{ color: "#a8aaab" }}>
            Discard
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", boxShadow: "0 4px 18px rgba(91,203,245,0.35)" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewRequestPanel({
  teamMembers,
  onClose,
  onCreated,
}: {
  teamMembers: Assignee[];
  onClose: () => void;
  onCreated: (req: MarketingRequest) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("OTHER");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [advisorName, setAdvisorName] = useState("");
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorNmls, setAdvisorNmls] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const SL = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{children}</div>
  );

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description || undefined, requestType, priority, advisorName: advisorName || undefined, advisorEmail: advisorEmail || undefined, advisorNmls: advisorNmls || undefined, assigneeId: assigneeId || undefined, dueDate: dueDate || undefined }),
    });
    if (res.ok) {
      const created = await res.json();
      onCreated(created);
      onClose();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to create request");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
      <div className="relative ml-auto flex h-full w-full max-w-[560px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}>
        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
          <div className="text-[16px] font-bold text-slate-100">New marketing request</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <textarea autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Request title…" rows={2}
              className="w-full resize-none bg-transparent text-[22px] font-bold tracking-tight outline-none placeholder:text-slate-600"
              style={{ color: "#f1f5f9" }} />
            {error && <p className="mt-1 text-[11.5px]" style={{ color: "#fca5a5" }}>{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SL>Type</SL>
              <select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType)} style={inputStyle}>
                {REQUEST_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <SL>Priority</SL>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => {
                  const s = PRIORITY_STYLE[p];
                  return (
                    <button key={p} onClick={() => setPriority(p)} className="flex-1 rounded-lg py-2 text-[11px] font-bold transition"
                      style={{ background: priority === p ? s.bg : "#0a2540", color: priority === p ? s.color : "#5d6566", border: `1.5px solid ${priority === p ? s.border : "#1d4368"}` }}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <SL>Assign to</SL>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={inputStyle}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <SL>Due date</SL>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
          </div>

          <div>
            <SL>Advisor info</SL>
            <div className="space-y-2">
              <input value={advisorName} onChange={(e) => setAdvisorName(e.target.value)} placeholder="Advisor name" style={inputStyle} />
              <input value={advisorEmail} onChange={(e) => setAdvisorEmail(e.target.value)} placeholder="Email (optional)" style={inputStyle} />
              <input value={advisorNmls} onChange={(e) => setAdvisorNmls(e.target.value)} placeholder="NMLS # (optional)" style={inputStyle} />
            </div>
          </div>

          <div>
            <SL>Details</SL>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe the request, dimensions, copy, links…"
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }} />
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12.5px] font-semibold hover:bg-white/[0.04]" style={{ color: "#a8aaab" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", boxShadow: "0 4px 18px rgba(91,203,245,0.35)" }}>
            {saving ? "Creating…" : "Create request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequestsView({ requests: initialRequests, teamMembers }: RequestsViewProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [openReq, setOpenReq] = useState<MarketingRequest | null>(null);
  const [composing, setComposing] = useState(false);
  const [filterType, setFilterType] = useState<RequestType | "ALL">("ALL");
  const [showArchived, setShowArchived] = useState(false);

  const visible = requests.filter((r) => {
    if (!showArchived && r.status === "ARCHIVED") return false;
    if (filterType !== "ALL" && r.requestType !== filterType) return false;
    return true;
  });

  const byStatus = (status: RequestStatus) => visible.filter((r) => r.status === status);

  const totalOpen = requests.filter((r) => r.status !== "DELIVERED" && r.status !== "ARCHIVED").length;
  const totalDelivered = requests.filter((r) => r.status === "DELIVERED").length;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-3">
          <div className="rounded-lg px-4 py-2" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[11px] font-medium" style={{ color: "#858889" }}>Open</div>
            <div className="text-[20px] font-bold text-slate-100">{totalOpen}</div>
          </div>
          <div className="rounded-lg px-4 py-2" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[11px] font-medium" style={{ color: "#858889" }}>Delivered</div>
            <div className="text-[20px] font-bold" style={{ color: "#22c55e" }}>{totalDelivered}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterType("ALL")}
            className="rounded-full px-3 py-1 text-[11.5px] font-semibold transition"
            style={{ background: filterType === "ALL" ? "rgba(91,203,245,0.15)" : "#0a2540", color: filterType === "ALL" ? "#5bcbf5" : "#858889", border: `1px solid ${filterType === "ALL" ? "rgba(91,203,245,0.4)" : "#1d4368"}` }}>
            All types
          </button>
          {REQUEST_TYPES.map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className="rounded-full px-3 py-1 text-[11.5px] font-semibold transition"
              style={{ background: filterType === t ? TYPE_COLOR[t] + "22" : "#0a2540", color: filterType === t ? TYPE_COLOR[t] : "#858889", border: `1px solid ${filterType === t ? TYPE_COLOR[t] + "55" : "#1d4368"}` }}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px]" style={{ color: "#858889" }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} style={{ accentColor: "#5bcbf5" }} />
            Show archived
          </label>
          <button onClick={() => setComposing(true)}
            className="rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:brightness-110"
            style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}>
            + New request
          </button>
        </div>
      </div>

      {/* JotForm webhook tip */}
      <div className="flex items-start gap-3 rounded-lg p-3.5" style={{ background: "rgba(91,203,245,0.06)", border: "1px solid rgba(91,203,245,0.2)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-[12px]" style={{ color: "#cbd5e1" }}>
          <span className="font-semibold text-slate-100">JotForm webhook URL:</span>{" "}
          <code className="rounded px-1.5 py-0.5 text-[11px]" style={{ background: "#0a2540", color: "#5bcbf5", border: "1px solid #1d4368" }}>
            {typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/api/webhooks/jotform
          </code>
          {" "}— paste this into your JotForm → Settings → Integrations → Webhooks.
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {COLUMNS.map((col) => {
          const colRequests = byStatus(col.id);
          return (
            <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-xl overflow-hidden" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1d4368", background: "#0e2b48" }}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12.5px] font-semibold text-slate-100">{col.label}</span>
                </div>
                <span className="rounded-full px-2 py-[2px] text-[10px] font-semibold tabular-nums" style={{ background: col.accent, color: col.color }}>
                  {colRequests.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {colRequests.length === 0 && (
                  <p className="py-6 text-center text-[11.5px]" style={{ color: "#5d6566" }}>No requests</p>
                )}
                {colRequests.map((r) => (
                  <RequestCard key={r.id} req={r} onClick={() => setOpenReq(r)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {openReq && (
        <RequestDetailPanel
          req={openReq}
          teamMembers={teamMembers}
          onClose={() => setOpenReq(null)}
          onUpdate={(updated) => {
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setOpenReq(updated);
          }}
          onDelete={(id) => { setRequests((prev) => prev.filter((r) => r.id !== id)); setOpenReq(null); }}
        />
      )}

      {/* New request panel */}
      {composing && (
        <NewRequestPanel
          teamMembers={teamMembers}
          onClose={() => setComposing(false)}
          onCreated={(req) => setRequests((prev) => [req, ...prev])}
        />
      )}
    </div>
  );
}
