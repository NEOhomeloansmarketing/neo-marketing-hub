"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";

type Mode = "signin" | "signup";

const ROLE_PRESETS = [
  "Marketing Director",
  "Brand Lead",
  "Growth PM",
  "Content Strategist",
  "Performance Lead",
  "Designer",
  "Marketing Coordinator",
  "Other",
];

const AVATAR_COLORS = [
  "#5bcbf5",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function AuthPage({ defaultMode }: { defaultMode: Mode }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLE_PRESETS[0]);
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!name.trim()) return setError("Enter your full name.");
      if (!email.toLowerCase().endsWith("@neohomeloans.com"))
        return setError("Use a @neohomeloans.com email address.");
      if (password.length < 6)
        return setError("Password must be at least 6 characters.");

      setLoading(true);
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: name.trim(), role, color },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } else {
      if (!email) return setError("Enter your email.");
      if (!password) return setError("Enter your password.");

      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#061320",
    border: "1px solid #1d4368",
    color: "#e2e8f0",
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

  return (
    <div
      className="min-h-screen grid place-items-center px-6"
      style={{
        background:
          "radial-gradient(1100px 600px at 18% -8%, rgba(91,203,245,0.18), transparent 60%)," +
          "radial-gradient(900px 500px at 92% 8%, rgba(139,92,246,0.14), transparent 60%)," +
          "#061320",
      }}
    >
      <div
        className="w-full max-w-[920px] grid grid-cols-12 gap-0 rounded-2xl overflow-hidden"
        style={{
          background: "#0a2540",
          border: "1px solid #1d4368",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Left — form */}
        <div className="col-span-12 md:col-span-7 p-10">
          <div className="flex items-center">
            <Image
              src="/neo-lockup.jpg"
              alt="NEO Home Loans"
              width={200}
              height={56}
              style={{
                height: 56,
                width: "auto",
                borderRadius: 6,
                objectFit: "contain",
              }}
              priority
            />
          </div>
          <div
            className="mt-2 text-[10.5px] font-semibold uppercase"
            style={{ color: "#5bcbf5", letterSpacing: "0.18em" }}
          >
            Marketing System
          </div>

          {/* Mode toggle */}
          <div
            className="mt-8 inline-flex rounded-md p-0.5"
            style={{ background: "#061320", border: "1px solid #1d4368" }}
          >
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="rounded px-4 py-1.5 text-[12px] font-semibold transition"
                style={{
                  background: mode === m ? "#14375a" : "transparent",
                  color: mode === m ? "#e2e8f0" : "#858889",
                }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h1
            className="mt-5 text-[24px] font-semibold text-slate-100"
            style={{ letterSpacing: "-0.02em" }}
          >
            {mode === "signin"
              ? "Sign in to your workspace"
              : "Create your account"}
          </h1>
          <p className="mt-2 text-[13px]" style={{ color: "#a8aaab" }}>
            {mode === "signin" ? (
              <>
                Use your{" "}
                <span style={{ color: "#cbd5e1" }}>@neohomeloans.com</span>{" "}
                email to access the team workspace.
              </>
            ) : (
              <>
                Sign up with your{" "}
                <span style={{ color: "#cbd5e1" }}>@neohomeloans.com</span>{" "}
                email to join the team workspace.
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="Jordan Tate"
                  className="w-full rounded-md px-3 py-2.5 text-[13.5px] outline-none transition"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Work email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@neohomeloans.com"
                className="w-full rounded-md px-3 py-2.5 text-[13.5px] outline-none transition"
                style={inputStyle}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Password
                </label>
                {mode === "signin" && (
                  <a
                    className="text-[11px] font-medium"
                    style={{ color: "#5bcbf5" }}
                    href="#"
                  >
                    Forgot?
                  </a>
                )}
              </div>
              <input
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={
                  mode === "signup"
                    ? "At least 6 characters"
                    : "••••••••••••"
                }
                className="w-full rounded-md px-3 py-2.5 text-[13.5px] outline-none transition"
                style={inputStyle}
              />
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-md px-3 py-2.5 text-[13.5px] outline-none transition"
                    style={inputStyle}
                  >
                    {ROLE_PRESETS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Avatar color</label>
                  <div className="flex items-center gap-1.5">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="grid h-7 w-7 place-items-center rounded-full transition"
                        style={{
                          background: c,
                          outline:
                            color === c
                              ? "2px solid #5bcbf5"
                              : "2px solid transparent",
                          outlineOffset: 2,
                        }}
                      >
                        {color === c && <CheckIcon />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div
                className="rounded-md px-3 py-2 text-[11.5px]"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60"
              style={{
                background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
                boxShadow: "0 6px 18px rgba(91,203,245,0.35)",
              }}
            >
              {loading
                ? mode === "signin"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-[11px]" style={{ color: "#858889" }}>
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  style={{ color: "#5bcbf5" }}
                  className="font-medium"
                >
                  Create an account
                </button>
                .
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  style={{ color: "#5bcbf5" }}
                  className="font-medium"
                >
                  Sign in
                </button>
                .
              </>
            )}
          </div>
        </div>

        {/* Right — brand panel */}
        <div
          className="col-span-12 md:col-span-5 p-8 flex flex-col justify-between"
          style={{
            background: "linear-gradient(180deg, #0e2b48 0%, #181b29 100%)",
            borderLeft: "1px solid #1d4368",
          }}
        >
          <div>
            <div
              className="text-[10.5px] font-semibold uppercase"
              style={{ color: "#5bcbf5", letterSpacing: "0.18em" }}
            >
              Welcome
            </div>
            <div
              className="mt-3 text-[20px] font-semibold leading-snug text-slate-100"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              The marketing operations hub for the NEO team.
            </div>
            <div
              className="mt-3 text-[12.5px] leading-relaxed"
              style={{ color: "#a8aaab" }}
            >
              Plan campaigns, run weekly meetings, audit advisor compliance, and
              keep every shared tool & login in one place.
            </div>

            <div className="mt-8 space-y-3">
              {[
                { icon: "📅", text: "Weekly meeting notes → action items" },
                { icon: "✅", text: "Personal + team task queues" },
                { icon: "🔐", text: "Shared tools & credential index" },
                { icon: "🛡", text: "Advisor compliance auditing" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span
                    className="text-[12.5px] font-medium"
                    style={{ color: "#cbd5e1" }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="mt-6 rounded-md p-3 text-[11px] leading-relaxed"
            style={{
              background: "rgba(91,203,245,0.06)",
              border: "1px solid rgba(91,203,245,0.25)",
              color: "#cbd5e1",
            }}
          >
            Sign-up requires a{" "}
            <span className="font-semibold text-slate-100">
              @neohomeloans.com
            </span>{" "}
            email. Personal items in{" "}
            <span className="font-semibold text-slate-100">My Tasks</span> stay
            private to you.
          </div>
        </div>
      </div>
    </div>
  );
}
