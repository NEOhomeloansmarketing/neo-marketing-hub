"use client";

import { useEffect, useRef, useState } from "react";

interface Person {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface SuggestedAction {
  title: string;
  ownerName: string | null;
  ownerId: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string | null;
  notes: string | null;
  reasoning: string;
  // UI state
  approved: boolean;
  // editable overrides
  editTitle: string;
  editOwnerId: string;
  editDueDate: string;
  editPriority: string;
  createTask: boolean;
}

interface TranscribeModalProps {
  meetingId: string;
  attendees: Person[];
  onClose: () => void;
  onActionsCreated: (items: { id: string; title: string; assignee?: Person | null; dueDate?: string | null; status: string; source: string; taskId?: string | null }[]) => void;
}

function parseVtt(vttText: string): string {
  // Strip WebVTT header, timestamps, and NOTE/WEBVTT lines
  return vttText
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed === "WEBVTT") return false;
      if (trimmed.startsWith("NOTE")) return false;
      if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*/.test(trimmed)) return false;
      if (/^\d+$/.test(trimmed)) return false; // cue numbers
      return true;
    })
    .map((line) => line.replace(/<[^>]+>/g, "").trim()) // strip inline tags
    .filter(Boolean)
    .join("\n");
}

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};

const inputStyle: React.CSSProperties = {
  background: "#0a2540",
  border: "1px solid #1d4368",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 12,
  padding: "5px 9px",
  outline: "none",
};

export function TranscribeModal({ meetingId, attendees, onClose, onActionsCreated }: TranscribeModalProps) {
  const [step, setStep] = useState<"input" | "analyzing" | "review" | "creating">("input");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [transcript, setTranscript] = useState("");
  const [analyzeError, setAnalyzeError] = useState("");
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [createError, setCreateError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      // If it looks like a VTT file, parse it; otherwise use raw
      const cleaned = file.name.endsWith(".vtt") ? parseVtt(raw) : raw;
      setTranscript(cleaned);
      setInputMode("paste"); // switch to paste view so user can see what was loaded
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim() || transcript.trim().length < 20) {
      setAnalyzeError("Please paste or upload a transcript first (minimum 20 characters).");
      return;
    }
    setAnalyzeError("");
    setStep("analyzing");

    try {
      const res = await fetch(`/api/meetings/${meetingId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error ?? "Analysis failed. Please try again.");
        setStep("input");
        return;
      }

      setSummary(data.summary ?? "");
      setSuggestions(
        (data.actionItems ?? []).map((item: Omit<SuggestedAction, "approved" | "editTitle" | "editOwnerId" | "editDueDate" | "editPriority" | "createTask">) => ({
          ...item,
          approved: true,
          editTitle: item.title,
          editOwnerId: item.ownerId ?? "",
          editDueDate: item.dueDate ?? "",
          editPriority: item.priority ?? "MEDIUM",
          createTask: false,
        }))
      );
      setStep("review");
    } catch (e) {
      setAnalyzeError("Network error. Please try again.");
      setStep("input");
      console.error(e);
    }
  };

  const toggleApprove = (idx: number) => {
    setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, approved: !s.approved } : s));
  };

  const updateSuggestion = (idx: number, patch: Partial<SuggestedAction>) => {
    setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const approvedCount = suggestions.filter((s) => s.approved).length;

  const handleCreate = async () => {
    const toCreate = suggestions.filter((s) => s.approved);
    if (toCreate.length === 0) { onClose(); return; }

    setCreateError("");
    setStep("creating");

    try {
      const created = await Promise.all(
        toCreate.map(async (item) => {
          const res = await fetch("/api/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.editTitle || item.title,
              meetingId,
              assigneeId: item.editOwnerId || undefined,
              dueDate: item.editDueDate || undefined,
              priority: item.editPriority || "MEDIUM",
              createTask: item.createTask,
            }),
          });
          if (!res.ok) return null;
          return await res.json();
        })
      );

      const successful = created.filter(Boolean);
      // Map to ActionItem shape with attendee data
      const enriched = successful.map((c) => {
        const assignee = attendees.find((a) => a.id === c.assigneeId) ?? null;
        return {
          id: c.id,
          title: c.title,
          assignee: assignee ?? null,
          dueDate: c.dueDate ?? null,
          status: c.status,
          source: c.source,
          taskId: c.taskId ?? null,
        };
      });

      onActionsCreated(enriched);
      onClose();
    } catch (e) {
      setCreateError("Failed to create some action items. Please try again.");
      setStep("review");
      console.error(e);
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#0b1f35", border: "1px solid #1d4368" }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1d4368", background: "#0e2b48" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[17px]">🎙</span>
              <span className="text-[15px] font-bold text-slate-100">AI Transcript Analysis</span>
            </div>
            <p className="mt-0.5 text-[11.5px]" style={{ color: "#858889" }}>
              {step === "input" && "Paste or upload your Teams transcript to extract action items"}
              {step === "analyzing" && "Claude is analyzing your transcript…"}
              {step === "review" && `${suggestions.length} suggested action items — review and approve`}
              {step === "creating" && "Creating approved action items…"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-white/[0.06]"
            style={{ color: "#858889", border: "1px solid #1d4368" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Step: Input ── */}
          {step === "input" && (
            <div className="p-6 space-y-4">
              {/* Mode tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setInputMode("paste")}
                  className="rounded-lg px-4 py-2 text-[12px] font-semibold transition"
                  style={{
                    background: inputMode === "paste" ? "rgba(91,203,245,0.12)" : "#0a2540",
                    border: `1px solid ${inputMode === "paste" ? "rgba(91,203,245,0.4)" : "#1d4368"}`,
                    color: inputMode === "paste" ? "#5bcbf5" : "#858889",
                  }}
                >
                  📋 Paste transcript
                </button>
                <button
                  onClick={() => { setInputMode("upload"); fileRef.current?.click(); }}
                  className="rounded-lg px-4 py-2 text-[12px] font-semibold transition"
                  style={{
                    background: inputMode === "upload" ? "rgba(91,203,245,0.12)" : "#0a2540",
                    border: `1px solid ${inputMode === "upload" ? "rgba(91,203,245,0.4)" : "#1d4368"}`,
                    color: inputMode === "upload" ? "#5bcbf5" : "#858889",
                  }}
                >
                  📁 Upload .vtt / .txt
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".vtt,.txt,.docx,.doc"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#858889" }}>
                  Transcript text
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    "Paste your Microsoft Teams transcript here…\n\nExample:\nJohn Smith: Let's make sure we follow up with the vendor by Friday.\nSarah Jones: I'll send the proposal draft to the team today.\n…"
                  }
                  rows={12}
                  style={{ ...inputStyle, width: "100%", resize: "vertical", lineHeight: 1.6, fontSize: 12.5 }}
                />
                <div className="mt-1 text-[10.5px]" style={{ color: "#5d6566" }}>
                  {transcript.length > 0 ? `${transcript.length.toLocaleString()} characters · ` : ""}
                  Supports Microsoft Teams .vtt exports — timestamps are stripped automatically
                </div>
              </div>

              {analyzeError && (
                <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                  {analyzeError}
                </div>
              )}

              <div className="rounded-lg px-4 py-3" style={{ background: "rgba(91,203,245,0.06)", border: "1px solid rgba(91,203,245,0.15)" }}>
                <div className="text-[11.5px] font-semibold mb-1" style={{ color: "#5bcbf5" }}>How it works</div>
                <ul className="space-y-0.5 text-[11px]" style={{ color: "#858889" }}>
                  <li>1. Paste or upload your transcript from Microsoft Teams</li>
                  <li>2. Claude AI extracts suggested action items with owners & dates</li>
                  <li>3. Review each suggestion — approve, edit, or reject</li>
                  <li>4. Approved items are added to this meeting&apos;s action items</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Step: Analyzing ── */}
          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-6 py-20 px-6 text-center">
              <div className="relative">
                <div
                  className="h-16 w-16 rounded-full animate-spin"
                  style={{ border: "3px solid #1d4368", borderTopColor: "#5bcbf5" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[22px]">🎙</span>
              </div>
              <div>
                <div className="text-[15px] font-bold text-slate-100 mb-1">Analyzing transcript…</div>
                <p className="text-[12px]" style={{ color: "#858889" }}>Claude is reading through the conversation and identifying action items. This usually takes 5–15 seconds.</p>
              </div>
            </div>
          )}

          {/* ── Step: Review ── */}
          {step === "review" && (
            <div className="p-6 space-y-4">
              {/* Summary */}
              {summary && (
                <div className="rounded-xl p-4" style={{ background: "rgba(91,203,245,0.06)", border: "1px solid rgba(91,203,245,0.15)" }}>
                  <div className="text-[10.5px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#5bcbf5" }}>Meeting Summary</div>
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "#cbd5e1" }}>{summary}</p>
                </div>
              )}

              {/* Select all / none controls */}
              {suggestions.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold" style={{ color: "#a8aaab" }}>
                    <span style={{ color: "#5bcbf5" }}>{approvedCount}</span> of {suggestions.length} selected
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSuggestions((s) => s.map((i) => ({ ...i, approved: true })))}
                      className="text-[11px] font-semibold transition hover:underline"
                      style={{ color: "#5bcbf5" }}
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSuggestions((s) => s.map((i) => ({ ...i, approved: false })))}
                      className="text-[11px] font-semibold transition hover:underline"
                      style={{ color: "#858889" }}
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
              )}

              {suggestions.length === 0 && (
                <div className="py-8 text-center text-[13px]" style={{ color: "#858889" }}>
                  No action items were found in this transcript.
                </div>
              )}

              {/* Suggestion cards */}
              <div className="space-y-3">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl overflow-hidden transition"
                    style={{
                      background: item.approved ? "#0e2b48" : "#081929",
                      border: `1px solid ${item.approved ? "#1d4368" : "#0e2340"}`,
                      opacity: item.approved ? 1 : 0.5,
                    }}
                  >
                    {/* Card header row */}
                    <div className="flex items-start gap-3 p-3">
                      {/* Approve checkbox */}
                      <button
                        onClick={() => toggleApprove(idx)}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition"
                        style={{
                          background: item.approved ? "#5bcbf5" : "transparent",
                          border: `2px solid ${item.approved ? "#5bcbf5" : "#1d4368"}`,
                        }}
                      >
                        {item.approved && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#061320" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      {/* Priority dot */}
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: PRIORITY_COLORS[item.editPriority] ?? "#f59e0b" }}
                      />

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <input
                          value={item.editTitle}
                          onChange={(e) => updateSuggestion(idx, { editTitle: e.target.value })}
                          disabled={!item.approved}
                          className="w-full bg-transparent text-[13px] font-semibold outline-none"
                          style={{ color: "#e2e8f0" }}
                          placeholder="Action item title…"
                        />
                        {item.reasoning && (
                          <div className="mt-0.5 text-[10.5px] leading-snug" style={{ color: "#5d6566" }}>
                            {item.reasoning}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Editable fields row */}
                    {item.approved && (
                      <div
                        className="grid grid-cols-3 gap-2 px-3 pb-3"
                        style={{ gridTemplateColumns: "1fr 1fr auto" }}
                      >
                        {/* Owner */}
                        <div>
                          <label className="block text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#5d6566" }}>Owner</label>
                          <select
                            value={item.editOwnerId}
                            onChange={(e) => updateSuggestion(idx, { editOwnerId: e.target.value })}
                            style={{ ...inputStyle, width: "100%", fontSize: 11 }}
                          >
                            <option value="">Unassigned</option>
                            {attendees.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Due date */}
                        <div>
                          <label className="block text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#5d6566" }}>Due date</label>
                          <input
                            type="date"
                            value={item.editDueDate}
                            onChange={(e) => updateSuggestion(idx, { editDueDate: e.target.value })}
                            style={{ ...inputStyle, width: "100%", fontSize: 11 }}
                          />
                        </div>

                        {/* Priority + create task */}
                        <div className="flex flex-col gap-1">
                          <div>
                            <label className="block text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#5d6566" }}>Priority</label>
                            <select
                              value={item.editPriority}
                              onChange={(e) => updateSuggestion(idx, { editPriority: e.target.value })}
                              style={{ ...inputStyle, fontSize: 11 }}
                            >
                              <option value="HIGH">High</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="LOW">Low</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                            <input
                              type="checkbox"
                              checked={item.createTask}
                              onChange={(e) => updateSuggestion(idx, { createTask: e.target.checked })}
                              style={{ accentColor: "#5bcbf5" }}
                            />
                            <span className="text-[10px]" style={{ color: "#858889" }}>Create task</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Notes if present */}
                    {item.approved && item.notes && (
                      <div
                        className="px-3 pb-3 text-[11px] leading-snug"
                        style={{ color: "#858889" }}
                      >
                        📝 {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {createError && (
                <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                  {createError}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Creating ── */}
          {step === "creating" && (
            <div className="flex flex-col items-center justify-center gap-6 py-20 px-6 text-center">
              <div
                className="h-12 w-12 rounded-full animate-spin"
                style={{ border: "3px solid #1d4368", borderTopColor: "#5bcbf5" }}
              />
              <div>
                <div className="text-[15px] font-bold text-slate-100 mb-1">Creating action items…</div>
                <p className="text-[12px]" style={{ color: "#858889" }}>Adding {approvedCount} item{approvedCount !== 1 ? "s" : ""} to this meeting.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: "1px solid #1d4368", background: "#0e2b48" }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[12.5px] font-semibold transition hover:bg-white/[0.05]"
            style={{ color: "#858889", border: "1px solid #1d4368" }}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step === "review" && (
              <button
                onClick={() => { setStep("input"); setSuggestions([]); setSummary(""); }}
                className="rounded-lg px-4 py-2 text-[12.5px] font-semibold transition hover:bg-white/[0.05]"
                style={{ color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.25)" }}
              >
                ← Re-analyze
              </button>
            )}

            {step === "input" && (
              <button
                onClick={handleAnalyze}
                disabled={transcript.trim().length < 20}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-[12.5px] font-bold transition hover:brightness-110 disabled:opacity-40"
                style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.5 8.5 3 9.27l5 4.87L6.18 21 12 17.77 17.82 21 16 14.14l5-4.87-6.5-.77L12 2z" />
                </svg>
                Analyze with AI
              </button>
            )}

            {step === "review" && (
              <button
                onClick={handleCreate}
                disabled={approvedCount === 0}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-[12.5px] font-bold transition hover:brightness-110 disabled:opacity-40"
                style={{ background: approvedCount > 0 ? "linear-gradient(180deg,#22c55e,#16a34a)" : "#14375a", color: approvedCount > 0 ? "#fff" : "#5d6566" }}
              >
                ✓ Create {approvedCount > 0 ? `${approvedCount} ` : ""}Action Item{approvedCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
