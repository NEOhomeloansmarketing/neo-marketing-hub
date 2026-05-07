"use client";

import { useState, useMemo } from "react";
import { StatCard } from "@/components/ui/StatCard";

const IDEA_TAGS = [
  { id: "campaign", label: "Campaign", color: "#5bcbf5" },
  { id: "content", label: "Content", color: "#22c55e" },
  { id: "brand", label: "Brand", color: "#8b5cf6" },
  { id: "growth", label: "Growth", color: "#f59e0b" },
  { id: "product", label: "Product", color: "#06b6d4" },
  { id: "ops", label: "Ops", color: "#ec4899" },
  { id: "social", label: "Social", color: "#fb923c" },
  { id: "email", label: "Email", color: "#a855f7" },
  { id: "seo", label: "SEO", color: "#14b8a6" },
  { id: "pr", label: "PR", color: "#f43f5e" },
];

export const IDEA_STATUSES = [
  { id: "PARKED", label: "Parked", color: "#858889" },
  { id: "QUEUED", label: "Up next", color: "#5bcbf5" },
  { id: "ACTIVE", label: "In progress", color: "#f59e0b" },
  { id: "SHIPPED", label: "Shipped", color: "#22c55e" },
  { id: "ARCHIVED", label: "Archived", color: "#5d6566" },
];

const IDEA_PRIORITIES = [
  { id: "HIGH", label: "High", color: "#ef4444" },
  { id: "MEDIUM", label: "Medium", color: "#f59e0b" },
  { id: "LOW", label: "Low", color: "#64748b" },
];

type Idea = {
  id: string;
  title: string;
  body: string | null;
  authorId: string;
  authorName: string;
  authorColor: string;
  authorInitials: string;
  tags: string[];
  status: string;
  priority?: string | null;
  targetDate?: string | null;
  link?: string | null;
  votes: number;
  votedByCurrentUser: boolean;
  commentCount: number;
  createdAt: string;
};

type Props = {
  ideas: Idea[];
  currentUserId: string;
};

function IdeaTag({ tag }: { tag: string }) {
  const t = IDEA_TAGS.find((x) => x.id === tag);
  if (!t) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold"
      style={{ background: t.color + "1f", color: t.color, border: `1px solid ${t.color}44` }}>
      {t.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const s = IDEA_STATUSES.find((x) => x.id === status) || IDEA_STATUSES[0];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function VoteButton({ votes, voted, onVote }: { votes: number; voted: boolean; onVote: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onVote(); }}
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-1.5 py-1.5 transition"
      style={{ background: voted ? "rgba(91,203,245,0.16)" : "#14375a", border: `1px solid ${voted ? "rgba(91,203,245,0.45)" : "#1d4368"}`, color: voted ? "#5bcbf5" : "#cbd5e1", minWidth: 38 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
      </svg>
      <span className="text-[12px] font-bold tabular-nums">{votes}</span>
    </button>
  );
}

// ─── Idea detail drawer ─────────────────────────────────────────────────────
function IdeaDetailDrawer({
  idea,
  onClose,
  onUpdate,
  onDelete,
}: {
  idea: Idea;
  onClose: () => void;
  onUpdate: (updated: Idea) => void;
  onDelete: (id: string) => void;
}) {
  const [editTitle, setEditTitle] = useState(idea.title);
  const [editBody, setEditBody] = useState(idea.body ?? "");
  const [editStatus, setEditStatus] = useState(idea.status);
  const [editPriority, setEditPriority] = useState(idea.priority ?? "MEDIUM");
  const [editTags, setEditTags] = useState<string[]>(idea.tags ?? []);
  const [editLink, setEditLink] = useState(idea.link ?? "");
  const [editTargetDate, setEditTargetDate] = useState(idea.targetDate ? idea.targetDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim() || null,
          status: editStatus,
          tags: editTags,
        }),
      });
      if (res.ok) {
        onUpdate({ ...idea, title: editTitle.trim(), body: editBody.trim() || null, status: editStatus, tags: editTags, priority: editPriority, link: editLink || null, targetDate: editTargetDate || null });
      }
    } finally {
      setSaving(false);
    }
    onClose();
  };

  const handleStatusChange = async (newStatus: string) => {
    setEditStatus(newStatus);
    try {
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onUpdate({ ...idea, status: newStatus });
    } catch { /* silent */ }
  };

  const SL = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{children}</div>
  );

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
      <div className="relative ml-auto flex h-full w-full max-w-[560px] flex-col" onClick={(e) => e.stopPropagation()}
        style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
          <StatusDot status={editStatus} />
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <textarea value={editTitle} onChange={(e) => setEditTitle(e.target.value)} rows={2}
            className="w-full resize-none bg-transparent text-[22px] font-bold leading-snug tracking-tight outline-none"
            style={{ color: "#f1f5f9" }} />

          {/* Status pipeline */}
          <div>
            <SL>Move through pipeline</SL>
            <div className="flex gap-2 flex-wrap">
              {IDEA_STATUSES.filter(s => s.id !== "ARCHIVED").map((s) => (
                <button key={s.id} onClick={() => handleStatusChange(s.id)}
                  className="rounded-lg px-3 py-2 text-[11.5px] font-semibold transition"
                  style={{
                    background: editStatus === s.id ? s.color + "22" : "#0e2b48",
                    color: editStatus === s.id ? s.color : "#5d6566",
                    border: `1.5px solid ${editStatus === s.id ? s.color + "66" : "#1d4368"}`,
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SL>Priority</SL>
              <div className="flex gap-1.5">
                {IDEA_PRIORITIES.map((p) => (
                  <button key={p.id} onClick={() => setEditPriority(p.id)}
                    className="flex-1 rounded-lg py-2 text-[11px] font-bold transition"
                    style={{
                      background: editPriority === p.id ? p.color + "22" : "#0e2b48",
                      color: editPriority === p.id ? p.color : "#5d6566",
                      border: `1.5px solid ${editPriority === p.id ? p.color + "66" : "#1d4368"}`,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <SL>Target date</SL>
              <input type="date" value={editTargetDate} onChange={(e) => setEditTargetDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: editTargetDate ? "#e2e8f0" : "#5d6566", colorScheme: "dark" }} />
            </div>
          </div>

          <div>
            <SL>Details</SL>
            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
              placeholder="What's the idea? Why does it matter? Any prior thinking?"
              rows={5} className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#cbd5e1" }} />
          </div>

          <div>
            <SL>Reference link</SL>
            <input type="url" value={editLink} onChange={(e) => setEditLink(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
              style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#e2e8f0" }} />
          </div>

          <div>
            <SL>Tags</SL>
            <div className="flex flex-wrap gap-1.5">
              {IDEA_TAGS.map((t) => {
                const on = editTags.includes(t.id);
                return (
                  <button key={t.id} onClick={() => setEditTags(on ? editTags.filter(x => x !== t.id) : [...editTags, t.id])}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition"
                    style={{ background: on ? t.color + "1f" : "#0e2b48", color: on ? t.color : "#5d6566", border: `1px solid ${on ? t.color + "55" : "#1d4368"}` }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1">
            <div className="text-[11px]" style={{ color: "#5d6566" }}>
              Submitted by <span style={{ color: "#a8aaab" }}>{idea.authorName}</span> · {new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}>
          <button onClick={() => { onDelete(idea.id); onClose(); }}
            className="text-[12px] font-medium hover:underline" style={{ color: "#5d6566" }}>
            Archive idea
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12.5px] font-semibold hover:bg-white/[0.04]" style={{ color: "#a8aaab" }}>
              Discard
            </button>
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
              style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 18px rgba(91,203,245,0.35)" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Idea card ────────────────────────────────────────────────────────────────
function IdeaCard({ idea, onVote, onOpen, compact = false }: { idea: Idea; onVote: (id: string) => void; onOpen: (idea: Idea) => void; compact?: boolean }) {
  const createdLabel = new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const priority = IDEA_PRIORITIES.find(p => p.id === idea.priority);
  return (
    <article onClick={() => onOpen(idea)} className="rounded-lg p-4 transition hover:-translate-y-0.5 cursor-pointer"
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <div className="flex items-start gap-3">
        <VoteButton votes={idea.votes} voted={idea.votedByCurrentUser} onVote={() => onVote(idea.id)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-100" style={{ letterSpacing: "-0.005em" }}>
              {idea.title}
            </h3>
            <StatusDot status={idea.status} />
          </div>
          {!compact && idea.body && (
            <p className="mt-1.5 text-[12px] leading-relaxed line-clamp-2" style={{ color: "#a8aaab" }}>
              {idea.body}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {idea.tags.map((t) => <IdeaTag key={t} tag={t} />)}
            {priority && !compact && (
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold"
                style={{ background: priority.color + "1f", color: priority.color, border: `1px solid ${priority.color}44` }}>
                {priority.label}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10.5px]" style={{ color: "#858889" }}>
            <div className="flex items-center gap-1.5">
              <span className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold"
                style={{ background: idea.authorColor, color: "#fff" }}>
                {idea.authorInitials}
              </span>
              <span style={{ color: "#cbd5e1" }}>{idea.authorName.split(" ")[0]}</span>
              <span>· {createdLabel}</span>
              {idea.targetDate && <span>· Due {new Date(idea.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            </div>
            <div className="flex items-center gap-1 text-[10.5px]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {idea.commentCount}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function IdeaBoardLayout({ ideas, onVote, onOpen }: { ideas: Idea[]; onVote: (id: string) => void; onOpen: (idea: Idea) => void }) {
  const cols = IDEA_STATUSES.filter((s) => s.id !== "ARCHIVED");
  return (
    <div className="grid grid-cols-4 gap-4">
      {cols.map((col) => {
        const colIdeas = ideas.filter((i) => i.status === col.id);
        return (
          <div key={col.id} className="min-w-[220px]">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[11.5px] font-semibold tracking-tight text-slate-100">{col.label}</span>
              <span className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums" style={{ background: "#14375a", color: "#a8aaab" }}>
                {colIdeas.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {colIdeas.length === 0 ? (
                <div className="rounded-lg p-6 text-center text-[11px]"
                  style={{ background: "#0a2540", border: "1px dashed #1d4368", color: "#5d6566" }}>
                  Nothing here yet
                </div>
              ) : (
                colIdeas.map((i) => <IdeaCard key={i.id} idea={i} onVote={onVote} onOpen={onOpen} compact />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IdeaListLayout({ ideas, onVote, onOpen }: { ideas: Idea[]; onVote: (id: string) => void; onOpen: (idea: Idea) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ideas.map((i) => (
        <IdeaCard key={i.id} idea={i} onVote={onVote} onOpen={onOpen} />
      ))}
    </div>
  );
}

function NewIdeaPanel({ onCancel, onSubmit }: {
  onCancel: () => void;
  onSubmit: (data: { title: string; body: string; tags: string[]; priority: string; link: string; targetDate: string; status: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [priority, setPriority] = useState("MEDIUM");
  const [link, setLink] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState("PARKED");

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onCancel}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
      <div className="relative ml-auto flex h-full w-full max-w-[560px] flex-col" onClick={(e) => e.stopPropagation()}
        style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}>

        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
          <div>
            <div className="text-[16px] font-bold tracking-tight text-slate-100">New Idea</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "#858889" }}>Capture your idea and move it through the pipeline</div>
          </div>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the idea?" autoFocus
            className="w-full bg-transparent text-[22px] font-bold leading-snug tracking-tight outline-none placeholder:text-slate-600"
            style={{ color: "#f1f5f9" }} />

          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Start in pipeline</div>
            <div className="flex gap-2 flex-wrap">
              {IDEA_STATUSES.filter(s => s.id !== "ARCHIVED").map((s) => (
                <button key={s.id} onClick={() => setStatus(s.id)}
                  className="rounded-lg px-3 py-2 text-[11.5px] font-semibold transition"
                  style={{ background: status === s.id ? s.color + "22" : "#0e2b48", color: status === s.id ? s.color : "#5d6566", border: `1.5px solid ${status === s.id ? s.color + "66" : "#1d4368"}` }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Priority</div>
              <div className="flex gap-1.5">
                {IDEA_PRIORITIES.map((p) => (
                  <button key={p.id} onClick={() => setPriority(p.id)}
                    className="flex-1 rounded-lg py-2 text-[11px] font-bold transition"
                    style={{ background: priority === p.id ? p.color + "22" : "#0e2b48", color: priority === p.id ? p.color : "#5d6566", border: `1.5px solid ${priority === p.id ? p.color + "66" : "#1d4368"}` }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Target date</div>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: targetDate ? "#e2e8f0" : "#5d6566", colorScheme: "dark" }} />
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Details</div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
              placeholder="Why does this matter? What problem does it solve? Any prior thinking?"
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#cbd5e1" }} />
          </div>

          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Reference link</div>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…"
              className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
              style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#e2e8f0" }} />
          </div>

          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {IDEA_TAGS.map((t) => {
                const on = tags.includes(t.id);
                return (
                  <button key={t.id} onClick={() => setTags(on ? tags.filter(x => x !== t.id) : [...tags, t.id])}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition"
                    style={{ background: on ? t.color + "1f" : "#0e2b48", color: on ? t.color : "#5d6566", border: `1px solid ${on ? t.color + "55" : "#1d4368"}` }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}>
          <button onClick={onCancel} className="rounded-lg px-4 py-2 text-[12.5px] font-semibold hover:bg-white/[0.04]" style={{ color: "#a8aaab" }}>
            Cancel
          </button>
          <button disabled={!title.trim()} onClick={() => onSubmit({ title: title.trim(), body: body.trim(), tags, priority, link, targetDate, status })}
            className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 18px rgba(91,203,245,0.35)" }}>
            Post idea
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition"
      style={{ color: active ? "#e2e8f0" : "#6b7280" }}>
      {label}
      <span className="rounded-full px-1.5 py-[1px] text-[10px] font-semibold tabular-nums"
        style={{ background: active ? "rgba(91,203,245,0.15)" : "#14375a", color: active ? "#5bcbf5" : "#6b7280" }}>
        {count}
      </span>
      {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: "#5bcbf5" }} />}
    </button>
  );
}

export function IdeasView({ ideas: initialIdeas, currentUserId }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [tab, setTab] = useState<"all" | "mine" | "top">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [layout, setLayout] = useState<"board" | "list">("board");
  const [composing, setComposing] = useState(false);
  const [openIdea, setOpenIdea] = useState<Idea | null>(null);

  const parkedCount = ideas.filter((i) => ["PARKED", "QUEUED"].includes(i.status)).length;
  const activeCount = ideas.filter((i) => i.status === "ACTIVE").length;
  const shippedCount = ideas.filter((i) => i.status === "SHIPPED").length;
  const totalVotes = ideas.reduce((s, i) => s + i.votes, 0);
  const myCount = ideas.filter((i) => i.authorId === currentUserId).length;

  const visible = useMemo(() => {
    let list = ideas.filter(i => i.status !== "ARCHIVED");
    if (tab === "mine") list = list.filter((i) => i.authorId === currentUserId);
    if (tab === "top") list = [...list].sort((a, b) => b.votes - a.votes).slice(0, 10);
    if (tagFilter !== "all") list = list.filter((i) => i.tags.includes(tagFilter));
    return list;
  }, [ideas, tab, tagFilter, currentUserId]);

  const toggleVote = async (id: string) => {
    setIdeas((arr) => arr.map((i) => {
      if (i.id !== id) return i;
      const has = i.votedByCurrentUser;
      return { ...i, votedByCurrentUser: !has, votes: has ? i.votes - 1 : i.votes + 1 };
    }));
    try {
      await fetch(`/api/ideas/${id}/vote`, { method: "POST" });
    } catch {
      setIdeas((arr) => arr.map((i) => {
        if (i.id !== id) return i;
        const has = !i.votedByCurrentUser;
        return { ...i, votedByCurrentUser: !has, votes: has ? i.votes - 1 : i.votes + 1 };
      }));
    }
  };

  const handleNewIdea = async (data: { title: string; body: string; tags: string[]; priority: string; link: string; targetDate: string; status: string }) => {
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, body: data.body || null, tags: data.tags, status: data.status }),
      });
      if (res.ok) {
        const idea = await res.json();
        setIdeas((arr) => [idea, ...arr]);
      }
    } catch { /* silently fail */ }
    setComposing(false);
  };

  const handleUpdate = (updated: Idea) => {
    setIdeas((arr) => arr.map((i) => i.id === updated.id ? updated : i));
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      setIdeas((arr) => arr.filter((i) => i.id !== id));
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Ideas in pipeline" value={String(parkedCount)} delta="+3 this week" tone="indigo" />
        <StatCard span={3} label="Active" value={String(activeCount)} delta="being built" />
        <StatCard span={3} label="Shipped (Q2)" value={String(shippedCount)} delta="+1 vs Q1" tone="green" />
        <StatCard span={3} label="Total upvotes" value={String(totalVotes)} delta="from team" />
      </div>

      {/* Tabs + controls */}
      <div className="flex items-end justify-between border-b" style={{ borderColor: "#1d4368" }}>
        <div className="flex items-end gap-0">
          <TabButton active={tab === "all"} onClick={() => setTab("all")} label="All ideas" count={ideas.filter(i => i.status !== "ARCHIVED").length} />
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")} label="My ideas" count={myCount} />
          <TabButton active={tab === "top"} onClick={() => setTab("top")} label="Top voted" count={Math.min(10, ideas.length)} />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <div className="flex rounded-md p-0.5" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
            <button onClick={() => setLayout("board")} className="rounded px-2 py-1 text-[11px] font-medium"
              style={{ background: layout === "board" ? "#14375a" : "transparent", color: layout === "board" ? "#e2e8f0" : "#a8aaab" }}>
              Board
            </button>
            <button onClick={() => setLayout("list")} className="rounded px-2 py-1 text-[11px] font-medium"
              style={{ background: layout === "list" ? "#14375a" : "transparent", color: layout === "list" ? "#e2e8f0" : "#a8aaab" }}>
              List
            </button>
          </div>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
            className="h-8 rounded-md px-2 text-[11.5px] outline-none"
            style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }}>
            <option value="all">All tags</option>
            {IDEA_TAGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button onClick={() => setComposing(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 6px 18px rgba(91,203,245,0.30)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New idea
          </button>
        </div>
      </div>

      {/* Board or list */}
      {layout === "board" ? (
        <IdeaBoardLayout ideas={visible} onVote={toggleVote} onOpen={setOpenIdea} />
      ) : (
        <IdeaListLayout ideas={visible} onVote={toggleVote} onOpen={setOpenIdea} />
      )}

      {visible.length === 0 && !composing && (
        <div className="py-16 text-center text-[13px]" style={{ color: "#5d6566" }}>
          No ideas match the current filter.
        </div>
      )}

      {/* New idea panel */}
      {composing && <NewIdeaPanel onCancel={() => setComposing(false)} onSubmit={handleNewIdea} />}

      {/* Idea detail drawer */}
      {openIdea && (
        <IdeaDetailDrawer idea={openIdea} onClose={() => setOpenIdea(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
    </div>
  );
}
