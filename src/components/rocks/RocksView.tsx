"use client";
import { CommentSection } from "@/components/comments/CommentSection";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Owner { id: string; name: string; initials: string; color: string; }
interface MilestoneItem { id: string; title: string; done: boolean; dueDate: string | null; position: number; }
interface LinkedTask { id: string; title: string; status: string; priority: string; dueDate: string | null; }
interface Rock {
  id: string;
  title: string;
  description: string | null;
  quarter: number;
  year: number;
  status: string;
  level: string;
  ownerId: string | null;
  owner: Owner | null;
  dueDate: string | null;
  notes: string | null;
  milestones: MilestoneItem[];
  rockTasks: { task: LinkedTask }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  NOT_STARTED: { label: "Not Started", color: "#858889", bg: "#858889" + "22" },
  ON_TRACK:    { label: "On Track",    color: "#22c55e", bg: "#22c55e" + "22" },
  OFF_TRACK:   { label: "Off Track",   color: "#f43f5e", bg: "#f43f5e" + "22" },
  COMPLETE:    { label: "Complete",    color: "#5bcbf5", bg: "#5bcbf5" + "22" },
  DROPPED:     { label: "Dropped",     color: "#5d6566", bg: "#5d6566" + "22" },
};

const QUARTERS = [1, 2, 3, 4];

function currentQuarter() {
  const m = new Date().getMonth(); // 0-indexed
  return Math.floor(m / 3) + 1;
}

function quarterEnd(q: number, y: number) {
  const ends = [new Date(y, 2, 31), new Date(y, 5, 30), new Date(y, 8, 30), new Date(y, 11, 31)];
  return ends[q - 1].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ owner, size = 26 }: { owner: Owner | null; size?: number }) {
  if (!owner) return null;
  const ini = owner.initials || initials(owner.name);
  return (
    <div className="grid shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
      style={{ width: size, height: size, background: owner.color, fontSize: size * 0.38 }}>
      {ini}
    </div>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ done, total, color }: { done: number; total: number; color: string }) {
  const r = 14; const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#1d4368" strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Rock Modal (Add / Edit) ──────────────────────────────────────────────────
function RockModal({
  rock, quarter, year, users, onSave, onClose,
}: {
  rock?: Rock | null;
  quarter: number;
  year: number;
  users: Owner[];
  onSave: (r: Rock) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(rock?.title ?? "");
  const [description, setDescription] = useState(rock?.description ?? "");
  const [status, setStatus] = useState(rock?.status ?? "NOT_STARTED");
  const [level, setLevel] = useState(rock?.level ?? "COMPANY");
  const [ownerId, setOwnerId] = useState(rock?.ownerId ?? "");
  const [dueDate, setDueDate] = useState(rock?.dueDate ? rock.dueDate.split("T")[0] : "");
  const [notes, setNotes] = useState(rock?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const body = { title, description, status, level, ownerId: ownerId || null, dueDate: dueDate || null, notes, quarter, year };
    const res = rock
      ? await fetch(`/api/rocks/${rock.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/rocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setSaving(false);
    if (json.rock) { onSave(json.rock); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl" style={{ background: "#07192e", border: "1px solid #1d4368" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368" }}>
          <div className="text-[14px] font-bold text-slate-100">{rock ? "Edit Rock" : "Add Rock"}</div>
          <button onClick={onClose} className="text-[20px] leading-none transition hover:opacity-60" style={{ color: "#858889" }}>×</button>
        </div>
        <div className="space-y-4 p-6">
          {/* Title */}
          <div>
            <label className="block mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Rock Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's the 90-day priority?"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }} />
          </div>
          {/* Description */}
          <div>
            <label className="block mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="More detail…"
              className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none resize-none"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }} />
          </div>
          {/* Level + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                <option value="COMPANY">🏢 Company Rock</option>
                <option value="INDIVIDUAL">👤 Individual Rock</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {/* Owner + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #1d4368" }}>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] font-semibold transition hover:opacity-70" style={{ color: "#858889" }}>Cancel</button>
          <button onClick={save} disabled={!title.trim() || saving}
            className="rounded-lg px-5 py-2 text-[12px] font-semibold transition disabled:opacity-40"
            style={{ background: "#5bcbf5", color: "#061320" }}>
            {saving ? "Saving…" : rock ? "Save Changes" : "Create Rock"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rock Detail Panel (slide-in) ─────────────────────────────────────────────
function RockDetail({
  rock,
  users,
  availableTasks,
  onUpdate,
  onClose,
}: {
  rock: Rock;
  users: Owner[];
  availableTasks: LinkedTask[];
  onUpdate: (r: Rock) => void;
  onClose: () => void;
}) {
  const [newMilestone, setNewMilestone] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [notes, setNotes] = useState(rock.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const sm = STATUS_META[rock.status] ?? STATUS_META.NOT_STARTED;
  const done = rock.milestones.filter(m => m.done).length;
  const total = rock.milestones.length;
  const linkedTaskIds = new Set(rock.rockTasks.map(rt => rt.task.id));

  async function setStatus(status: string) {
    const res = await fetch(`/api/rocks/${rock.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const json = await res.json();
    if (json.rock) onUpdate(json.rock);
  }

  async function toggleMilestone(m: MilestoneItem) {
    await fetch(`/api/milestones/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !m.done }) });
    onUpdate({ ...rock, milestones: rock.milestones.map(x => x.id === m.id ? { ...x, done: !x.done } : x) });
  }

  async function deleteMilestone(m: MilestoneItem) {
    await fetch(`/api/milestones/${m.id}`, { method: "DELETE" });
    onUpdate({ ...rock, milestones: rock.milestones.filter(x => x.id !== m.id) });
  }

  async function addMilestone() {
    if (!newMilestone.trim()) return;
    setAddingMilestone(true);
    const res = await fetch(`/api/rocks/${rock.id}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newMilestone }) });
    const json = await res.json();
    if (json.milestone) {
      onUpdate({ ...rock, milestones: [...rock.milestones, json.milestone] });
      setNewMilestone("");
    }
    setAddingMilestone(false);
  }

  async function linkTask(task: LinkedTask) {
    await fetch(`/api/rocks/${rock.id}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id }) });
    onUpdate({ ...rock, rockTasks: [...rock.rockTasks, { task }] });
    setShowTaskPicker(false);
  }

  async function unlinkTask(taskId: string) {
    await fetch(`/api/rocks/${rock.id}/tasks`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
    onUpdate({ ...rock, rockTasks: rock.rockTasks.filter(rt => rt.task.id !== taskId) });
  }

  async function saveNotes() {
    setSavingNotes(true);
    const res = await fetch(`/api/rocks/${rock.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) });
    const json = await res.json();
    if (json.rock) onUpdate(json.rock);
    setSavingNotes(false);
  }

  const filteredTasks = availableTasks.filter(t =>
    !linkedTaskIds.has(t.id) &&
    (!taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase()))
  ).slice(0, 10);

  const TASK_STATUS_COLOR: Record<string, string> = { TODO: "#858889", IN_PROGRESS: "#f59e0b", DONE: "#22c55e" };

  return (
    <>
      {editModal && (
        <RockModal rock={rock} quarter={rock.quarter} year={rock.year} users={users}
          onSave={(r) => { onUpdate(r); setEditModal(false); }}
          onClose={() => setEditModal(false)} />
      )}
      <div className="fixed inset-0 z-40 flex justify-end" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto" style={{ background: "#07192e", borderLeft: "1px solid #1d4368" }}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 shrink-0" style={{ borderBottom: "1px solid #1d4368" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: rock.level === "COMPANY" ? "#5bcbf522" : "#a855f722", color: rock.level === "COMPANY" ? "#5bcbf5" : "#a855f7" }}>
                  {rock.level === "COMPANY" ? "🏢 Company Rock" : "👤 Individual Rock"}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: sm.bg, color: sm.color }}>
                  {sm.label}
                </span>
              </div>
              <div className="text-[17px] font-bold text-slate-100 leading-tight">{rock.title}</div>
              {rock.description && <div className="mt-1 text-[12px]" style={{ color: "#858889" }}>{rock.description}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setEditModal(true)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#858889" }}>
                Edit
              </button>
              <button onClick={onClose} className="text-[22px] leading-none transition hover:opacity-60" style={{ color: "#858889" }}>×</button>
            </div>
          </div>

          <div className="flex-1 space-y-6 p-6">
            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-[11px]">
              {rock.owner && (
                <div className="flex items-center gap-1.5">
                  <Avatar owner={rock.owner} size={22} />
                  <span style={{ color: "#a8aaab" }}>{rock.owner.name}</span>
                </div>
              )}
              {rock.dueDate && (
                <div className="flex items-center gap-1" style={{ color: "#858889" }}>
                  <span>📅</span>
                  <span>Due {new Date(rock.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ProgressRing done={done} total={total} color={sm.color} />
                <span style={{ color: "#858889" }}>{done}/{total} milestones</span>
              </div>
            </div>

            {/* Quick status check-in */}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Weekly Check-In</div>
              <div className="flex gap-2 flex-wrap">
                {["ON_TRACK", "OFF_TRACK", "COMPLETE", "NOT_STARTED", "DROPPED"].map(s => {
                  const meta = STATUS_META[s];
                  const active = rock.status === s;
                  return (
                    <button key={s} onClick={() => setStatus(s)}
                      className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                      style={{
                        background: active ? meta.color : meta.bg,
                        color: active ? "#061320" : meta.color,
                        border: `1px solid ${meta.color}44`,
                      }}>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
                Milestones ({done}/{total})
              </div>
              <div className="space-y-1.5">
                {rock.milestones.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 group rounded-lg px-2 py-1.5 -mx-2 transition hover:bg-white/[0.02]">
                    <button onClick={() => toggleMilestone(m)}
                      className="h-4 w-4 shrink-0 rounded border transition flex items-center justify-center"
                      style={{ border: `1px solid ${m.done ? "#22c55e" : "#1d4368"}`, background: m.done ? "#22c55e" : "transparent" }}>
                      {m.done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#061320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                    <span className="flex-1 text-[12.5px]" style={{ color: m.done ? "#5d6566" : "#cbd5e1", textDecoration: m.done ? "line-through" : "none" }}>
                      {m.title}
                    </span>
                    <button onClick={() => deleteMilestone(m)}
                      className="opacity-0 group-hover:opacity-100 text-[12px] transition hover:opacity-60"
                      style={{ color: "#f43f5e" }}>×</button>
                  </div>
                ))}
              </div>
              {/* Add milestone */}
              <div className="flex gap-2 mt-3">
                <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addMilestone(); }}
                  placeholder="Add a milestone…"
                  className="flex-1 rounded-lg px-3 py-2 text-[12px] text-slate-100 outline-none"
                  style={{ background: "#0e2b48", border: "1px solid #1d4368" }} />
                <button onClick={addMilestone} disabled={!newMilestone.trim() || addingMilestone}
                  className="rounded-lg px-3 py-2 text-[12px] font-semibold transition disabled:opacity-40"
                  style={{ background: "#5bcbf5", color: "#061320" }}>
                  Add
                </button>
              </div>
            </div>

            {/* Linked Tasks */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
                  Linked Tasks ({rock.rockTasks.length})
                </div>
                <button onClick={() => setShowTaskPicker(v => !v)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
                  style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#5bcbf5" }}>
                  + Link Task
                </button>
              </div>

              {showTaskPicker && (
                <div className="mb-3 rounded-lg" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                  <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)}
                    placeholder="Search tasks…" autoFocus
                    className="w-full rounded-t-lg px-3 py-2.5 text-[12px] text-slate-100 outline-none"
                    style={{ background: "transparent", borderBottom: "1px solid #1d4368" }} />
                  <div className="max-h-48 overflow-y-auto">
                    {filteredTasks.length === 0
                      ? <div className="px-3 py-4 text-center text-[11px]" style={{ color: "#5d6566" }}>No tasks found</div>
                      : filteredTasks.map(t => (
                          <button key={t.id} onClick={() => linkTask(t)}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                            style={{ borderBottom: "1px solid #0e2b48" }}>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TASK_STATUS_COLOR[t.status] ?? "#858889" }} />
                            <span className="flex-1 text-[12px] text-slate-100 truncate">{t.title}</span>
                          </button>
                        ))
                    }
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {rock.rockTasks.length === 0
                  ? <div className="rounded-lg px-3 py-4 text-center text-[11px]" style={{ background: "#0a2540", color: "#5d6566" }}>
                      No tasks linked yet. Link existing tasks or create new ones.
                    </div>
                  : rock.rockTasks.map(rt => (
                      <div key={rt.task.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 group"
                        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TASK_STATUS_COLOR[rt.task.status] ?? "#858889" }} />
                        <span className="flex-1 text-[12.5px] text-slate-100 truncate">{rt.task.title}</span>
                        <span className="text-[10px] rounded-full px-1.5 py-[1px]"
                          style={{ background: TASK_STATUS_COLOR[rt.task.status] + "22", color: TASK_STATUS_COLOR[rt.task.status] }}>
                          {rt.task.status.replace("_", " ")}
                        </span>
                        <button onClick={() => unlinkTask(rt.task.id)}
                          className="opacity-0 group-hover:opacity-100 text-[12px] transition"
                          style={{ color: "#f43f5e" }}>×</button>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                placeholder="Meeting notes, obstacles, context…"
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] text-slate-100 outline-none resize-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }} />
              <button onClick={saveNotes} disabled={notes === rock.notes || savingNotes}
                className="mt-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-40"
                style={{ background: "#14375a", border: "1px solid #1d4368", color: "#5bcbf5" }}>
                {savingNotes ? "Saving…" : "Save Notes"}
              </button>
            </div>

            {/* Comments */}
            <div className="rounded-xl p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              <CommentSection entityType="rockId" entityId={rock.id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Rock Card ─────────────────────────────────────────────────────────────────
function RockCard({ rock, onClick }: { rock: Rock; onClick: () => void }) {
  const sm = STATUS_META[rock.status] ?? STATUS_META.NOT_STARTED;
  const done = rock.milestones.filter(m => m.done).length;
  const total = rock.milestones.length;

  return (
    <div onClick={onClick}
      className="cursor-pointer rounded-xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      {/* Status + level */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-[2px] rounded-full"
          style={{ background: sm.bg, color: sm.color }}>
          {sm.label}
        </span>
        <span className="text-[9px]" style={{ color: "#5d6566" }}>
          {rock.level === "COMPANY" ? "🏢 Company" : "👤 Individual"}
        </span>
      </div>

      {/* Title */}
      <div className="text-[13.5px] font-semibold text-slate-100 leading-snug mb-2">{rock.title}</div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: "#5d6566" }}>
            <span>{done}/{total} milestones</span>
            <span>{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "#0a2540" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: sm.color }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          {rock.owner && <Avatar owner={rock.owner} size={22} />}
          <span className="text-[11px]" style={{ color: "#858889" }}>
            {rock.owner?.name ?? "Unassigned"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "#5d6566" }}>
          {rock.rockTasks.length > 0 && <span>🔗 {rock.rockTasks.length}</span>}
          {rock.dueDate && (
            <span>{new Date(rock.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Headlines ────────────────────────────────────────────────────────────────

interface HeadlineTask { id: string; title: string; status: string; }
interface Headline {
  id: string;
  title: string;
  type: string;       // WIN | ISSUE | INFO
  resolved: boolean;
  ownerId: string | null;
  owner: Owner | null;
  taskId: string | null;
  task: HeadlineTask | null;
  createdAt: string;
}

const HEADLINE_TYPES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  WIN:   { label: "Win",   emoji: "🏆", color: "#22c55e", bg: "#22c55e18" },
  ISSUE: { label: "Issue", emoji: "⚠️", color: "#f97316", bg: "#f9731618" },
  INFO:  { label: "Info",  emoji: "💡", color: "#5bcbf5", bg: "#5bcbf518" },
};

function HeadlinesSection({ users }: { users: Owner[] }) {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTitle, setAddingTitle] = useState("");
  const [addingType, setAddingType] = useState("WIN");
  const [addingOwner, setAddingOwner] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskModal, setTaskModal] = useState<Headline | null>(null);
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    fetch("/api/headlines").then(r => r.json()).then(d => {
      setHeadlines(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  async function addHeadline() {
    if (!addingTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/headlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: addingTitle.trim(), type: addingType, ownerId: addingOwner || null }),
    });
    const h = await res.json();
    setHeadlines(prev => [h, ...prev]);
    setAddingTitle(""); setAddingType("WIN"); setAddingOwner("");
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

  const meta = (type: string) => HEADLINE_TYPES[type] ?? HEADLINE_TYPES.INFO;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[17px]">📰</span>
          <div>
            <div className="text-[14px] font-bold text-slate-100">Headlines</div>
            <div className="text-[11px]" style={{ color: "#5d6566" }}>Team wins, issues &amp; news items</div>
          </div>
          {headlines.length > 0 && (
            <span className="rounded-full px-2 py-[1px] text-[10px] font-semibold" style={{ background: "#f9731618", color: "#f97316" }}>
              {headlines.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition hover:opacity-80"
          style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}
        >
          <span className="text-[14px] leading-none">+</span> Add Headline
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(HEADLINE_TYPES).map(([key, m]) => (
              <button key={key} onClick={() => setAddingType(key)}
                className="rounded-lg py-2 text-[11.5px] font-semibold transition"
                style={{
                  background: addingType === key ? m.bg : "#0a2540",
                  border: `1px solid ${addingType === key ? m.color : "#1d4368"}`,
                  color: addingType === key ? m.color : "#5d6566",
                }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <input
            value={addingTitle}
            onChange={e => setAddingTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addHeadline(); if (e.key === "Escape") setShowAdd(false); }}
            placeholder="What's the headline?"
            autoFocus
            className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
            style={{ background: "#0a2540", border: "1px solid #1d4368" }}
          />
          <div className="flex items-center gap-2">
            <select value={addingOwner} onChange={e => setAddingOwner(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-[12px] text-slate-100 outline-none"
              style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
              <option value="">— Who shared this? —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={addHeadline} disabled={saving || !addingTitle.trim()}
              className="rounded-lg px-4 py-2 text-[12px] font-bold disabled:opacity-40 transition hover:opacity-80"
              style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}>
              {saving ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-lg px-3 py-2 text-[12px] transition hover:opacity-60" style={{ color: "#858889" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Headlines list */}
      {loading ? (
        <div className="py-8 text-center text-[12px]" style={{ color: "#5d6566" }}>Loading…</div>
      ) : headlines.length === 0 && !showAdd ? (
        <div className="rounded-xl py-8 text-center" style={{ border: "2px dashed #1d4368" }}>
          <div className="text-[28px] mb-2">📰</div>
          <div className="text-[12px]" style={{ color: "#5d6566" }}>No open headlines. Add a win, issue, or news item.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {headlines.map(h => {
            const m = meta(h.type);
            return (
              <div key={h.id} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: "#0e2b48", border: `1px solid #1d4368`, borderLeft: `3px solid ${m.color}` }}>
                {/* Type badge */}
                <div className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}44` }}>
                  {m.emoji} {m.label}
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-100 leading-snug">{h.title}</div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    {h.owner && (
                      <div className="flex items-center gap-1.5">
                        <div className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold text-white"
                          style={{ background: h.owner.color }}>
                          {h.owner.initials}
                        </div>
                        <span className="text-[11px]" style={{ color: "#858889" }}>{h.owner.name}</span>
                      </div>
                    )}
                    {h.task && (
                      <span className="text-[10px] rounded-full px-2 py-px font-medium"
                        style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e33" }}>
                        ✓ Task created
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!h.task && (
                    <button
                      onClick={() => { setTaskModal(h); setTaskAssignee(h.ownerId ?? ""); setTaskPriority("MEDIUM"); }}
                      title="Create task from headline"
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                      style={{ background: "#5bcbf518", color: "#5bcbf5", border: "1px solid #5bcbf533" }}>
                      + Task
                    </button>
                  )}
                  <button
                    onClick={() => resolveHeadline(h.id)}
                    title="Mark resolved"
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                    style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e33" }}>
                    ✓ Resolve
                  </button>
                  <button
                    onClick={() => deleteHeadline(h.id)}
                    title="Delete"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setTaskModal(null); }}>
          <div className="w-full max-w-sm rounded-2xl" style={{ background: "#07192e", border: "1px solid #1d4368" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1d4368" }}>
              <div className="text-[13px] font-bold text-slate-100">Create Task from Headline</div>
              <button onClick={() => setTaskModal(null)} style={{ color: "#858889" }} className="text-[18px] leading-none hover:opacity-60">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg px-3 py-2.5 text-[12.5px] text-slate-100" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
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
                <button onClick={() => setTaskModal(null)} className="rounded-lg px-4 py-2.5 text-[13px] transition hover:opacity-60" style={{ color: "#858889" }}>
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

// ─── Main RocksView ────────────────────────────────────────────────────────────
export function RocksView({
  users,
  availableTasks,
}: {
  users: Owner[];
  availableTasks: LinkedTask[];
}) {
  const now = new Date();
  const [quarter, setQuarter] = useState(currentQuarter());
  const [year, setYear] = useState(now.getFullYear());
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailRock, setDetailRock] = useState<Rock | null>(null);
  const searchParams = useSearchParams();

  const fetchRocks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/rocks?quarter=${quarter}&year=${year}`);
    const json = await res.json();
    const loaded: Rock[] = json.rocks ?? [];
    setRocks(loaded);
    setLoading(false);
    // Auto-open rock drawer when ?open=<rockId> is in the URL
    const openId = searchParams.get("open");
    if (openId) {
      const match = loaded.find((r) => r.id === openId);
      if (match) setDetailRock(match);
    }
  }, [quarter, year, searchParams]);

  useEffect(() => { fetchRocks(); }, [fetchRocks]);

  function upsertRock(updated: Rock) {
    setRocks(prev => {
      const exists = prev.find(r => r.id === updated.id);
      if (exists) return prev.map(r => r.id === updated.id ? updated : r);
      return [...prev, updated];
    });
    if (detailRock?.id === updated.id) setDetailRock(updated);
  }

  async function deleteRock(id: string) {
    await fetch(`/api/rocks/${id}`, { method: "DELETE" });
    setRocks(prev => prev.filter(r => r.id !== id));
    setDetailRock(null);
  }

  const companyRocks = rocks.filter(r => r.level === "COMPANY");
  const individualRocks = rocks.filter(r => r.level === "INDIVIDUAL");

  // Group individual rocks by owner
  const byOwner = new Map<string, { owner: Owner | null; rocks: Rock[] }>();
  for (const r of individualRocks) {
    const key = r.ownerId ?? "__unassigned__";
    if (!byOwner.has(key)) byOwner.set(key, { owner: r.owner, rocks: [] });
    byOwner.get(key)!.rocks.push(r);
  }

  const onTrack = rocks.filter(r => r.status === "ON_TRACK").length;
  const offTrack = rocks.filter(r => r.status === "OFF_TRACK").length;
  const complete = rocks.filter(r => r.status === "COMPLETE").length;

  return (
    <div className="space-y-6">
      {/* Add modal */}
      {showAddModal && (
        <RockModal quarter={quarter} year={year} users={users}
          onSave={upsertRock} onClose={() => setShowAddModal(false)} />
      )}

      {/* Detail panel */}
      {detailRock && (
        <RockDetail rock={detailRock} users={users} availableTasks={availableTasks}
          onUpdate={upsertRock} onClose={() => setDetailRock(null)} />
      )}

      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Quarter picker */}
          <div className="flex items-center rounded-xl p-1 gap-0.5" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
            {QUARTERS.map(q => (
              <button key={q} onClick={() => setQuarter(q)}
                className="rounded-lg px-4 py-1.5 text-[12px] font-semibold transition"
                style={quarter === q
                  ? { background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }
                  : { color: "#858889" }}>
                Q{q}
              </button>
            ))}
          </div>
          {/* Year picker */}
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="rounded-lg px-3 py-2 text-[12px] text-slate-100 outline-none"
            style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            {[-1, 0, 1, 2].map(offset => {
              const y = now.getFullYear() + offset;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <span className="text-[11px]" style={{ color: "#5d6566" }}>
            Q{quarter} ends {quarterEnd(quarter, year)}
          </span>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="rounded-lg px-4 py-2 text-[12.5px] font-semibold transition hover:opacity-90"
          style={{ background: "#5bcbf5", color: "#061320" }}>
          + Add Rock
        </button>
      </div>

      {/* Summary bar */}
      {rocks.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-lg px-5 py-3" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
          <div className="text-[12px]"><span style={{ color: "#858889" }}>Total Rocks:</span> <span className="font-semibold text-slate-100">{rocks.length}</span></div>
          <div className="text-[12px]"><span style={{ color: "#858889" }}>On Track:</span> <span className="font-semibold" style={{ color: "#22c55e" }}>{onTrack}</span></div>
          <div className="text-[12px]"><span style={{ color: "#858889" }}>Off Track:</span> <span className="font-semibold" style={{ color: offTrack > 0 ? "#f43f5e" : "#858889" }}>{offTrack}</span></div>
          <div className="text-[12px]"><span style={{ color: "#858889" }}>Complete:</span> <span className="font-semibold" style={{ color: "#5bcbf5" }}>{complete}</span></div>
          <div className="text-[12px]"><span style={{ color: "#858889" }}>Completion:</span> <span className="font-semibold text-slate-100">{rocks.length > 0 ? Math.round((complete / rocks.length) * 100) : 0}%</span></div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px]" style={{ color: "#5d6566" }}>Loading rocks…</div>
        </div>
      ) : rocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="grid h-16 w-16 place-items-center rounded-2xl text-3xl" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>🪨</div>
          <div className="text-center">
            <div className="text-[15px] font-semibold text-slate-100">No Rocks for Q{quarter} {year}</div>
            <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>Rocks are 90-day priorities that move the business forward.</div>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="rounded-lg px-6 py-2.5 text-[13px] font-semibold transition hover:opacity-90"
            style={{ background: "#5bcbf5", color: "#061320" }}>
            Set Your First Rock
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Company Rocks */}
          {companyRocks.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#5d6566" }}>
                  🏢 Company Rocks
                </div>
                <span className="rounded-full px-2 py-[1px] text-[10px] font-semibold" style={{ background: "#5bcbf522", color: "#5bcbf5" }}>
                  {companyRocks.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {companyRocks.map(r => (
                  <RockCard key={r.id} rock={r} onClick={() => setDetailRock(r)} />
                ))}
                <button onClick={() => setShowAddModal(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center transition hover:bg-white/[0.02]"
                  style={{ border: "2px dashed #1d4368", minHeight: 120 }}>
                  <span className="text-[22px]">+</span>
                  <span className="text-[11px]" style={{ color: "#5d6566" }}>Add Company Rock</span>
                </button>
              </div>
            </div>
          )}

          {/* Individual Rocks */}
          {byOwner.size > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#5d6566" }}>
                  👤 Individual Rocks
                </div>
                <span className="rounded-full px-2 py-[1px] text-[10px] font-semibold" style={{ background: "#a855f722", color: "#a855f7" }}>
                  {individualRocks.length}
                </span>
              </div>
              <div className="space-y-5">
                {Array.from(byOwner.entries()).map(([key, { owner, rocks: ownerRocks }]) => (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar owner={owner} size={24} />
                      <span className="text-[12px] font-semibold text-slate-100">{owner?.name ?? "Unassigned"}</span>
                      <span className="text-[10px]" style={{ color: "#5d6566" }}>{ownerRocks.length} rock{ownerRocks.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {ownerRocks.map(r => (
                        <RockCard key={r.id} rock={r} onClick={() => setDetailRock(r)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If rocks exist but only company/individual of one type */}
          {companyRocks.length === 0 && individualRocks.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#5d6566" }}>🏢 Company Rocks</div>
              </div>
              <button onClick={() => setShowAddModal(true)}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl transition hover:bg-white/[0.02]"
                style={{ border: "2px dashed #1d4368" }}>
                <span className="text-[22px]">+</span>
                <span className="text-[11px]" style={{ color: "#5d6566" }}>Add a Company Rock</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Headlines */}
      <div className="rounded-2xl p-5" style={{ background: "#07192e", border: "1px solid #1d4368" }}>
        <HeadlinesSection users={users} />
      </div>

      {/* EOS info callout */}
      <div className="rounded-lg px-4 py-3 text-[11px]" style={{ background: "#0a2540", border: "1px dashed #1d4368", color: "#5d6566" }}>
        <span className="font-semibold" style={{ color: "#858889" }}>About Rocks · </span>
        Rocks are 90-day priorities from the EOS (Entrepreneurial Operating System). Each quarter, set 3–7 company-level Rocks and individual Rocks per team member. Review status weekly in your Level 10 meeting — On Track or Off Track.
      </div>
    </div>
  );
}
