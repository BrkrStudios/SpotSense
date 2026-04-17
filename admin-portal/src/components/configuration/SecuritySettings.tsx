"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

type Stage =
  | "idle"
  | "setup_loading"
  | "setup_display"
  | "disable_prompt";

interface SetupResponse {
  secret: string;
  uri: string;
  qrDataUrl: string;
}

export default function SecuritySettings() {
  const { user, refresh, logout } = useAuth();
  const [stage, setStage] = useState<Stage>("idle");
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const memberSinceText = formatMemberSince(user.memberSince);

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    setStage("setup_loading");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as SetupResponse;
      setSetup(data);
      setStage("setup_display");
    } catch {
      setError("Couldn't start 2FA setup.");
      setStage("idle");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        await refresh();
        setStage("idle");
        setCode("");
        setSetup(null);
      } else {
        setError("That code didn't match. Try the current one.");
      }
    } catch {
      setError("Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const beginDisable = () => {
    setError(null);
    setPassword("");
    setStage("disable_prompt");
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        await refresh();
        setStage("idle");
        setPassword("");
      } else {
        setError("Password didn't match.");
      }
    } catch {
      setError("Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Account & Security
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Signed in as the admin user. Enable two-factor authentication for
        an extra layer of protection.
      </p>

      {/* Profile card */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg mb-5"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {user.username}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Member since {memberSinceText}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-[11px] px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{
            backgroundColor: "var(--sidebar)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          Sign out
        </button>
      </div>

      {/* 2FA row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs" style={{ color: "var(--text-primary)" }}>
            Two-factor authentication
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {user.twoFactorEnabled
              ? "Enabled — you'll need a 6-digit code at sign-in."
              : "Add a 6-digit code from an authenticator app to each sign-in."}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={user.twoFactorEnabled}
          onClick={user.twoFactorEnabled ? beginDisable : startEnroll}
          className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
          style={{
            backgroundColor: user.twoFactorEnabled ? "var(--accent)" : "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: user.twoFactorEnabled ? "calc(100% - 1.125rem)" : "0.125rem" }}
          />
        </button>
      </div>

      {stage === "setup_loading" && (
        <p className="mt-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          Generating secret…
        </p>
      )}

      {stage === "setup_display" && setup && (
        <div className="mt-5 pt-5 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-primary)" }}>
            1. Scan this QR code with Google Authenticator, 1Password, Authy, or any TOTP app.
          </p>
          <div className="flex items-start gap-4">
            <Image
              src={setup.qrDataUrl}
              alt="2FA QR code"
              width={160}
              height={160}
              unoptimized
              className="rounded-lg bg-white p-2"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                Or enter secret manually
              </p>
              <code
                className="block text-[11px] font-mono p-2 rounded break-all"
                style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
              >
                {setup.secret}
              </code>
            </div>
          </div>
          <form onSubmit={confirmEnroll} className="pt-2 space-y-3">
            <p className="text-xs" style={{ color: "var(--text-primary)" }}>
              2. Enter the current 6-digit code to confirm:
            </p>
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
            {error && (
              <div
                className="text-xs px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#D9262622", color: "#F87171" }}
              >
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "var(--accent)", color: "white", opacity: busy ? 0.7 : 1 }}
              >
                {busy ? "Verifying..." : "Enable 2FA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("idle");
                  setSetup(null);
                  setCode("");
                  setError(null);
                }}
                className="py-2 px-4 rounded-lg text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {stage === "disable_prompt" && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
          <form onSubmit={confirmDisable} className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-primary)" }}>
              Re-enter your password to disable 2FA.
            </p>
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="Password"
            />
            {error && (
              <div
                className="text-xs px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#D9262622", color: "#F87171" }}
              >
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: "#D92626",
                  color: "white",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? "Disabling..." : "Disable 2FA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("idle");
                  setPassword("");
                  setError(null);
                }}
                className="py-2 px-4 rounded-lg text-xs"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function formatMemberSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
