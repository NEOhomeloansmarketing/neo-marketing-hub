"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  color?: string;
  initials?: string;
  role: string;
  isAdmin: boolean;
}

interface TeamMember {
  userId: string;
  role: string;
  user: TeamUser;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string | null;
  members: TeamMember[];
}

interface AdminViewProps {
  teams: Team[];
  users: TeamUser[];
  pendingUsers: TeamUser[];
}

const TEAM_COLORS = ["#5bcbf5", "#6366f1", "#f59e0b", "#22c55e", "#f43f5e", "#a855f7", "#14b8a6", "#fb923c"];

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

function RoleBadge({ role, isAdmin }: { role: string; isAdmin: boolean }) {
  if (isAdmin) return (
    <span className="rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(91,203,245,0.15)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.3)" }}>
      Admin
    </span>
  );
  return (
    <span className="rounded-full px-2 py-[2px] text-[10px] font-medium" style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}>
      {role.replace(/_/g, " ")}
    </span>
  );
}

function TeamCard({
  team,
  allUsers,
  onUpdate,
  onDelete,
}: {
  team: Team;
  allUsers: TeamUser[];
  onUpdate: (t: Team) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [color, setColor] = useState(team.color);
  const [addingUser, setAddingUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const memberIds = new Set(team.members.map((m) => m.userId));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));

  const saveTeam = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, color }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setEditing(false);
    }
    setSaving(false);
  };

  const addMember = async () => {
    if (!selectedUserId) return;
    const res = await fetch(`/api/admin/teams/${team.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId, role: "MEMBER" }),
    });
    if (res.ok) {
      const user = allUsers.find((u) => u.id === selectedUserId)!;
      onUpdate({
        ...team,
        members: [...team.members, { userId: selectedUserId, role: "MEMBER", user }],
      });
      setSelectedUserId("");
      setAddingUser(false);
    }
  };

  const removeMember = async (userId: string) => {
    await fetch(`/api/admin/teams/${team.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    onUpdate({ ...team, members: team.members.filter((m) => m.userId !== userId) });
  };

  const changeRole = async (userId: string, role: string) => {
    await fetch(`/api/admin/teams/${team.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    onUpdate({
      ...team,
      members: team.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
    });
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #1d4368" }}>
        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: team.color }} />
        {editing ? (
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: 1, background: "transparent", border: "none", fontSize: 15, fontWeight: 700, color: "#f1f5f9", padding: "0" }} />
        ) : (
          <div className="flex-1 text-[15px] font-bold text-slate-100">{team.name}</div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px]" style={{ color: "#858889" }}>{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="rounded px-2 py-1 text-[11px] font-medium transition hover:brightness-110" style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}>
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete team "${team.name}"? Members will lose access. This cannot be undone.`)) return;
                  await fetch(`/api/admin/teams/${team.id}`, { method: "DELETE" });
                  onDelete(team.id);
                }}
                className="grid h-6 w-6 place-items-center rounded transition hover:bg-red-500/10"
                style={{ color: "#5d6566" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button onClick={saveTeam} disabled={saving} className="rounded px-2 py-1 text-[11px] font-bold transition hover:brightness-110" style={{ background: "#5bcbf5", color: "#061320" }}>
                {saving ? "…" : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setName(team.name); setColor(team.color); }} className="rounded px-2 py-1 text-[11px] font-medium" style={{ background: "#14375a", color: "#a8aaab" }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit fields */}
      {editing && (
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" style={{ ...inputStyle, flex: 1 }} />
          <div className="flex gap-1.5 shrink-0">
            {TEAM_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className="h-5 w-5 rounded-full transition" style={{ background: c, boxShadow: color === c ? `0 0 0 2px #0a2540, 0 0 0 3.5px ${c}` : "none" }} />
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="divide-y" style={{ borderColor: "#1d4368" }}>
        {team.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={m.user.name} color={m.user.color} initials={m.user.initials} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-slate-100">{m.user.name}</div>
              <div className="text-[11px]" style={{ color: "#858889" }}>{m.user.email}</div>
            </div>
            <select
              value={m.role}
              onChange={(e) => changeRole(m.userId, e.target.value)}
              className="rounded px-2 py-1 text-[11px] outline-none"
              style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
            >
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
            </select>
            <button
              onClick={() => removeMember(m.userId)}
              className="grid h-6 w-6 place-items-center rounded transition hover:bg-red-500/10 shrink-0"
              style={{ color: "#5d6566" }}
              title="Remove from team"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add member row */}
        {addingUser ? (
          <div className="flex items-center gap-2 px-5 py-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              autoFocus
            >
              <option value="">Select a person…</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>
            <button onClick={addMember} disabled={!selectedUserId} className="shrink-0 rounded px-3 py-1.5 text-[11.5px] font-bold transition hover:brightness-110 disabled:opacity-50" style={{ background: "#5bcbf5", color: "#061320" }}>
              Add
            </button>
            <button onClick={() => setAddingUser(false)} className="shrink-0 rounded px-2 py-1.5 text-[11.5px]" style={{ color: "#a8aaab" }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingUser(true)}
            className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-[12px] font-medium transition hover:bg-white/[0.02]"
            style={{ color: "#5bcbf5" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add member
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminView({ teams: initialTeams, users, pendingUsers: initialPending }: AdminViewProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(TEAM_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [userList, setUserList] = useState(users);
  const [pendingList, setPendingList] = useState(initialPending);

  const toggleAdmin = async (userId: string, current: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !current }),
    });
    if (res.ok) {
      setUserList((prev) => prev.map((u) => (u.id === userId ? { ...u, isAdmin: !current } : u)));
    }
  };

  const approveUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) {
      const approved = pendingList.find((u) => u.id === userId);
      if (approved) {
        setPendingList((prev) => prev.filter((u) => u.id !== userId));
        setUserList((prev) => [...prev, { ...approved, isActive: true }]);
      }
    }
  };

  const deleteUser = async (userId: string, name: string, fromPending = false) => {
    if (!confirm(`Permanently delete ${name}? This removes them from the system and cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      if (fromPending) setPendingList((prev) => prev.filter((u) => u.id !== userId));
      else setUserList((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined, color: newColor }),
    });
    if (res.ok) {
      const t = await res.json();
      setTeams((prev) => [...prev, t]);
      setNewName("");
      setNewDesc("");
      setNewColor(TEAM_COLORS[0]);
      setCreatingTeam(false);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-8">

      {/* Pending Approvals */}
      {pendingList.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-[17px] font-bold text-slate-100">Pending Approval</h2>
            <span className="rounded-full px-2 py-[2px] text-[11px] font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              {pendingList.length}
            </span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid rgba(245,158,11,0.3)" }}>
            {pendingList.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: i === pendingList.length - 1 ? "none" : "1px solid #1d4368" }}
              >
                <Avatar name={u.name} color={u.color} initials={u.initials} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-100">{u.name}</div>
                  <div className="text-[11px]" style={{ color: "#858889" }}>{u.email}</div>
                </div>
                <span className="rounded-full px-2 py-[2px] text-[10px] font-semibold" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                  Pending
                </span>
                <button
                  onClick={() => approveUser(u.id)}
                  className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#86efac", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => deleteUser(u.id, u.name, true)}
                  className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  Deny
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-slate-100">Workspaces</h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "#858889" }}>
              Each workspace is a team with its own members. Tasks and meetings are scoped per workspace.
            </p>
          </div>
          <button
            onClick={() => setCreatingTeam(true)}
            className="rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:brightness-110"
            style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}
          >
            + New workspace
          </button>
        </div>

        {/* Create form */}
        {creatingTeam && (
          <form onSubmit={createTeam} className="mb-4 rounded-xl p-5 space-y-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[13px] font-semibold text-slate-100">Create new workspace</div>
            <div className="grid grid-cols-2 gap-3">
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Workspace name (e.g. NEO West Marketing)" style={inputStyle} />
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" style={inputStyle} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>Color</span>
              <div className="flex gap-2">
                {TEAM_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewColor(c)} className="h-5 w-5 rounded-full transition" style={{ background: c, boxShadow: newColor === c ? `0 0 0 2px #0e2b48, 0 0 0 3.5px ${c}` : "none" }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating || !newName.trim()} className="rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:brightness-110 disabled:opacity-50" style={{ background: "#5bcbf5", color: "#061320" }}>
                {creating ? "Creating…" : "Create workspace"}
              </button>
              <button type="button" onClick={() => setCreatingTeam(false)} className="rounded-lg px-4 py-2 text-[12.5px] font-semibold" style={{ color: "#a8aaab" }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {teams.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: "#0e2b48", border: "1px dashed #1d4368" }}>
            <p className="text-[13px] font-semibold text-slate-300">No workspaces yet</p>
            <p className="mt-1 text-[12px]" style={{ color: "#858889" }}>Create your first workspace to start organizing teams.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                allUsers={userList}
                onUpdate={(updated) => setTeams((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                onDelete={(id) => setTeams((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Users section */}
      <div>
        <div className="mb-4">
          <h2 className="text-[17px] font-bold text-slate-100">All Users</h2>
          <p className="mt-0.5 text-[12px]" style={{ color: "#858889" }}>Toggle admin access or remove users from the system entirely.</p>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          {userList.map((u, i) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: i === userList.length - 1 ? "none" : "1px solid #1d4368" }}
            >
              <Avatar name={u.name} color={u.color} initials={u.initials} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-100">{u.name}</div>
                <div className="text-[11px]" style={{ color: "#858889" }}>{u.email}</div>
              </div>
              <RoleBadge role={u.role} isAdmin={u.isAdmin} />
              <button
                onClick={() => toggleAdmin(u.id, u.isAdmin)}
                className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110"
                style={{
                  background: u.isAdmin ? "rgba(239,68,68,0.1)" : "rgba(91,203,245,0.1)",
                  color: u.isAdmin ? "#fca5a5" : "#5bcbf5",
                  border: `1px solid ${u.isAdmin ? "rgba(239,68,68,0.25)" : "rgba(91,203,245,0.25)"}`,
                }}
              >
                {u.isAdmin ? "Remove admin" : "Make admin"}
              </button>
              <button
                onClick={() => deleteUser(u.id, u.name)}
                className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-red-500/10"
                style={{ color: "#5d6566", border: "1px solid #1d4368" }}
                title="Delete user"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
