"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

interface CommentUser {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface Comment {
  id: string;
  body: string;
  author: CommentUser;
  createdAt: string;
}

type EntityType = "taskId" | "campaignId" | "meetingId" | "rockId" | "requestId";

interface CommentSectionProps {
  entityType: EntityType;
  entityId: string;
  currentUserId?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Inline mention-aware textarea
function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  const [users, setUsers] = useState<CommentUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [dropIdx, setDropIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load users once
  useEffect(() => {
    fetch("/api/users?active=true")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filtered = mentionQuery !== null
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    // Detect @mention trigger
    const pos = e.target.selectionStart ?? 0;
    const textBefore = val.slice(0, pos);
    const atMatch = textBefore.match(/@([\w]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(pos - atMatch[0].length);
      setDropIdx(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (user: CommentUser) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart ?? mentionStart + (mentionQuery?.length ?? 0) + 1);
    const inserted = before + `@${user.name} ` + after;
    onChange(inserted);
    setMentionQuery(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = before.length + user.name.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filtered.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setDropIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setDropIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filtered[dropIdx]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Write a comment… use @name to tag someone"}
        rows={2}
        style={{
          width: "100%",
          background: "#0a2540",
          border: "1px solid #1d4368",
          borderRadius: 8,
          color: "#e2e8f0",
          fontSize: 12.5,
          padding: "8px 10px",
          resize: "none",
          outline: "none",
          lineHeight: 1.5,
        }}
      />
      {/* Mention dropdown */}
      {mentionQuery !== null && filtered.length > 0 && (
        <div
          className="absolute z-50 left-0 w-56 rounded-lg overflow-hidden"
          style={{ bottom: "calc(100% + 4px)", background: "#0e2b48", border: "1px solid #1d4368", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
        >
          {filtered.map((u, i) => (
            <button
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition"
              style={{ background: i === dropIdx ? "rgba(91,203,245,0.1)" : "transparent" }}
            >
              <Avatar name={u.name} color={u.color} initials={u.initials} size={20} />
              <span className="text-[12px] font-medium" style={{ color: "#e2e8f0" }}>{u.name}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[9.5px]" style={{ color: "#5d6566", borderTop: "1px solid #1d4368" }}>
            ↑↓ navigate · Enter to select · Esc to close
          </div>
        </div>
      )}
    </div>
  );
}

export function CommentSection({ entityType, entityId, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?${entityType}=${entityId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComments(); }, [entityId, entityType]);

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), [entityType]: entityId }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [...prev, created]);
        setBody("");
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  // Highlight @mentions in rendered comment body
  const renderBody = (text: string) =>
    text.split(/(@[\w][\w\s'-]*)/g).map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} style={{ color: "#5bcbf5", fontWeight: 600 }}>{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>
          Comments {comments.length > 0 && `· ${comments.length}`}
        </span>
      </div>

      {/* Thread */}
      {loading ? (
        <div className="py-4 text-center text-[11px]" style={{ color: "#5d6566" }}>Loading…</div>
      ) : comments.length === 0 ? (
        <div className="py-3 text-center text-[11.5px]" style={{ color: "#5d6566" }}>
          No comments yet — be the first
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="group flex gap-2.5">
              <div className="shrink-0 mt-0.5">
                <Avatar name={c.author.name} color={c.author.color} initials={c.author.initials} size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[12px] font-semibold" style={{ color: "#e2e8f0" }}>{c.author.name}</span>
                  <span className="text-[10px]" style={{ color: "#5d6566" }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-snug break-words" style={{ color: "#cbd5e1" }}>
                  {renderBody(c.body)}
                </p>
              </div>
              {currentUserId === c.author.id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 mt-1 opacity-0 transition group-hover:opacity-100"
                  style={{ color: "#5d6566" }}
                  title="Delete comment"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <MentionInput
          value={body}
          onChange={setBody}
          onSubmit={handlePost}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "#5d6566" }}>⌘+Enter to post · @name to mention</span>
          <button
            onClick={handlePost}
            disabled={!body.trim() || posting}
            className="rounded-md px-3 py-1.5 text-[11.5px] font-bold transition hover:brightness-110 disabled:opacity-40"
            style={{ background: "#5bcbf5", color: "#061320" }}
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
