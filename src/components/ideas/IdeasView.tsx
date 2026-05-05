"use client";

import { useState, useMemo } from "react";
import { StatCard } from "@/components/ui/StatCard";

const IDEA_TAGS = [
  { id: "campaign", label: "Campaign",   color: "#5bcbf5" },
  { id: "content",  label: "Content",    color: "#22c55e" },
  { id: "brand",    label: "Brand",      color: "#8b5cf6" },
  { id: "growth",   label: "Growth",     color: "#f59e0b" },
  { id: "product",  label: "Product",    color: "#06b6d4" },
  { id: "ops",      label: "Ops",        color: "#ec4899" },
];

const IDEA_STATUSES = [
  { id: "PARKED",   label: "Parked",      color: "#858889" },
  { id: "QUEUED",   label: "Up next",     color: "#5bcbf5" },
  { id: "ACTIVE",   label: "In progress", color: "#f59e0b" },
  { id: "SHIPPED",  label: "Shipped",     color: "#22c55e" },
  { id: "ARCHIVED", label: "Archived",    color: "#5d6566" },
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
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold"
      style={{ background: t.color + "1f", color: t.color, border: `1px solid ${t.color}44` }}
    >
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

function VoteButton({
  votes,
  voted,
  onVote,
}: {
  votes: number;
  voted: boolean;
  onVote: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onVote(); }}
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-1.5 py-1.5 transition"
      style={{
        background: voted ? "rgba(91,203,245,0.16)" : "#14375a",
        border: `1px solid ${voted ? "rgba(91,203,245,0.45)" : "#1d4368"}`,
        color: voted ? "#5bcbf5" : "#cbd5e1",
        minWidth: 38,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
      </svg>
      <span className="text-[12px] font-bold tabular-nums">{votes}</span>
    </button>
  );
}

function IdeaCard({
  idea,
  onVote,
  compact = false,
}: {
  idea: Idea;
  onVote: (id: string) => void;
  compact?: boolean;
}) {
  const createdLabel = new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <article
      className="rounded-lg p-4 transition hover:-translate-y-0.5"
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
    >
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
          </div>
          <div className="mt-3 flex items-center justify-between text-[10.5px]" style={{ color: "#858889" }}>
            <div className="flex items-center gap-1.5">
              <span
                className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold"
                style={{ background: idea.authorColor, color: "#fff" }}
              >
                {idea.authorInitials}
              </span>
              <span style={{ color: "#cbd5e1" }}>{idea.authorName.split(" ")[0]}</span>
              <span>· {createdLabel}</span>
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

function IdeaBoardLayout({ ideas, onVote }: { ideas: Idea[]; onVote: (id: string) => void }) {
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
              <span
                className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
                style={{ background: "#14375a", color: "#a8aaab" }}
              >
                {colIdeas.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {colIdeas.length === 0 ? (
                <div
                  className="rounded-lg p-6 text-center text-[11px]"
                  style={{ background: "#0a2540", border: "1px dashed #1d4368", color: "#5d6566" }}
                >
                  Nothing here yet
                </div>
              ) : (
                colIdeas.map((i) => <IdeaCard key={i.id} idea={i} onVote={onVote} compact />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IdeaListLayout({ ideas, onVote }: { ideas: Idea[]; onVote: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ideas.map((i) => (
        <IdeaCard key={i.id} idea={i} onVote={onVote} />
      ))}
    </div>
  );
}

function NewIdeaCard({ onCancel, onSubmit }: {
  onCancel: () => void;
  onSubmit: (data: { title: string; body: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "#0e2b48", border: "1px solid rgba(91,203,245,0.45)" }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="In one line — what's the idea?"
        autoFocus
        className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-slate-500"
        style={{ color: "#e2e8f0" }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Why does this matter? Anything you've already considered?"
        className="mt-2 w-full resize-none bg-transparent text-[12.5px] leading-relaxed outline-none placeholder:text-slate-500"
        style={{ color: "#cbd5e1" }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {IDEA_TAGS.map((t) => {
          const on = tags.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setTags((s) => on ? s.filter((x) => x !== t.id) : [...s, t.id])}
              className="rounded-full px-2 py-[2px] text-[10px] font-semibold transition"
              style={{
                background: on ? t.color + "1f" : "#14375a",
                color: on ? t.color : "#a8aaab",
                border: `1px solid ${on ? t.color + "55" : "#1d4368"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[11.5px] font-medium"
            style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}
          >
            Cancel
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => onSubmit({ title: title.trim(), body: body.trim(), tags })}
            className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}
          >
            Post idea
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition"
      style={{ color: active ? "#e2e8f0" : "#6b7280" }}
    >
      {label}
      <span
        className="rounded-full px-1.5 py-[1px] text-[10px] font-semibold tabular-nums"
        style={{
          background: active ? "rgba(91,203,245,0.15)" : "#14375a",
          color: active ? "#5bcbf5" : "#6b7280",
        }}
      >
        {count}
      </span>
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
          style={{ background: "#5bcbf5" }}
        />
      )}
    </button>
  );
}

export function IdeasView({ ideas: initialIdeas, currentUserId }: Props) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [tab, setTab] = useState<"all" | "mine" | "top">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [layout, setLayout] = useState<"board" | "list">("board");
  const [composing, setComposing] = useState(false);

  const parkedCount = ideas.filter((i) => ["PARKED", "QUEUED"].includes(i.status)).length;
  const activeCount = ideas.filter((i) => i.status === "ACTIVE").length;
  const shippedCount = ideas.filter((i) => i.status === "SHIPPED").length;
  const totalVotes = ideas.reduce((s, i) => s + i.votes, 0);

  const myCount = ideas.filter((i) => i.authorId === currentUserId).length;

  const visible = useMemo(() => {
    let list = ideas;
    if (tab === "mine") list = list.filter((i) => i.authorId === currentUserId);
    if (tab === "top") list = [...list].sort((a, b) => b.votes - a.votes).slice(0, 6);
    if (tagFilter !== "all") list = list.filter((i) => i.tags.includes(tagFilter));
    return list;
  }, [ideas, tab, tagFilter, currentUserId]);

  const toggleVote = async (id: string) => {
    setIdeas((arr) =>
      arr.map((i) => {
        if (i.id !== id) return i;
        const has = i.votedByCurrentUser;
        return { ...i, votedByCurrentUser: !has, votes: has ? i.votes - 1 : i.votes + 1 };
      })
    );
    try {
      await fetch(`/api/ideas/${id}/vote`, { method: "POST" });
    } catch {
      // revert on error
      setIdeas((arr) =>
        arr.map((i) => {
          if (i.id !== id) return i;
          const has = !i.votedByCurrentUser;
          return { ...i, votedByCurrentUser: !has, votes: has ? i.votes - 1 : i.votes + 1 };
        })
      );
    }
  };

  const handleNewIdea = async (data: { title: string; body: string; tags: string[] }) => {
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const idea = await res.json();
        setIdeas((arr) => [idea, ...arr]);
      }
    } catch {
      // silently fail
    }
    setComposing(false);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Ideas in the pipeline" value={String(parkedCount)} delta="+3 this week" tone="indigo" />
        <StatCard span={3} label="Active" value={String(activeCount)} delta="being prototyped" />
        <StatCard span={3} label="Shipped (Q2)" value={String(shippedCount)} delta="+1 vs Q1" tone="green" />
        <StatCard span={3} label="Total upvotes" value={String(totalVotes)} delta="from team" />
      </div>

      {/* Tabs + controls */}
      <div className="flex items-end justify-between border-b" style={{ borderColor: "#1d4368" }}>
        <div className="flex items-end gap-0">
          <TabButton active={tab === "all"}  onClick={() => setTab("all")}  label="All ideas"  count={ideas.length} />
          <TabButton active={tab === "mine"} onClick={() => setTab("mine")} label="My ideas"   count={myCount} />
          <TabButton active={tab === "top"}  onClick={() => setTab("top")}  label="Top voted"  count={6} />
        </div>
        <div className="flex items-center gap-2 pb-2">
          {/* Layout toggle */}
          <div className="flex rounded-md p-0.5" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
            <button
              onClick={() => setLayout("board")}
              className="rounded px-2 py-1 text-[11px] font-medium"
              style={{
                background: layout === "board" ? "#14375a" : "transparent",
                color: layout === "board" ? "#e2e8f0" : "#a8aaab",
              }}
            >
              Board
            </button>
            <button
              onClick={() => setLayout("list")}
              className="rounded px-2 py-1 text-[11px] font-medium"
              style={{
                background: layout === "list" ? "#14375a" : "transparent",
                color: layout === "list" ? "#e2e8f0" : "#a8aaab",
              }}
            >
              List
            </button>
          </div>

          {/* Tag filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-8 rounded-md px-2 text-[11.5px] outline-none"
            style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#cbd5e1" }}
          >
            <option value="all">All tags</option>
            {IDEA_TAGS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>

          {/* New idea */}
          <button
            onClick={() => setComposing(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{
              background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
              boxShadow: "0 6px 18px rgba(91,203,245,0.30)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New idea
          </button>
        </div>
      </div>

      {/* New idea compose box */}
      {composing && (
        <NewIdeaCard
          onCancel={() => setComposing(false)}
          onSubmit={handleNewIdea}
        />
      )}

      {/* Board or list */}
      {layout === "board" ? (
        <IdeaBoardLayout ideas={visible} onVote={toggleVote} />
      ) : (
        <IdeaListLayout ideas={visible} onVote={toggleVote} />
      )}

      {visible.length === 0 && !composing && (
        <div className="py-16 text-center text-[13px]" style={{ color: "#5d6566" }}>
          No ideas match the current filter.
        </div>
      )}
    </div>
  );
}
