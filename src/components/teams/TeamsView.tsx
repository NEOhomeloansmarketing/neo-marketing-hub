"use client";

import { useEffect, useState } from "react";

interface TeamMember {
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; color?: string; initials?: string };
}

interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string | null;
  members: TeamMember[];
}

interface AllUser {
  id: string;
  name: string;
  email: string;
  color?: string;
  initials?: string;
}

interface TeamsViewProps {
  initialTeams: Team[];
  allUsers: AllUser[];
  currentUserId: string;
  openCompose?: boolean;
  onComposeClose?: () => void;
}

const TEAM_COLORS = [
  "#5bcbf5", "#6366f1", "#f59e0b", "#22c55e", "#f43f5e",
  "#a855f7", "#14b8a6", "#fb923c", "#64748b",
];

export function TeamsView({ initialTeams, allUsers, currentUserId, openCompose, onComposeClose }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (openCompose) {
      setCreating(true);
      onComposeClose?.();
    }
  }, [openCompose]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined, color: newColor }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create team");
      }
      const team = await res.json();
      setTeams((prev) => [team, ...prev]);
      setCreating(false);
      setNewName("");
      setNewDesc("");
      setNewColor(TEAM_COLORS[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: "MEMBER" }),
      });
      if (!res.ok) return;
      const newMember = await res.json();
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, members: [...t.members, newMember] } : t
        )
      );
      setAddingMember(null);
      setSelectedUserId("");
    } catch {
      // silent
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, members: t.members.filter((m) => m.userId !== userId) }
            : t
        )
      );
    } catch {
      // silent
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#061320",
    border: "1px solid #1d4368",
    color: "#e2e8f0",
    outline: "none",
    colorScheme: "dark",
  };

  return (
    <div className="space-y-4">
      {/* Create team panel */}
      {creating ? (
        <div className="rounded-xl p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <h3 className="mb-4 text-[14px] font-semibold text-slate-100">New team</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Team name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Design, Growth, Content…"
                className="w-full rounded-lg px-3 py-2.5 text-[13px]"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Description (optional)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this team work on?"
                className="w-full rounded-lg px-3 py-2.5 text-[13px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Color</label>
              <div className="flex gap-2">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-6 w-6 rounded-full transition"
                    style={{
                      background: c,
                      boxShadow: newColor === c ? `0 0 0 2px #061320, 0 0 0 4px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="rounded-lg px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}
              >
                {saving ? "Creating…" : "Create team"}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setError(""); }}
                className="rounded-lg px-4 py-2 text-[12.5px] font-medium"
                style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#a8aaab" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Teams list */}
      {teams.length === 0 && !creating ? (
        <div className="rounded-xl py-16 text-center" style={{ border: "1px dashed #1d4368" }}>
          <div className="mb-3 text-[14px] font-semibold text-slate-100">No teams yet</div>
          <p className="mb-5 text-[12.5px]" style={{ color: "#858889" }}>Create a team to organize your work by department or project.</p>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-semibold"
            style={{ background: "rgba(91,203,245,0.12)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.35)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Create first team
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const expanded = expandedTeam === team.id;
            const existingMemberIds = new Set(team.members.map((m) => m.userId));
            const availableUsers = allUsers.filter((u) => !existingMemberIds.has(u.id));

            return (
              <div key={team.id} className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                {/* Team header */}
                <button
                  onClick={() => setExpandedTeam(expanded ? null : team.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-[13px] font-bold text-white"
                    style={{ background: team.color }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-100">{team.name}</div>
                    {team.description && (
                      <div className="truncate text-[12px] mt-0.5" style={{ color: "#858889" }}>{team.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {team.members.slice(0, 5).map((m) => (
                        <div
                          key={m.userId}
                          className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white"
                          style={{ background: m.user.color ?? "#5bcbf5", border: "1.5px solid #0e2b48" }}
                          title={m.user.name}
                        >
                          {m.user.initials ?? m.user.name.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                      {team.members.length > 5 && (
                        <div className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold"
                          style={{ background: "#1d4368", color: "#a8aaab", border: "1.5px solid #0e2b48" }}>
                          +{team.members.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-[11.5px]" style={{ color: "#858889" }}>{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5d6566" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Expanded member list */}
                {expanded && (
                  <div style={{ borderTop: "1px solid #1d4368" }}>
                    {team.members.length === 0 ? (
                      <div className="px-5 py-4 text-[12.5px]" style={{ color: "#5d6566" }}>No members yet.</div>
                    ) : (
                      team.members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-3 px-5 py-2.5"
                          style={{ borderBottom: "1px solid rgba(29,67,104,0.5)" }}>
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: m.user.color ?? "#5bcbf5" }}>
                            {m.user.initials ?? m.user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-100">{m.user.name}</div>
                            <div className="text-[11px]" style={{ color: "#858889" }}>{m.user.email}</div>
                          </div>
                          <span className="text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                            style={{ background: m.role === "OWNER" ? "rgba(245,158,11,0.15)" : "rgba(91,203,245,0.1)", color: m.role === "OWNER" ? "#f59e0b" : "#5bcbf5" }}>
                            {m.role}
                          </span>
                          {m.userId !== currentUserId && m.role !== "OWNER" && (
                            <button onClick={() => handleRemoveMember(team.id, m.userId)}
                              className="grid h-6 w-6 place-items-center rounded transition hover:bg-red-500/10"
                              style={{ color: "#5d6566" }} title="Remove">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))
                    )}

                    {/* Add member row */}
                    {addingMember === team.id ? (
                      <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: "1px solid rgba(29,67,104,0.5)" }}>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="flex-1 rounded-lg px-2.5 py-2 text-[12.5px] outline-none"
                          style={{ background: "#061320", border: "1px solid #1d4368", color: "#e2e8f0" }}
                        >
                          <option value="">Select a person…</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddMember(team.id)}
                          disabled={!selectedUserId}
                          className="rounded-lg px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40"
                          style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingMember(null); setSelectedUserId(""); }}
                          className="rounded-lg px-3 py-2 text-[12px] font-medium"
                          style={{ color: "#a8aaab" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(29,67,104,0.5)" }}>
                        <button
                          onClick={() => { setAddingMember(team.id); setSelectedUserId(""); }}
                          className="text-[12px] font-semibold"
                          style={{ color: "#5bcbf5" }}
                        >
                          + Add member
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
