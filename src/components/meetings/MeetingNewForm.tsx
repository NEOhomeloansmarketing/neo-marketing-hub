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

export function MeetingNewForm({ teamMembers, currentUserId }: MeetingNewFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [recurrence, setRecurrence] = useState("ONE_OFF");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([currentUserId]);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!scheduledAt) return setError("Date and time are required.");

    setLoading(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scheduledAt,
          durationMinutes: parseInt(duration),
          recurrence,
          attendeeIds,
          sections: sections.filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      const data = await res.json();
      router.push(`/meetings/${data.id}`);
    } catch {
      setError("Failed to create meeting. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div
        className="rounded-lg p-6"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <h2 className="mb-5 text-[15px] font-semibold text-slate-100">
          Meeting details
        </h2>

        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Marketing Weekly · May 11"
              className="w-full rounded-md px-3 py-2.5 text-[13px]"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Date & time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-md px-3 py-2.5 text-[13px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="15"
                step="15"
                className="w-full rounded-md px-3 py-2.5 text-[13px]"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Recurrence</label>
            <div className="flex gap-2 flex-wrap">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecurrence(opt.value)}
                  className="rounded-md px-3 py-1.5 text-[12px] font-medium transition"
                  style={{
                    background:
                      recurrence === opt.value
                        ? "rgba(91,203,245,0.14)"
                        : "#0a2540",
                    border: `1px solid ${recurrence === opt.value ? "#5bcbf5" : "#1d4368"}`,
                    color: recurrence === opt.value ? "#e2e8f0" : "#cbd5e1",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attendees */}
      <div
        className="rounded-lg p-6"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <h2 className="mb-4 text-[15px] font-semibold text-slate-100">
          Attendees
        </h2>
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
                <span
                  className="text-[12.5px] font-medium"
                  style={{ color: selected ? "#e2e8f0" : "#cbd5e1" }}
                >
                  {u.name}
                </span>
                {selected && (
                  <svg
                    className="ml-auto"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5bcbf5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda sections */}
      <div
        className="rounded-lg p-6"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <h2 className="mb-4 text-[15px] font-semibold text-slate-100">
          Agenda template
        </h2>
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={s}
                onChange={(e) => {
                  const next = [...sections];
                  next[i] = e.target.value;
                  setSections(next);
                }}
                className="flex-1 rounded-md px-3 py-2 text-[13px]"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setSections(sections.filter((_, j) => j !== i))}
                className="grid h-8 w-8 place-items-center rounded-md"
                style={{ background: "#14375a", color: "#a8aaab" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSections([...sections, ""])}
            className="text-[12px] font-medium"
            style={{ color: "#5bcbf5" }}
          >
            + Add section
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-md px-3 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fca5a5",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60"
          style={{
            background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
            boxShadow: "0 4px 14px rgba(91,203,245,0.30)",
          }}
        >
          {loading ? "Creating…" : "Create meeting"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{
            background: "#0a2540",
            border: "1px solid #1d4368",
            color: "#cbd5e1",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
