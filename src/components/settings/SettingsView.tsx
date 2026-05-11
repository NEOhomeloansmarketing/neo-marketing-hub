"use client";

import { useState } from "react";

const ROLE_OPTIONS = [
  { value: "MARKETING_DIRECTOR", label: "Marketing Director" },
  { value: "BRAND_LEAD", label: "Brand Lead" },
  { value: "GROWTH_PM", label: "Growth PM" },
  { value: "CONTENT_STRATEGIST", label: "Content Strategist" },
  { value: "PERFORMANCE_LEAD", label: "Performance Lead" },
  { value: "DESIGNER", label: "Designer" },
  { value: "MARKETING_COORDINATOR", label: "Marketing Coordinator" },
  { value: "OTHER", label: "Other" },
];

const PRESET_COLORS = [
  "#5bcbf5", "#6366f1", "#a855f7", "#22c55e",
  "#f59e0b", "#f43f5e", "#14b8a6", "#fb923c",
  "#e879f9", "#38bdf8", "#4ade80", "#facc15",
];

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  role: string;
}

export function SettingsView({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [initials, setInitials] = useState(user.initials);
  const [color, setColor] = useState(user.color);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), initials: initials.trim().toUpperCase().slice(0, 2), color, role }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    name !== user.name ||
    initials !== user.initials ||
    color !== user.color ||
    role !== user.role;

  return (
    <div className="mx-auto max-w-xl space-y-5">

      {/* Avatar preview */}
      <div className="flex items-center gap-4 rounded-lg p-5"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-[22px] font-bold text-white select-none"
          style={{ background: color }}>
          {initials || "?"}
        </div>
        <div>
          <div className="text-[15px] font-semibold text-slate-100">{name || "Your Name"}</div>
          <div className="text-[12px] mt-0.5" style={{ color: "#858889" }}>{user.email}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "#5d6566" }}>
            {ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role}
          </div>
        </div>
      </div>

      {/* Profile fields */}
      <div className="rounded-lg p-5 space-y-4"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
          Profile
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#a8aaab" }}>Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md px-3 py-2 text-[13px] text-slate-100 outline-none transition"
            style={{ background: "#0a2540", border: "1px solid #1d4368" }}
            onFocus={(e) => (e.target.style.borderColor = "#5bcbf5")}
            onBlur={(e) => (e.target.style.borderColor = "#1d4368")}
          />
        </div>

        {/* Initials */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#a8aaab" }}>Initials</label>
          <input
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="AB"
            maxLength={2}
            className="w-24 rounded-md px-3 py-2 text-[13px] text-slate-100 outline-none transition uppercase"
            style={{ background: "#0a2540", border: "1px solid #1d4368" }}
            onFocus={(e) => (e.target.style.borderColor = "#5bcbf5")}
            onBlur={(e) => (e.target.style.borderColor = "#1d4368")}
          />
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#a8aaab" }}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-[13px] text-slate-100 outline-none transition"
            style={{ background: "#0a2540", border: "1px solid #1d4368" }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Avatar color */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium" style={{ color: "#a8aaab" }}>Avatar Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: color === c ? `3px solid ${c}` : "none",
                  outlineOffset: 2,
                  boxShadow: color === c ? `0 0 0 2px #061320` : "none",
                }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-lg p-5 space-y-3"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
          Account
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium" style={{ color: "#a8aaab" }}>Email</div>
            <div className="text-[13px] text-slate-100 mt-0.5">{user.email}</div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
            style={{ background: "#0a2540", color: "#5d6566", border: "1px solid #1d4368" }}>
            Managed by auth
          </span>
        </div>
        <div style={{ borderTop: "1px solid #1d4368" }} className="pt-3">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-[13px] font-medium transition hover:brightness-110"
              style={{ color: "#f43f5e" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !hasChanges}
          className="rounded-md px-5 py-2 text-[13px] font-semibold text-white transition disabled:opacity-40"
          style={{
            background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
            boxShadow: "0 4px 14px rgba(91,203,245,0.25)",
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && (
          <span className="text-[12px] font-medium" style={{ color: "#22c55e" }}>
            ✓ Saved
          </span>
        )}
        {error && (
          <span className="text-[12px]" style={{ color: "#f43f5e" }}>{error}</span>
        )}
      </div>

    </div>
  );
}
