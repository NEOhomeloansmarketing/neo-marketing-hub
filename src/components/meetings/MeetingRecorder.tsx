"use client";

import { useEffect, useRef, useState } from "react";

// Web Speech API — not fully typed in TypeScript's lib.dom yet
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognitionImpl;
    webkitSpeechRecognition: typeof SpeechRecognitionImpl;
  }
}
declare class SpeechRecognitionImpl extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvt) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvt extends Event {
  error: string;
}

interface MeetingRecorderProps {
  onTranscriptReady: (text: string) => void;
}

function formatTime(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function MeetingRecorder({ onTranscriptReady }: MeetingRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "stopping">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [unsupported, setUnsupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionImpl | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const isRecordingRef = useRef(false); // tracks intent (stays true across auto-restarts)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check support on mount
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) setUnsupported(true);
  }, []);

  const startRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + " ";
          setCharCount(finalTranscriptRef.current.trim().length);
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvt) => {
      // "no-speech" and "aborted" are normal; ignore them
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isRecordingRef.current = false;
        setState("idle");
      }
    };

    recognition.onend = () => {
      setInterimText("");
      // Auto-restart if we're still supposed to be recording
      if (isRecordingRef.current) {
        try { recognition.start(); } catch { /* already started */ }
      } else {
        setState("stopping");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStart = () => {
    if (unsupported) return;
    finalTranscriptRef.current = "";
    setCharCount(0);
    setInterimText("");
    setElapsed(0);

    isRecordingRef.current = true;
    setState("recording");
    startRecognition();

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const handleStop = () => {
    isRecordingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    // onend fires → sets state to "stopping" → useEffect below fires
  };

  // When recognition fully stops, hand off transcript
  useEffect(() => {
    if (state === "stopping") {
      const text = finalTranscriptRef.current.trim();
      setState("idle");
      setElapsed(0);
      setCharCount(0);
      if (text.length > 0) {
        onTranscriptReady(text);
      }
    }
  }, [state, onTranscriptReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  if (unsupported) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11.5px]"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
        title="Live recording requires Chrome or Edge"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Recording requires Chrome/Edge
      </div>
    );
  }

  if (state === "idle") {
    return (
      <button
        onClick={handleStart}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition hover:brightness-110"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
        title="Record meeting audio and auto-transcribe with AI"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
        <span className="hidden sm:inline">Record</span>
      </button>
    );
  }

  // Recording state
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: "#ef4444" }}
        />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#ef4444" }} />
      </span>

      {/* Timer + char count */}
      <div className="flex flex-col leading-none">
        <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: "#fca5a5" }}>
          {formatTime(elapsed)}
        </span>
        {charCount > 0 && (
          <span className="text-[9.5px]" style={{ color: "#ef4444" }}>
            {charCount.toLocaleString()} chars
          </span>
        )}
      </div>

      {/* Live interim text preview */}
      {interimText && (
        <span
          className="hidden lg:block max-w-[140px] truncate text-[10.5px] italic"
          style={{ color: "rgba(252,165,165,0.6)" }}
        >
          {interimText}
        </span>
      )}

      {/* Stop button */}
      <button
        onClick={handleStop}
        className="ml-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition hover:brightness-110"
        style={{ background: "#ef4444", color: "#fff" }}
        title="Stop recording and analyze"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
        <span className="hidden sm:inline">Stop & Analyze</span>
      </button>
    </div>
  );
}
