"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface MeetingNewFormProps {
  teamMembers: User[];
  currentUserId: string;
}

const RECURRENCE_OPTIONS = [
  { value: "ONE_OFF", label: "One-off" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const DEFAULT_SECTIONS = ["Agenda", "Updates", "Discussion", "Next steps"];

const inputStyle: React.CSSProperties = {
  background: "#061320",
  border: "1px solid #1d4368",
  color: "#e2e8f0",
  outline: "none",
  colorScheme: "dark",
};

const labelStyle: React.CSSProperties = {
  color: "#858889",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "block",
  marginBottom: "6px",
};

interface ActionItemDraft {
  title: string;
  assigneeId: string;
  dueDate: string;
}

export function MeetingNewForm({ teamMembers, currentUserId }: MeetingNewFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [recurrence, setRecurrence] = useState("ONE_OFF");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([currentUserId]);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [actionItems, setActionItems] = useState<ActionItemDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addActionItem = () => {
    setActionItems((prev) => [...prev, { title: "", assigneeId: currentUserId, dueDate: "" }]);
  };

  const updateActionItem = (i: number, field: keyof ActionItemDraft, value: string) => {
    setActionItems((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  const removeActionItem = (i: number) => {
    setActionItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!date) return setError("Date is required.");

    setLoading(true);
    try {
      const scheduledAt = new Date(date + "T09:00:00").toISOString();

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scheduledAt,
          durationMinutes: 60,
          recurrence,
          attendeeIds,
          sections: sections.filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create meeting");
      }
      const meeting = await res.json();

      // Create action items and auto-generate tasks
      for (const item of actionItems.filter((a) => a.title.trim())) {
        await fetch("/api/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title.trim(),
            assigneeId: item.assigneeId || undefined,
            dueDate: item.dueDate || undefined,
            meetingId: meeting.id,
            createTask: true,
          }),
        });
      }

      router.push(`/meetings/${meeting.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {/* Details */}
      <div className="rounded-lg p-6" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <h2 className="mb-5 text-[15px] font-semibold text-slate-100">Meeting details</h2>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Marketing Weekly · May 12"
              className="w-full rounded-md px-3 py-2.5 text-[13px]"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-[13px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Recurrence</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-[13px]"
                style={inputStyle}
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} style={{ background: "#061320" }}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Attendees */}
      <div className="rounded-lg p-6" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <h2 className="mb-4 text-[15px] font-semibold text-slate-100">Attendees</h2>
        {teamMembers.length === 0 ? (
          <p className="text-[12px]" style={{ color: "#858889" }}>No team members yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {teamMembers.map((u) => {
              const selected = attendeeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAttendee(u.id)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left transition"
                  style={{
                    background: selected ? "rgba(91,203,245,0.08)" : "#0a2540",
                    border: `1px solid ${selected ? "#5bcbf5" : "#1d4368"}`,
                  }}
                >
                  <div
                    className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white shrink-0"
                    style={{ background: u.color ?? "#5bcbf5" }}
                  >
                    {u.initials}
                  </div>
                  <span className="text-[12.5px] font-medium" style={{ color: selected ? "#e2e8f0" : "#cbd5e1" }}>
                    {u.name}
                  </span>
                  {selected && (
                    <svg className="ml-auto" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Agenda sections */}
      <div className="rounded-lg p-6" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <h2 className="mb-4 text-[15px] font-semibold text-slate-100">Agenda template</h2>
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={s}
                onChange={(e) => { const next = [...sections]; next[i] = e.target.value; setSections(next); }}
                className="flex-1 rounded-md px-3 py-2 text-[13px]"
                style={inputStyle}
              />
              <button type="button" onClick={() => setSections(sections.filter((_, j) => j !== i))}
                className="grid h-8 w-8 place-items-center rounded-md" style={{ background: "#14375a", color: "#a8aaab" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setSections([...sections, ""])} className="text-[12px] font-medium" style={{ color: "#5bcbf5" }}>
            + Add section
          </button>
        </div>
      </div>

      {/* Action items */}
      <div className="rounded-lg p-6" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-100">Action items</h2>
            <p className="mt-0.5 text-[11.5px]" style={{ color: "#858889" }}>Each item will auto-create a task assigned to the person.</p>
          </div>
          <button type="button" onClick={addActionItem}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold"
            style={{ background: "rgba(91,203,245,0.12)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.35)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Add item
          </button>
        </div>
        {actionItems.length === 0 ? (
          <div className="rounded-md py-6 text-center text-[12px]" style={{ border: "1px dashed #1d4368", color: "#858889" }}>
            No action items yet — click "Add item" to create one
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: "1fr 160px 140px 32px" }}>
                <input
                  value={item.title}
                  onChange={(e) => updateActionItem(i, "title", e.target.value)}
                  placeholder="Action item title…"
                  className="rounded-md px-3 py-2 text-[12.5px]"
                  style={inputStyle}
                />
                <select value={item.assigneeId} onChange={(e) => updateActionItem(i, "assigneeId", e.target.value)}
                  className="rounded-md px-2 py-2 text-[12px]" style={inputStyle}>
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input type="date" value={item.dueDate} onChange={(e) => updateActionItem(i, "dueDate", e.target.value)}
                  className="rounded-md px-2 py-2 text-[12px]" style={inputStyle} />
                <button type="button" onClick={() => removeActionItem(i)}
                  className="grid h-8 w-8 place-items-center rounded-md" style={{ background: "#14375a", color: "#a8aaab" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md px-3 py-2 text-[12px]" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-md py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60"
          style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.30)" }}>
          {loading ? "Creating…" : "Create meeting"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
