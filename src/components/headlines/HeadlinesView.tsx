"use client";

import { useEffect, useState } from "react";

interface Owner { id: string; name: string; initials: string; color: string; }
interface HeadlineTask { id: string; title: string; status: string; }
interface Headline {
  id: string;
  title: string;
  type: string;
  resolved: boolean;
  ownerId: string | null;
  owner: Owner | null;
  taskId: string | null;
  task: HeadlineTask | null;
  createdAt: string;
}

const TYPES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  WIN:   { label: "Win",   emoji: "🏆", color: "#22c55e", bg: "#22c55e18" },
  ISSUE: { label: "Issue", emoji: "⚠️", color: "#f97316", bg: "#f9731618" },
  INFO:  { label: "Info",  emoji: "💡", color: "#5bcbf5", bg: "#5bcbf518" },
};

export function HeadlinesView({ users }: { users: Owner[] }) {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState("WIN");
  const [addOwner, setAddOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [taskModal, setTaskModal] = useState<Headline | null>(null);
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [creatingTask, setCreatingTask] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    // Run setup first (creates Headline table if missing), then load
    fetch("/api/setup")
      .catch(() => {})
      .finally(() => {
        fetch("/api/headlines")
          .then(r => r.json())
          .then(d => { setHeadlines(Array.isArray(d) ? d : []); setLoading(false); })
          .catch(() => setLoading(false));
      });
  }, []);

  async function addHeadline() {
    if (!addTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/headlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: addTitle.trim(), type: addType, ownerId: addOwner || null }),
    });
    const h = await res.json();
    setHeadlines(prev => [h, ...prev]);
    setAddTitle(""); setAddType("WIN"); setAddOwner("");
    setShowAdd(false); setSaving(false);
  }

  async function resolveHeadline(id: string) {
    await fetch(`/api/headlines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    setHeadlines(prev => prev.filter(h => h.id !== id));
  }

  async function deleteHeadline(id: string) {
    if (!confirm("Delete this headline?")) return;
    await fetch(`/api/headlines/${id}`, { method: "DELETE" });
    setHeadlines(prev => prev.filter(h => h.id !== id));
  }

  async function createTask() {
    if (!taskModal) return;
    setCreatingTask(true);
    const res = await fetch(`/api/headlines/${taskModal.id}/create-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: taskAssignee || null, priority: taskPriority }),
    });
    const updated = await res.json();
    setHeadlines(prev => prev.map(h => h.id === updated.id ? updated : h));
    setTaskModal(null); setCreatingTask(false);
  }

  const visible = headlines.filter(h => filterType === "ALL" || h.type === filterType);
  const counts = { ALL: headlines.length, WIN: 0, ISSUE: 0, INFO: 0 };
  for (const h of headlines) { if (h.type in counts) counts[h.type as keyof typeof counts]++; }

  return (
    <div className="space-y-5 pb-10">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(TYPES).map(([key, m]) => (
          <div key={key} className="rounded-xl px-4 py-3" style={{ background: "#0e2b48", border: `1px solid #1d4368`, borderLeft: `3px solid ${m.color}` }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: m.color }}>{m.emoji} {m.label}s</div>
            <div className="text-[24px] font-bold text-slate-100">{counts[key as keyof typeof counts]}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Type filter pills */}
        <div className="flex items-center gap-2">
          {(["ALL", "WIN", "ISSUE", "INFO"] as const).map(t => {
            const m = t === "ALL" ? null : TYPES[t];
            const active = filterType === t;
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className="rounded-full px-3 py-1 text-[11.5px] font-semibold transition"
                style={{
                  background: active ? (m?.bg ?? "#5bcbf518") : "#0a2540",
                  border: `1px solid ${active ? (m?.color ?? "#5bcbf5") : "#1d4368"}`,
                  color: active ? (m?.color ?? "#5bcbf5") : "#5d6566",
                }}>
                {m ? `${m.emoji} ${m.label}` : "All"} {t !== "ALL" && <span className="opacity-60">·{counts[t as keyof typeof counts]}</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:opacity-80"
          style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320", boxShadow: "0 4px 18px rgba(91,203,245,0.25)" }}>
          + Add Headline
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="text-[13px] font-bold text-slate-100">New Headline</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPES).map(([key, m]) => (
              <button key={key} onClick={() => setAddType(key)}
                className="rounded-lg py-2.5 text-[12px] font-semibold transition"
                style={{
                  background: addType === key ? m.bg : "#0a2540",
                  border: `1px solid ${addType === key ? m.color : "#1d4368"}`,
                  color: addType === key ? m.color : "#5d6566",
                }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <input
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addHeadline(); if (e.key === "Escape") setShowAdd(false); }}
            placeholder="What's the headline?"
            autoFocus
            className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
            style={{ background: "#0a2540", border: "1px solid #1d4368" }}
          />
          <div className="flex items-center gap-3">
            <select value={addOwner} onChange={e => setAddOwner(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2.5 text-[12.5px] text-slate-100 outline-none"
              style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
              <option value="">— Who shared this? (optional) —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={addHeadline} disabled={saving || !addTitle.trim()}
              className="rounded-lg px-5 py-2.5 text-[12.5px] font-bold disabled:opacity-40 transition hover:opacity-80"
              style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}>
              {saving ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="rounded-lg px-4 py-2.5 text-[12.5px] transition hover:opacity-60" style={{ color: "#858889" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Headlines list */}
      {loading ? (
        <div className="py-16 text-center text-[13px]" style={{ color: "#5d6566" }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ border: "2px dashed #1d4368" }}>
          <div className="text-[36px] mb-3">📰</div>
          <div className="text-[13px] font-medium text-slate-100 mb-1">No headlines yet</div>
          <div className="text-[12px]" style={{ color: "#5d6566" }}>Add a win, issue, or news item to share with the team.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(h => {
            const m = TYPES[h.type] ?? TYPES.INFO;
            const date = new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <div key={h.id} className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", borderLeft: `3px solid ${m.color}` }}>

                {/* Type badge */}
                <div className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}33`, minWidth: 64, textAlign: "center" }}>
                  {m.emoji} {m.label}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-slate-100 leading-snug">{h.title}</div>
                  <div className="mt-1 flex items-center gap-3">
                    {h.owner && (
                      <div className="flex items-center gap-1.5">
                        <div className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold text-white shrink-0"
                          style={{ background: h.owner.color }}>
                          {h.owner.initials}
                        </div>
                        <span className="text-[11px]" style={{ color: "#858889" }}>{h.owner.name}</span>
                      </div>
                    )}
                    <span className="text-[11px]" style={{ color: "#5d6566" }}>{date}</span>
                    {h.task && (
                      <span className="text-[10.5px] rounded-full px-2 py-px font-semibold"
                        style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e33" }}>
                        ✓ Task created
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!h.task && (
                    <button
                      onClick={() => { setTaskModal(h); setTaskAssignee(h.ownerId ?? ""); setTaskPriority("MEDIUM"); }}
                      className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition hover:opacity-80"
                      style={{ background: "#5bcbf518", color: "#5bcbf5", border: "1px solid #5bcbf533" }}>
                      + Task
                    </button>
                  )}
                  <button onClick={() => resolveHeadline(h.id)}
                    className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition hover:opacity-80"
                    style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e33" }}>
                    ✓ Resolve
                  </button>
                  <button onClick={() => deleteHeadline(h.id)}
                    className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-white/[0.06]"
                    style={{ color: "#5d6566" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create task modal */}
      {taskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setTaskModal(null); }}>
          <div className="w-full max-w-sm rounded-2xl" style={{ background: "#07192e", border: "1px solid #1d4368" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1d4368" }}>
              <div className="text-[13px] font-bold text-slate-100">Create Task</div>
              <button onClick={() => setTaskModal(null)} className="text-[20px] leading-none hover:opacity-60" style={{ color: "#858889" }}>×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg px-3 py-2.5 text-[12.5px] text-slate-100 leading-snug"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                {taskModal.title}
              </div>
              <div>
                <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Assign To</label>
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                  style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                  <option value="">— Select team member —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Priority</label>
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                  style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={createTask} disabled={creatingTask}
                  className="flex-1 rounded-lg py-2.5 text-[13px] font-bold disabled:opacity-40 transition hover:opacity-80"
                  style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}>
                  {creatingTask ? "Creating…" : "Create Task"}
                </button>
                <button onClick={() => setTaskModal(null)}
                  className="rounded-lg px-4 py-2.5 text-[13px] transition hover:opacity-60" style={{ color: "#858889" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
