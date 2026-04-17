"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Stage = "credentials" | "two_factor";

export default function LoginPage() {
  // useSearchParams() needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--asphalt)" }}
    />
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/";

  const [stage, setStage] = useState<Stage>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Apply persisted theme so the login screen doesn't flash against the
  // user's chosen light/dark mode.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("spotsense.settings.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme) document.documentElement.dataset.theme = parsed.theme;
        if (parsed.accent) {
          const accents: Record<string, string> = {
            blue: "#3366E6",
            violet: "#8B5CF6",
            pink: "#EC4899",
            green: "#33BF4D",
            orange: "#F97316",
          };
          const hex = accents[parsed.accent];
          if (hex) {
            document.documentElement.style.setProperty("--accent", hex);
            document.documentElement.style.setProperty("--accent-soft", hex + "22");
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          code: stage === "two_factor" ? code : undefined,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        router.replace(nextPath);
        return;
      }
      if (data.need2fa) {
        setStage("two_factor");
        if (data.error === "invalid_code") setError("That code didn't match. Try again.");
        return;
      }
      setError("Invalid username or password.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--asphalt)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-7 shadow-2xl"
        style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <div className="mb-6 text-center">
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            SpotSense Admin
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {stage === "credentials"
              ? "Sign in to continue"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {stage === "credentials" && (
            <>
              <Field label="Username">
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </Field>
            </>
          )}

          {stage === "two_factor" && (
            <Field label="Authentication code">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2 rounded-lg text-lg text-center tabular-nums tracking-[0.3em] outline-none border"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="000000"
              />
            </Field>
          )}

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#D9262622", color: "#F87171" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy
              ? "Working..."
              : stage === "credentials"
                ? "Sign in"
                : "Verify code"}
          </button>

          {stage === "two_factor" && (
            <button
              type="button"
              onClick={() => {
                setStage("credentials");
                setCode("");
                setError(null);
              }}
              className="w-full text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              ← Use a different account
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block text-[11px] uppercase tracking-wider mb-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
